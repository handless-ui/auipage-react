# 数据流与状态

本文说明 `AuiRuntimeProvider`、zustand store 与 `@auipage/core` 编排器三者之间的关系，以及一条消息从用户输入到 UI 渲染的完整数据流。

## 三层结构

```
┌──────────────────────────────────────────────────────────┐
│  React 组件层                                            │
│  ChatContent.* / ThreadList.* 通过 useAuiContext          │
│  订阅 store，render-prop 把数据下发到业务子节点           │
└────────────▲─────────────────────────────┬───────────────┘
             │ 订阅 (zustand hook)           │ setState
             │                              ▼
┌────────────┴──────────────────────────────────────────────┐
│  状态层：zustand store (AuiStore)                          │
│  messages / threads / activeThreadId / isExecuting / ...   │
└────────────▲──────────────────────────────────────────────┘
             │ 命令式回调 (init/append/active/...)
             │
┌────────────┴──────────────────────────────────────────────┐
│  运行时层：makeChatContentRuntime / makeThreadListRuntime  │
│  把 core 的命令式回调翻译成 store 的 setState            │
└────────────▲──────────────────────────────────────────────┘
             │ 调用 runtime.init / runtime.append / ...
             │
┌────────────┴──────────────────────────────────────────────┐
│  编排器层：AuiPage (@auipage/core)                        │
│  串联 adapter（业务）与 runtime（UI），维护对话流程        │
└───────────────────────────────────────────────────────────┘
```

- **AuiPage（core）**：框架核心，只认 adapter 和 runtime 两套接口，不感知 React。
- **runtime（React 版）**：实现 core 的 `ChatContentRuntime` / `ThreadListRuntime`，把命令式回调翻译成 store 的 setState。
- **store（zustand）**：唯一的 React 侧状态源，组件通过 `store(selector)` 订阅。
- **组件**：通过 `useAuiContext()` 拿到 `{ aui, store }`，调 `aui.*` 触发动作，订阅 `store` 渲染 UI。

## AuiRuntimeProvider 的装配

`AuiRuntimeProvider` 在 `useRef` 中完成一次性装配：

```ts
// 1. 创建 store（每实例独立，支持多 Provider 并存）
const store = createAuiStore();

// 2. 前端工具按 name 建索引
const tools = props.tools ?? [];

// 3. 创建 runtime，把 store 和工具注入回调
const runtime = {
    ChatContent: makeChatContentRuntime(store, tools),
    ThreadList: makeThreadListRuntime(store),
};

// 4. 创建 AuiPage 编排器
//    构造函数里会立即调 adapter.ThreadList.list() 触发初始化
const aui = new AuiPage({ adapter: props.adapter, runtime, tools });

value.current = { aui, store };
```

之后 `{ aui, store }` 通过 `AuiContext.Provider` 下发给整个子树。组件用 `useAuiContext()` 拿到它们：

```ts
const { aui, store } = useAuiContext();
```

## store 形态

```ts
interface AuiStoreState {
    messages: ChatMessage[];            // 当前会话消息列表
    threads: ThreadListItem[];          // 会话列表
    activeThreadId: string | undefined; // 当前激活会话；undefined 表示新建会话
    isExecuting: boolean;                // 是否在对话执行中
    composerValue: string;              // 输入框当前值
}
```

```ts
interface ChatMessage {
    id: string;                          // React key，runtime 生成
    role: "user" | "assistant";
    parts: ChatContentPart[];
}

interface ThreadListItem {
    threadId: string;
    title: string;
    status: "archived" | "regular";
}
```

`ChatContentPart` 详见 [组件 API](./components.md) 与 [前端工具](./tools.md)。

## ChatContentRuntime 的翻译规则

core 调 `runtime.ChatContent.init` / `append`，React 版运行时把它们翻译成 store 更新。

### init（初始化历史消息）

切换会话时 core 调 `init(messages)`，运行时：

1. 过滤掉 `content` 里的 `loading` 片段（硬约束：loading 不进历史渲染）。
2. 把 core 的 `ContentPart` 映射成 React 层统一的 `ChatContentPart`（主要是 tool-call 还原 render 引用 / uiResult）。
3. 过滤后为空的消息直接丢弃，避免空气泡。
4. `setState({ messages: mapped })` 整体替换。

### append（追加消息片段）

core 调 `append(role, content)`，运行时按 `content.type` 分支处理：

