# 前端工具

`@auipage/react` 的 `defineTool` 在 `@auipage/core` 同名 API 基础上做了 React 适配：`name/description/parameters/execute` 完全对齐，区别仅在于 `render` 字段从异步交互函数升级为 **React 组件**，可以承载弹窗、表单、卡片等带状态的 UI 交互。

```ts
import { defineTool } from "@auipage/react";
import type { ToolRenderProps, DefineToolOptions, ReactTool } from "@auipage/react";
```

## defineTool

```ts
function defineTool(options: DefineToolOptions): ReactTool
```

| 字段          | 类型                                        | 必填 | 说明                                                                 |
| ------------- | ------------------------------------------- | ---- | -------------------------------------------------------------------- |
| `name`        | `string`                                    | 是   | 工具名，对应 `description.function.name`，模型据此发起工具调用       |
| `description` | `string`                                    | 是   | 给模型看的功能描述                                                   |
| `parameters`  | `Record<string, unknown>`                   | 是   | 入参 JSON Schema                                                      |
| `execute`     | `(args) => unknown \| Promise<unknown>`     | 否   | 页面侧执行函数；缺省时由 `defineTool` 兜底为空执行，让 render 收到 `success` 状态 |
| `render`      | `ComponentType<ToolRenderProps>`            | 否   | 工具渲染组件；缺省时该工具退化为纯工具调用，只显示 execute 结果       |

> 注意：core 对前端工具是无判空调 `execute` 的，纯交互工具若省略 `execute` 会抛错。React 版 `defineTool` 统一兜底为 `() => null`，让只挂 render 的纯交互工具也能正常进入 `executing` 态。

## ToolRenderProps

render 组件收到的 props。**实时态与历史回读态共用同一套字段**，避免回读漏字段导致 UI 不一致：

```ts
interface ToolRenderProps {
    args: any;                                    // 模型解析出的入参
    result?: any;                                 // execute 的执行结果（异常时为错误对象）
    status: "pending" | "success" | "error";     // execute 的执行状态
    uiResult?: unknown;                           // 历史回读：render 当时通过 call 交还的结果
    uiStatus?: "success" | "error";               // 历史回读：render 交互的状态
    call?: (result: unknown) => void;             // 实时态：调用后交还工具结果并结束挂起
}
```

两种态的判定很简单：

- `call` 有值 → **实时态**：组件交互完成后调用 `call(result)` 把结果交还 core，core 会 resolve 挂起的 Promise 继续推进对话。
- `call` 为空 → **历史回读态**：用 `uiResult` / `uiStatus` 以只读方式展示当时的选择。

## 两种工具形态

### 1. 纯执行工具（无 render）

工具只做一件事并返回结果，不需要在 UI 上交互。`execute` 的返回值即工具最终结果。

```ts
import { defineTool } from "@auipage/react";

export default defineTool({
    name: "getBrowserTime",
    description: "获取当前浏览器所在设备的本地日期与时间",
    parameters: { type: "object", properties: {}, required: [] },
    execute() {
        return new Date().toLocaleString();
    },
});
```

这种工具在 UI 上表现为一个工具调用卡片：先 `pending`（运行中），完成后切到 `result`，展示 `result` 字段。

### 2. 交互式工具（有 render）

工具先通过 `execute` 拿到候选数据，再用 `render` 组件让用户选择/补充，最终通过 `call(result)` 把结果交还。

```tsx
import React from "react";
import { defineTool } from "@auipage/react";
import type { ToolRenderProps } from "@auipage/react";

const FRUITS = ["苹果", "香蕉", "橙子", "葡萄", "西瓜"];

function AskFavoriteFruitRender({ call, uiResult, result, status }: ToolRenderProps) {
    // 历史回读：只读展示
    if (!call) {
        return <span>已选择：{String(uiResult)}</span>;
    }

    // 实时态：execute 返回的候选列表渲染成按钮
    const fruits: string[] = status === "success" && Array.isArray(result) ? result : [];

    return (
        <div className="fruit-picker">
            <div>请选择你喜欢的水果：</div>
            <div className="fruit-picker-options">
                {fruits.map(fruit => (
                    <button key={fruit} type="button" onClick={() => call(fruit)}>
                        {fruit}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default defineTool({
    name: "askFavoriteFruit",
    description: "当需要了解用户喜欢什么水果时使用，会弹窗询问用户并返回所选水果",
    parameters: { type: "object", properties: {}, required: [] },
    execute() {
        return FRUITS; // 这里写死，实际可改为发请求
    },
    render: AskFavoriteFruitRender,
});
```

