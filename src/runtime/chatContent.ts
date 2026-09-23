import { ChatContentRuntime } from "@auipage/core";
import type {
    AuiStore,
    AuiStoreState,
    ChatContentPart,
    ChatMessage,
    ToolCallPart,
} from "../store";
import type { ReactTool } from "../defineTool";

/**
 * 把 core 的 ContentPart（历史消息里的原始片段）转成 React 层统一的 ChatContentPart
 *
 * 差异点：
 * - core 的 tool-call 没有 phase 字段，我们按 ui / status 推断
 * - core 的 text/thinking/loading 的 type 是 string，这里收窄成字面量
 *
 * @param toolsByName 前端工具注册表（name → tool），历史回读时用它找回 render 组件
 */
function toChatContentPart(raw: any, toolsByName: Record<string, ReactTool>): ChatContentPart {
    switch (raw.type) {
        case "text":
        case "loading":
        case "thinking":
            return { type: raw.type, text: raw.text || "" };

        case "tool-call": {
            // 持久化结构里，有 render 的工具额外带 ui: { status, result }
            const hasUi = raw.ui && (raw.ui.status === "success" || raw.ui.status === "error");
            const render = toolsByName[raw.name]?.render;

            // render 组件仍可用 → 还原为只读 executing 形态：无 call，用 uiResult 展示
            if (hasUi && render) {
                return {
                    type: "tool-call",
                    id: raw.id ?? raw.name,
                    name: raw.name,
                    args: raw.args,
                    phase: "executing",
                    status: raw.status,
                    result: raw.result,
                    render,
                    uiResult: raw.ui.result,
                    uiStatus: raw.ui.status,
                };
            }

            // 工具已下线（查不到组件）或本来就是无 render 工具 → 统一结果卡片
            return {
                type: "tool-call",
                id: raw.id ?? raw.name,
                name: raw.name,
                args: raw.args,
                phase: "result",
                status: hasUi ? raw.ui.status : raw.status,
                result: hasUi ? raw.ui.result : raw.result,
            };
        }

        default:
            // 兜底：未知 type，原样塞进 parts（type 字段保留）
            return raw as ChatContentPart;
    }
}