- **text / loading / thinking**：并入最后一条**同 role** 消息的 parts（不存在则新建 message），并返回一个 `(delta) => void` 的流式更新函数，core 后续增量分片直接调它往 `text` 上拼接。
- **tool-call**：初始一定建一个 `pending` part（稳定 `id`），返回一个 `(data) => unknown` 的结束回调，core 后续用同一 `id` 回调，运行时按 `data` 走原地切换：

  | data 形态                                | 动作                                                                  | 返回   |
  | ---------------------------------------- | --------------------------------------------------------------------- | ------ |
  | 带 `render` 字段                         | `pending → executing`，挂载 render，返回 Promise 挂起 core 的 await   | Promise |
  | 终态（`status` 为 success/error）且当前 `executing` | 写入 `uiResult`/`uiStatus`，清空 `call`，phase 保持 `executing`        | void   |
  | 终态且当前 `pending`                     | `pending → result`，写入 `status`/`result`（后端工具 / 无 render 工具） | void   |

- **兜底**：其它类型直接转成 `ChatContentPart` 追加到消息。

### 同 role 消息合并

为了让**实时态 DOM**与**历史回读 DOM**保持一致，运行时做了一条硬约束：

> 最后一条消息 role 与本次相同 → 并入其 parts；否则新建 message。

这样同一条 assistant 回复里的 text / thinking / tool-call 会落到同一条 message 的多个 parts 上，历史回读时 core 返回的也是这种结构，UI 可以用同一套渲染逻辑处理两种态。

## ThreadListRuntime 的翻译规则

core 调 `runtime.ThreadList.*`，运行时翻译：

| core 回调    | setState 效果                                                  |
| ------------ | --------------------------------------------------------------- |
| `init(threads)`    | `threads` 整体替换                                              |
| `active(id)`       | `activeThreadId = id`（`undefined` 表示新建会话）              |
| `append(thread)`   | 新会话插到 `threads` 头部                                       |
| `delete(id)`       | 从 `threads` 过滤掉                                             |
| `archive(id)`      | 把对应 thread 的 `status` 改为 `"archived"`                     |
| `unarchive(id)`    | 把对应 thread 的 `status` 改为 `"regular"`                      |

## 完整数据流：一次发送

以用户在 Composer 输入文本按 Cmd/Ctrl+Enter（或点 Send）为例：

1. `ChatContent.Composer.Input` / `Send` 调 `sendMessage(aui, store)`。
2. `sendMessage`：
   - 从 store 读 `composerValue`，trim 后为空或 `isExecuting` 时直接 return。
   - `setState({ composerValue: "", isExecuting: true })`。
   - 调 `aui.sendMessage({ role: "user", content: [{ type: "text", text }] })`。
3. `AuiPage.sendMessage`（core 内部）：
   - 把用户消息 append 到 runtime（store 里多一条 user message）。
   - 调 `adapter.ThreadList.new(firstMessage)` 落库并拿 `Thread`（若是新会话）。
   - 调 `adapter.MessageHistory.append` 持久化。
   - 调 `adapter.ChatTransport.run({ messages, context })` 拿 async generator。
4. core 逐个消费 generator 吐出的片段：
   - `text` → append 到 assistant message，流式更新函数往 `text` 上拼增量。
   - `loading` / `thinking` → append 到 assistant message。
   - `tool-call` → append 建 pending part；终态时按有无 render 走 executing 或 result 分支。
5. generator 结束，core resolve `sendMessage` 的 Promise。
6. `sendMessage` 的 `.finally` 把 `store.isExecuting` 置回 `false`，Send 按钮恢复可点。

期间每次 setState 都触发 zustand 通知，订阅了相关 selector 的组件自动重渲染。`Viewport` 订阅 `messages.length` 与文本总长度，所以流式增量追加时也会触发自动滚到底。

## 多实例隔离

`AuiRuntimeProvider` 用 `useRef` 保证单实例只装配一次，但**不同 Provider 实例各自有独立的 store 和 AuiPage**，互不干扰。这意味着同一个 React 树里可以并排两个 `AuiRuntimeProvider`（比如多账号多窗口场景），每个子树只看到自己 Provider 下发的 context。

## 错误处理约定

- `sendMessage` 内部 catch 了 core 在 `isExecuting` 时的 reject，只在控制台 `console.error`，不向上抛，保证 UI 不崩。
- `useAuiContext` / `useMessageContext` / `useThreadListItem` 在缺失上下文时抛错并给出修复提示，便于开发期定位。
- 业务侧若需要自定义错误处理，可在外层包 `aui.sendMessage`，或监听 `store.isExecuting` 做自己的 UI 反馈。

## 参考

实现细节见仓库：

- `src/AuiRuntimeProvider.tsx`：装配入口
- `src/store.ts`：store 形态与创建函数
- `src/runtime/chatContent.ts`：ChatContentRuntime 的 React 版实现
- `src/runtime/threadList.ts`：ThreadListRuntime 的 React 版实现
- `src/ChatContent/Composer/sendMessage.ts`：共享发送逻辑
