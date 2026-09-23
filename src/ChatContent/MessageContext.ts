import { createContext, useContext } from "react";
import type { ChatMessage } from "../store";

/**
 * 单条消息上下文
 * 由 Messages 组件为每条 message 创建 Provider，Parts 组件自动消费
 *
 * - message：当前消息对象
 */
export interface MessageContextValue {
    message: ChatMessage;
}

export const MessageContext = createContext<MessageContextValue | null>(null);

/**
 * 在 Parts 等子组件中拿到当前所在的 message
 * 必须在 <Messages> 的 render-prop 子树中调用
 */
export function useMessageContext(): MessageContextValue {
    const ctx = useContext(MessageContext);
    if (!ctx) {
        throw new Error(
            "MessageContext not found. Did you forget to wrap with <ChatContent.Messages>?"
        );
    }
    return ctx;
}
