import React from "react";
import type { ChatContentMessagesProps } from "../../types/ChatContent/Messages";
import { useAuiContext } from "../Context";
import { MessageContext } from "./MessageContext";

/**
 * 消息列表渲染
 * 订阅 store.messages，按顺序调用 children render-prop 渲染每条 message
 * 同时为每条 message 注入 MessageContext，供 Parts 等子组件自动消费
 */
export default function ChatContentMessages(props: ChatContentMessagesProps) {
    const { store } = useAuiContext();
    const messages = store((s) => s.messages);
    const children = props.children as
        | ((props: { message: any }) => React.ReactNode)
        | undefined;

    const { className, ...rest } = props as any;
    return (
        <div {...rest} className={["aui-chat-content-messages", className].filter(Boolean).join(" ")}>
            {messages.map((m) => (
                <MessageContext.Provider
                    key={m.id}
                    value={{ message: m }}
                >
                    {children ? children({ message: m }) : null}
                </MessageContext.Provider>
            ))}
        </div>
    );
}

ChatContentMessages.displayName = "ChatContent.Messages";