/** 生成消息 id */
function genMessageId() {
    return `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * 把一个 part 追加到消息列表：
 * 最后一条同 role 消息则并入其 parts，否则新建 message。
 * 让 text/tool-call 实时态的 DOM 与历史 toHistoryMessages 合并后保持一致。
 */
function pushMessagePart(
    store: AuiStore,
    role: "user" | "assistant",
    part: ChatContentPart
): string {
    let targetId = "";
    store.setState((s: AuiStoreState) => {
        const last = s.messages[s.messages.length - 1];
        if (last && last.role === role) {
            targetId = last.id;
            const msgs = s.messages.slice();
            msgs[msgs.length - 1] = { ...last, parts: [...last.parts, part] };
            return { messages: msgs };
        }
        targetId = genMessageId();
        return {
            messages: [...s.messages, { id: targetId, role, parts: [part] }],
        };
    });
    return targetId;
}

interface PartLocation {
    msgIndex: number;
    partIndex: number;
}

/** 按 tool-call id 定位 part 的位置 */
function locateToolCall(state: AuiStoreState, id: string): PartLocation | null {
    for (let msgIndex = 0; msgIndex < state.messages.length; msgIndex++) {
        const parts = state.messages[msgIndex].parts;
        for (let partIndex = 0; partIndex < parts.length; partIndex++) {
            const p = parts[partIndex];
            if (p.type === "tool-call" && p.id === id) {
                return { msgIndex, partIndex };
            }
        }
    }
    return null;
}

/**
 * 原地更新某个 tool-call part（直接改属性，避免 spread 把字面量 type 宽化）。
 * parts.slice() 让消息持有新数组引用即可触发 React 更新。
 */
function updateToolCallPart(
    store: AuiStore,
    loc: PartLocation,
    fn: (part: ToolCallPart) => void
) {
    store.setState((s: AuiStoreState) => {
        const msgs = s.messages.slice();
        const target = { ...msgs[loc.msgIndex], parts: msgs[loc.msgIndex].parts.slice() };
        fn(target.parts[loc.partIndex] as ToolCallPart);
        msgs[loc.msgIndex] = target;
        return { messages: msgs };
    });
}

/**
 * 生成 core ChatContentRuntime 的 React 版实现
 * 把 core 的命令式回调（init/append + stream）翻译成 zustand store 的状态更新
 *
 * tool-call 设计：一个 id 对应一个 part，phase 在同一 part 上原地切换
 * - pending：运行中
 * - executing：挂载 render 组件，stream 返回 Promise 挂起 core 的 await，
 *   组件调用 call(result) 后 resolve；随后 core 第二次回调写入 uiResult
 * - result：后端工具 / 无 render 前端工具结束，展示 result
 */
export function makeChatContentRuntime(store: AuiStore, tools: ReactTool[] = []) {
    const toolsByName: Record<string, ReactTool> = {};
    for (const tool of tools) {
        toolsByName[tool.description.function.name] = tool;
    }

    return new ChatContentRuntime({
        // 初始化历史消息
        init(messages: any[]) {
            const mapped: ChatMessage[] = [];
            (messages || []).forEach((m, i) => {
                // 硬约束：loading 片段不进入历史渲染
                const parts = (m.content || [])
                    .filter((c: any) => c.type !== "loading")
                    .map((c: any) => toChatContentPart(c, toolsByName));
                // 过滤后为空的消息直接丢弃，避免空气泡
                if (parts.length) {
                    mapped.push({
                        id: `init-${i}`,
                        role: m.role as "user" | "assistant",
                        parts,
                    });
                }
            });
            store.setState({ messages: mapped });
        },

        // 追加消息
        append(role: string, content: any): any {
            const narrowedRole: "user" | "assistant" =
                role === "assistant" ? "assistant" : "user";

            // text / loading / thinking：并入最后一条同 role 消息，返回文本累积 stream
            if (
                content.type === "text" ||
                content.type === "loading" ||
                content.type === "thinking"
            ) {
                const part = toChatContentPart(content, toolsByName);
                const targetId = pushMessagePart(store, narrowedRole, part);

                return (delta: string) => {
                    store.setState((s: AuiStoreState) => {
                        const idx = s.messages.findIndex((m) => m.id === targetId);
                        if (idx < 0) return {};
                        const msgs = s.messages.slice();
                        const target = { ...msgs[idx], parts: msgs[idx].parts.slice() };
                        const lastPart = target.parts[target.parts.length - 1];
                        (lastPart as { text: string }).text =
                            ((lastPart as { text?: string }).text || "") + delta;
                        msgs[idx] = target;
                        return { messages: msgs };
                    });
                };
            }

            // tool-call：初始必然是 pending，先建 part，后续靠 stream 原地改
            if (content.type === "tool-call") {
                const initialPart: ToolCallPart = {
                    type: "tool-call",
                    id: content.id,
                    name: content.name,
                    args: content.args,
                    phase: "pending",
                    status: "pending",
                };
                pushMessagePart(store, narrowedRole, initialPart);

                // stream：按工具走向原地更新这一个 part
                return (data: any) => {
                    const callId: string = data.id ?? content.id;
                    const loc = locateToolCall(store.getState(), callId);
                    if (!loc) return undefined;

                    const current = store
                        .getState()
                        .messages[loc.msgIndex].parts[loc.partIndex] as ToolCallPart;

                    const terminal = data.status === "success" || data.status === "error";

                    // 1) 进入 executing：data 同时带 render + execute 的 status/result
                    //    返回 Promise 挂起 core，等组件 call(result)
                    if (data.render) {
                        let resolveFn!: (r: unknown) => void;
                        const waiting = new Promise<unknown>((res) => {
                            resolveFn = res;
                        });
                        updateToolCallPart(store, loc, (p) => {
                            p.phase = "executing";
                            p.status = data.status;
                            p.result = data.result;
                            p.render = data.render;
                            p.call = (r: unknown) => resolveFn(r);
                        });
                        return waiting;
                    }

                    // 2) render 工具的交互结果回调（无 render 字段、终态）：
                    //    记录 uiResult 后保持 executing，render 组件继续保留在页面
                    if (terminal && current.phase === "executing") {
                        updateToolCallPart(store, loc, (p) => {
                            p.uiResult = data.result;
                            p.uiStatus = data.status;
                            p.call = undefined;
                        });
                        return undefined;
                    }

                    // 3) 后端工具 / 无 render 前端工具结束：pending → result
                    if (terminal) {
                        updateToolCallPart(store, loc, (p) => {
                            p.phase = "result";
                            p.status = data.status;
                            p.result = data.result;
                        });
                        return undefined;
                    }

                    return undefined;
                };
            }

            // 兜底
            const part = toChatContentPart(content, toolsByName);
            pushMessagePart(store, narrowedRole, part);
            return undefined;
        },
    });
}
