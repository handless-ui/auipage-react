import type { ComponentType } from "react";
import { create } from "zustand";
import type { ToolRenderProps } from "./defineTool";

/**
 * 消息内容片段类型
 * 对齐 core 中 message.content 的形态，但 React 友好化：
 * - 每条 part 都能独立 key 化
 * - tool-call 以 id 作为稳定身份，整个生命周期只有一个 part，
 *   通过原地修改 phase 完成 pending → executing/result 的状态机切换
 */
export type ChatContentPart =
    | { type: "text"; text: string }
    | { type: "loading"; text: string }
    | { type: "thinking"; text: string }
    | ToolCallPart;

/**
 * 工具调用片段
 *
 * phase 语义：
 * - pending：工具已开始、尚未拿到 execute/后端结果（头部显示名称+入参，主体"运行中…"）
 * - executing：仅前端有 render 的工具；execute 已完成，挂载 render 组件
 * - result：后端工具 / 无 render 前端工具已结束，主体展示 result
 *
 * render/call 是非序列化的运行时引用：
 * - render：defineTool 提供的 React 组件
 * - call：仅实时 executing 时有值，调用后把结果交还 core（resolve 挂起的 Promise）
 *
 * uiResult/uiStatus 仅在历史回读时出现：持久化结构里 render 工具的最终结果
 * 存放在 ui 字段中，回读时用它驱动只读态的 render 组件。
 */
export interface ToolCallPart {
    type: "tool-call";
    /** tool-call 自身 id，作为 part 稳定 key */
    id: string;
    name: string;
    args: any;
    phase: "pending" | "executing" | "result";
    status: "pending" | "success" | "error";
    /** execute 的结果（前端工具）或后端返回的结果 */
    result?: any;
    /** 前端工具的渲染组件 */
    render?: ComponentType<ToolRenderProps>;
    /** 实时态：render 组件调用它交还结果 */
    call?: (result: unknown) => void;
    /** 历史回读：render 组件当时交还的结果 */
    uiResult?: unknown;
    /** 历史回读：render 交互的状态 */
    uiStatus?: "success" | "error";
}

export interface ChatMessage {
    /** React key，由 runtime 生成 */
    id: string;
    role: "user" | "assistant";
    parts: ChatContentPart[];
}

export interface ThreadListItem {
    threadId: string;
    title: string;
    status: "archived" | "regular";
}

export interface AuiStoreState {
    /** 当前会话消息列表 */
    messages: ChatMessage[];
    /** 会话列表 */
    threads: ThreadListItem[];
    /** 当前激活的会话 ID，undefined 表示新建会话状态 */
    activeThreadId: string | undefined;
    /** 是否正在执行（发送中） */
    isExecuting: boolean;
    /** Composer 输入框当前值 */
    composerValue: string;
}

/**
 * 创建 store 实例
 * 每次 AuiRuntimeProvider 挂载时调一次，保证多实例隔离
 */
export function createAuiStore() {
    return create<AuiStoreState>()(() => ({
        messages: [],
        threads: [],
        activeThreadId: undefined,
        isExecuting: false,
        composerValue: "",
    }));
}

/** store 的 hook 类型（zustand 创建出来的就是这种 hook + StoreApi 混合体） */
export type AuiStore = ReturnType<typeof createAuiStore>;