关键点：

- `execute` 返回候选列表，core 会把 `{ render, status: "success", result }` 回调给运行时。
- 运行时把 part 切到 `executing`，挂载 render 组件，并把 core 的 `await` Promise 挂起。
- 用户点击按钮 → `call(fruit)` → resolve 挂起的 Promise → core 把结果回传后端（经 `ChatTransport.response("tool-result", ...)`）→ core 再次回调写入 `uiResult`，组件以只读态保留在页面上。

## ToolCallPart 生命周期

一个 tool-call 在 store 里对应**单个 part**，通过稳定 `id` 贯穿生命周期，`phase` 在原地切换：

```
pending → executing → result
```

| phase        | 触发                                 | 主体展示                         | call | uiResult |
| ------------ | ------------------------------------ | -------------------------------- | ---- | -------- |
| `pending`    | 流中首次收到 `{ type: "tool-call" }` | 名称 + 入参 + "运行中…"          | 无   | 无       |
| `executing`  | 带 `render` 的前端工具 execute 完成  | 挂载 render 组件                 | 有   | 无       |
| `result`     | 后端工具 / 无 render 前端工具结束    | 结果卡片（result 字段）          | 无   | 无       |

带 render 的前端工具在 `executing` 态会多经历一次回调：`call` 完成后 core 回调写入 `uiResult`/`uiStatus`，phase 保持 `executing`（render 组件继续留在页面），但 `call` 被清空，组件自然切到只读态。

```ts
interface ToolCallPart {
    type: "tool-call";
    id: string;                               // 稳定 key
    name: string;
    args: any;
    phase: "pending" | "executing" | "result";
    status: "pending" | "success" | "error";
    result?: any;                             // execute 结果或后端返回
    render?: ComponentType<ToolRenderProps>;  // 前端工具的渲染组件
    call?: (result: unknown) => void;         // 实时态：交还结果
    uiResult?: unknown;                       // 历史回读
    uiStatus?: "success" | "error";           // 历史回读
}
```

## 历史回读

带 render 的工具落库时，UI 交互环节的结果存放在片段的 `ui` 字段（`{ status, result }`）。历史消息加载时，运行时按以下规则还原 part：

- 工具仍注册（查得到 render 组件）→ 还原为只读 `executing` 形态：`call` 为空，用 `uiResult`/`uiStatus` 驱动只读 render。
- 工具已下线（查不到 render 组件）或本来就是无 render 工具 → 统一降级为 `result` 形态的结果卡片。

这意味着：render 组件设计时必须同时处理**实时态（有 call）**和**历史回读态（无 call）**两种数据来源，否则历史会话里这块工具会渲染失败。

## 后端工具

后端工具（如模型直接调用的服务端工具）对 React 侧是透明的：流里同样以 `{ type: "tool-call", ... }` 片段出现，但没有 `render` 字段。运行时直接走 `pending → result` 路径，UI 上只表现为结果卡片，不挂载任何组件。

业务侧不需要为后端工具做任何注册——它们在 `ChatTransport.run` 里由模型流式吐出，React 只负责展示。

## 注册到 Provider

把所有前端工具组装成数组，传给 `AuiRuntimeProvider` 的 `tools` 属性即可。运行时会按 `description.function.name` 建索引，历史回读时据此找回 render 组件。

```tsx
import getBrowserTime from "./tools/getBrowserTime";
import askFavoriteFruit from "./tools/askFavoriteFruit";

const tools = [getBrowserTime, askFavoriteFruit];

<AuiRuntimeProvider adapter={adapter} tools={tools}>
    {/* ... */}
</AuiRuntimeProvider>
```

## 参考

完整示例见仓库 `test/tools/` 目录：

- `getBrowserTime.ts`：纯执行工具（无 render）
- `askFavoriteFruit.tsx`：交互式工具（有 render）
- `test/parts/UIToolCallPart.tsx`：render-prop 里对 tool-call part 的自定义渲染
