# 组件 API

`@auipage/react` 导出两套组件树：`ChatContent`（聊天主区）与 `ThreadList`（会话侧边栏），以及一个把它们与运行时串起来的 `AuiRuntimeProvider`。所有组件都是受控透传风格——只挂约定的 class/data 属性，不内置样式与交互逻辑，业务侧通过子节点和 render-prop 完成自定义渲染。

```ts
import { AuiRuntimeProvider, ChatContent, ThreadList } from "@auipage/react";
```

## AuiRuntimeProvider

运行时根容器。在 `useRef` 中创建一个 `AuiPage` 编排器 + zustand store，整个 Provider 生命周期内只创建一次，支持多实例并存。

```tsx
<AuiRuntimeProvider adapter={adapter} tools={tools}>
    {/* 子树 */}
</AuiRuntimeProvider>
```

| 属性      | 类型                                              | 必填 | 说明                                       |
| --------- | ------------------------------------------------- | ---- | ------------------------------------------ |
| `adapter` | `{ ChatTransport, MessageHistory, ThreadList }`   | 是   | 三套适配器实例集合，详见 [适配器详解](./adapter.md) |
| `tools`   | `ReactTool[]`                                     | 否   | 前端工具列表，详见 [前端工具](./tools.md)   |
| `children`| `React.ReactNode`                                 | 否   | 子树                                       |

> `AuiPage` 构造时会立即调 `adapter.ThreadList.list()` 触发初始化，所以 Provider 挂载就会拉取会话列表。

## ChatContent

聊天主区组件树，命名空间结构如下：

```
ChatContent.Root
└── ChatContent.Viewport           ← 自动滚到底
    └── ChatContent.Messages       ← render-prop，按 message 渲染
        └── ChatContent.Parts      ← render-prop，按 part 渲染
└── ChatContent.Composer.Root      ← form 容器，阻止默认提交
    ├── ChatContent.Composer.Input ← 受控 textarea
    └── ChatContent.Composer.Send  ← 发送按钮，执行中自动禁用
```

### ChatContent.Root

根容器，纯透传 `div`，挂 `aui-chat-content-root` class。接标准 div props。

### ChatContent.Viewport

视口容器，挂 `aui-chat-content-viewport` class。内置自动滚到底逻辑：

- 监听 `messages.length` 变化（新消息追加）。
- 同时监听所有 `parts` 中文本总长度（流式增量追加）。
- 只有 `scrollHeight > clientHeight` 时才滚动，避免用户手动上滑被强制拉回。

### ChatContent.Messages

消息列表，挂 `aui-chat-content-messages` class。订阅 store 的 `messages`，按顺序为每条消息套一层 `MessageContext.Provider`，再调用 `children` render-prop。

```tsx
<ChatContent.Messages>
    {({ message }) => (
        // message: { id, role, parts }
        // 通常直接放一个 <ChatContent.Parts> 即可
        <ChatContent.Parts />
    )}
</ChatContent.Messages>
```

| 属性      | 类型                                       | 必填 | 说明                                |
| --------- | ------------------------------------------ | ---- | ----------------------------------- |
| `children`| `(props: { message }) => React.ReactNode` | 否   | 每条消息调用一次；不传则不渲染内容 |

### ChatContent.Parts

消息片段渲染，挂 `aui-chat-content-parts` class，并自动挂 `data-role={message.role}`（`user` / `assistant`）。从 `MessageContext` 自动拿到当前 message，遍历其 `parts`。

支持两种 `children` 形态：

```tsx
{/* 1. render-prop：按 part 粒度自定义渲染 */}
<ChatContent.Parts>
    {({ part }) => {
        if (part.type === "text") return <Text>{part.text}</Text>;
        if (part.type === "tool-call") return <MyToolCall part={part} />;
        return null;
    }}
</ChatContent.Parts>

{/* 2. 默认渲染：text/loading/thinking 输出文本，tool-call 不显示 */}
<ChatContent.Parts />
```

render-prop 收到的 `part` 是判别联合类型：

```ts
type ChatContentPart =
    | { type: "text";     text: string }
    | { type: "loading";  text: string }
    | { type: "thinking"; text: string }
    | ToolCallPart;  // 见前端工具文档
```

### ChatContent.Composer.Root

输入区根容器，渲染为 `<form>`，挂 `aui-composer-root` class，`onSubmit` 阻止默认提交（实际发送走 `Send` 的 onClick）。

### ChatContent.Composer.Input

受控 `textarea`，挂 `aui-composer-input` class。

- value/onChange 走 store 的 `composerValue`。
- 快捷键：`Cmd/Ctrl + Enter` 触发发送。
- 透传标准 textarea props，支持 `placeholder`、`onKeyDown` 等。

### ChatContent.Composer.Send

发送按钮，渲染为 `<button type="button">`，挂 `aui-composer-send` class。

- 点击触发 `sendMessage`，调用 `aui.sendMessage` 走流式对话。
- 上一个任务未完成（`store.isExecuting` 为 true）时自动 `disabled`，避免重复发送。
- 透传 `disabled`、`onClick` 等按钮 props；`children` 缺省为 "发送"。

## ThreadList

会话侧边栏组件树，命名空间结构如下：

```
ThreadList.Root
├── ThreadList.New                   ← 新建会话按钮
└── ThreadList.Items                  ← render-prop，按 thread 渲染
    └── ThreadList.Item.Root         ← 自动挂 data-status / data-active
        ├── ThreadList.Item.Trigger  ← 切换会话（归档态不可激活）
        │   └── ThreadList.Item.Title
        ├── ThreadList.Item.Archive
        ├── ThreadList.Item.UnArchive
        └── ThreadList.Item.Delete
```

