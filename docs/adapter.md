# 适配器详解

适配器（Adapter）是 `@auipage/react` 与业务后端之间的桥接层。`@auipage/core` 编排器只认三套适配器接口，业务侧通过实现它们来接入自己的 HTTP/SSE/WebSocket 接口。三套适配器全部从 `@auipage/react` 顶层导出，无需直接引用 core。

```ts
import {
    ChatTransportAdapter,
    MessageHistoryAdapter,
    ThreadListAdapter,
} from "@auipage/react";
```

适配器实例按固定 key 装配成一个对象，传给 `AuiRuntimeProvider` 的 `adapter` 属性：

```ts
const adapter = {
    ChatTransport,
    MessageHistory,
    ThreadList,
};
```

> key 名是约定的：`ChatTransport` / `MessageHistory` / `ThreadList`，core 内部按这些 key 取实例。

## ChatTransportAdapter

对接模型对话接口，负责发起一轮对话并按片段回吐结果。

```ts
new ChatTransportAdapter({
    async *run({ messages, context }) { /* ... */ },
    response(name, data) { /* ... */ },
});
```

### run

类型：`(params) => AsyncGenerator<ContentPart, void, void> | void | null | undefined`

- **params.messages**：本轮新发送的消息，结构为 `ChatContentMessage[]`（`role` + 富片段 `content` 数组）。当前实现每轮只发一条，但保留数组形态以便后续扩展多消息输入。
- **params.context.history**：当前会话已入库的历史消息组（`HistoryMessageGroup[]`），可以做预处理后再喂给模型，避免直接拿原始存储结构发请求。
- **params.context.tools**：`AuiPage` 构造时注册的工具描述集合（`{ description: ToolDescription }[]`），可直接序列化随请求发给模型。
- **返回值**：异步生成器，逐个 `yield` `ContentPart`。返回假值（`void/null/undefined`）时 core 直接终止本轮处理。

`yield` 出去的片段类型见下方 [片段数据形态](#片段数据形态)。

### response

类型：`(name: string, data: Record<string, unknown>) => unknown`

页面 → 服务端的反向回传通道。目前仅用于前端工具结果回传：core 在前端工具 `execute`/`render` 结束后会调用 `response("tool-result", { id, status, result })`，业务侧在此把结果 POST 给后端，由后端决定是否继续推进对话。

```ts
response(name, data) {
    // name === "tool-result"
    return $remote.post(`/api/chat/${name}`, data);
}
```

### 典型实现

```ts
import { ChatTransportAdapter, generator } from "@auipage/react";
import { fetch } from "@auipage/fetch";

new ChatTransportAdapter({
    async *run({ messages, context }) {
        // 思考态：先吐一个 loading 片段占位
        yield { type: "loading", text: "思考中..." };

        // 把回调式流式响应转成 async generator
        yield* generator((callYield, callEnd, callError) => {
            fetch({
                url: "/api/chat",
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages, tools: context.tools }),
            }).then(res => {
                res.on("data", chunk => callYield(JSON.parse(chunk)));
                res.on("end", callEnd);
                res.on("error", callError);
            }).catch(callError);
        });
    },
    response(name, data) {
        return $remote.post(`/api/chat/${name}`, data);
    },
});
```

> `generator` 是 core 提供的工具函数，把 `next/done/error` 回调式异步流程包成标准 `AsyncGenerator`，配合 `fetch` 这类回调式流读取非常顺手。

## MessageHistoryAdapter

历史消息的加载与追加。每次切换会话时 core 调 `load`；每轮对话结束 core 调 `append` 把这一轮的消息组写库。

```ts
new MessageHistoryAdapter({
    async load(threadId) { /* 返回 HistoryMessageGroup[] */ },
    async append(threadId, message) { /* 写入一组 */ },
});
```

### load

类型：`(threadId: string) => MaybePromise<HistoryMessageGroup[] | void | null | undefined>`

- 返回当前会话的历史消息组数组；返回假值时 core 跳过历史加载（适用于新会话）。
- 注意：返回的 `content` 里如果包含 `loading` 片段，React 运行时会**自动过滤**掉它们，不参与历史渲染。因此入库时无需手动剔除 loading。

### append

类型：`(threadId: string, message: HistoryMessageGroup) => MaybePromise<void>`

- 把一轮入站/出站消息作为一个 `HistoryMessageGroup` 写入指定会话。
- `HistoryMessageGroup.messages` 是 `ChatContentMessage[]`，与 `ChatTransport.run` 收到的 `messages` 同构。

## ThreadListAdapter

会话列表的增删改查。

```ts
new ThreadListAdapter({
    async list() { /* 返回 Thread[] */ },
    async new(firstMessage) { /* 新建并返回 Thread */ },
    async archive(threadId) { /* 归档 */ },
    async unarchive(threadId) { /* 取消归档 */ },
    async delete(threadId) { /* 删除 */ },
});
```

| 方法        | 入参                              | 返回                              | 说明                                                  |
| ----------- | --------------------------------- | --------------------------------- | ----------------------------------------------------- |
| `list`      | 无                                | `Thread[]`                        | 拉取全部会话；构造 `AuiPage` 时立即触发一次          |
| `new`       | `HistoryMessageGroup`（首轮消息） | `Thread \| void \| null`          | 用首轮消息生成标题并落库；返回假值时 core 中止本轮后续流程 |
| `archive`   | `threadId: string`                | `void`                            | 归档；归档当前会话时 core 自动切到新建会话状态       |
| `unarchive` | `threadId: string`                | `void`                            | 取消归档；不自动切换会话                              |
| `delete`    | `threadId: string`                | `void`                            | 删除；删的是当前会话时 core 自动切到新建会话状态      |

`Thread` 的约定字段：

```ts
interface Thread {
    threadId: string;   // 必填，core 内部依赖
    title?: string;     // 通常取首轮用户消息前缀
    archived?: boolean; // 是否归档
    [key: string]: unknown; // 允许业务自定义字段
}
```

## 片段数据形态

`ChatTransport.run` 中 `yield` 的 `ContentPart` 支持以下几种：

### 文本类

```ts
{ type: "text",     text: "正文增量" }
{ type: "thinking",  text: "思维链增量" }
{ type: "loading",  text: "思考中..." }
```

文本类片段按类型在消息内做**增量拼接**：同类型连续片段会被合并到同一个 part 的 `text` 上，而不是各开一个 part。

### 工具调用

```ts
{
    type: "tool-call",
    id: "call-xxx",          // 单次调用唯一标识，用作 part 稳定 key
    name: "askFavoriteFruit",
    args: { ... },
    // 终态时补齐：
    status: "success" | "error",
    result: ...,
    // 带渲染的前端工具才需要：
    render?: ToolRender,
    ui?: { status, result }, // 落库时记录 UI 交互结果
}
```

工具调用片段由一个稳定 `id` 贯穿整个生命周期，React 运行时通过**原地修改 phase** 完成 `pending → executing → result` 的状态切换，不会在 DOM 上反复新建/销毁节点。详见 [前端工具](./tools.md)。

### 自定义片段

```ts
{ type: "image", url: "..." }  // 业务扩展，type 字段保留透传
```

`ContentPart` 是开放联合类型，业务可以 `yield` 任意带 `type` 字段的对象，运行时会原样塞进 `parts`，由 `ChatContent.Parts` 的 render-prop 自行渲染。

## 参考

完整可运行示例见仓库 `test/adapter/` 目录，包含 `chatTransport.ts` / `messageHistory.ts` / `threadList.ts` 三个文件，分别对应三套适配器的最小实现。