### ThreadList.Root

根容器，纯透传 `div`，挂 `aui-thread-list-root` class。

### ThreadList.New

新建会话按钮，渲染为 `<button type="button">`，挂 `aui-thread-list-new` class。点击调 `aui.newThread()`，等价于 `activeThread(undefined)`，进入新建会话状态。

### ThreadList.Items

会话列表，挂 `aui-thread-list-items` class。订阅 store 的 `threads`，按顺序为每条会话套一层 `ThreadListItemContext.Provider`，再调用 `children` render-prop。

```tsx
<ThreadList.Items>
    {({ thread }) => (
        // thread: { threadId, title, status }
        <ThreadList.Item.Root>
            <ThreadList.Item.Trigger>
                <ThreadList.Item.Title>{thread.title || "新会话"}</ThreadList.Item.Title>
            </ThreadList.Item.Trigger>
            <ThreadList.Item.Archive>归档</ThreadList.Item.Archive>
            <ThreadList.Item.UnArchive>取消归档</ThreadList.Item.UnArchive>
            <ThreadList.Item.Delete>删除</ThreadList.Item.Delete>
        </ThreadList.Item.Root>
    )}
</ThreadList.Items>
```

| 属性      | 类型                                      | 必填 | 说明                          |
| --------- | ----------------------------------------- | ---- | ----------------------------- |
| `children`| `(props: { thread }) => React.ReactNode` | 否   | 每条会话调用一次；不传则不渲染 |

### ThreadList.Item.Root

单条会话根容器，挂 `aui-item-root` class，并自动挂两个 data 属性驱动 CSS：

- `data-status={thread.status}`：`regular` / `archived`
- `data-active`：当前会话与 `activeThreadId` 相同时挂上（仅 true 时存在）

### ThreadList.Item.Trigger

会话切换触发器，渲染为 `<button type="button">`，挂 `aui-item-trigger` class。点击调 `aui.activeThread(threadId)`。**归档状态的会话不会被激活**（对齐 core 的 `runtime.ThreadList.active` 约定）。

### ThreadList.Item.Title

会话标题，渲染为 `<span>`，挂 `aui-item-title` class。自动渲染 `thread.title`，`children` 缺省时回退到 `"新会话"`。

### ThreadList.Item.Archive / UnArchive / Delete

三个操作按钮，均渲染为 `<button type="button">`，分别挂 `aui-item-archive` / `aui-item-unarchive` / `aui-item-delete` class，点击分别调 `aui.archiveThread` / `aui.unarchiveThread` / `aui.deleteThread`，入参均为当前 `thread.threadId`。

## Hooks

除组件树外，还导出三个上下文 hook 供高级用法使用：

```ts
import { useAuiContext, useMessageContext, useThreadListItem } from "@auipage/react";
```

| Hook                  | 必须在何处调用         | 返回                                       |
| --------------------- | ---------------------- | ------------------------------------------ |
| `useAuiContext`       | `<AuiRuntimeProvider>` 子树 | `{ aui: AuiPage, store: AuiStore }`    |
| `useMessageContext`   | `<ChatContent.Messages>` 的 render-prop 子树 | `{ message: ChatMessage }`     |
| `useThreadListItem`   | `<ThreadList.Items>` 的 render-prop 子树     | `{ thread: ThreadListItem }`   |

三个 hook 在缺失上下文时都会抛错并给出修复提示，便于开发期定位。

## 样式约定

组件不内置任何 CSS，但每个节点都挂了稳定的 class，可作为样式锚点：

| 组件                       | class                            |
| -------------------------- | -------------------------------- |
| ChatContent.Root           | `aui-chat-content-root`          |
| ChatContent.Viewport       | `aui-chat-content-viewport`     |
| ChatContent.Messages       | `aui-chat-content-messages`     |
| ChatContent.Parts          | `aui-chat-content-parts`        |
| 默认渲染的单个片段         | `aui-chat-content-part` + `aui-chat-content-part-{type}` |
| Composer.Root              | `aui-composer-root`             |
| Composer.Input             | `aui-composer-input`            |
| Composer.Send              | `aui-composer-send`             |
| ThreadList.Root            | `aui-thread-list-root`          |
| ThreadList.New             | `aui-thread-list-new`           |
| ThreadList.Items           | `aui-thread-list-items`         |
| ThreadList.Item.Root       | `aui-item-root`                 |
| ThreadList.Item.Trigger    | `aui-item-trigger`              |
| ThreadList.Item.Title      | `aui-item-title`                |
| ThreadList.Item.Archive    | `aui-item-archive`              |
| ThreadList.Item.UnArchive  | `aui-item-unarchive`            |
| ThreadList.Item.Delete     | `aui-item-delete`               |

驱动样式的 data 属性：

| 节点                  | 属性                          | 取值                          |
| --------------------- | ----------------------------- | ----------------------------- |
| `ChatContent.Parts`   | `data-role`                   | `user` / `assistant`          |
| `ThreadList.Item.Root`| `data-status`                 | `regular` / `archived`        |
| `ThreadList.Item.Root`| `data-active`                 | 出现即表示当前激活            |
| `Composer.Send`       | `data-disabled`               | 出现即表示执行中（禁用）      |

## 参考

最小组合示例见仓库 `test/ChatContent.tsx` 与 `test/ThreadList.tsx`，可作为骨架复制改造。
