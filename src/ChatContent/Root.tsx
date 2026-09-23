import React from "react";
import type { ChatContentRootProps } from "../../types/ChatContent/Root";

/**
 * ChatContent 根容器
 * 纯透传 div，不内置样式，仅做 displayName 标识
 */
export default function ChatContentRoot(props: ChatContentRootProps) {
    const { className, ...rest } = props;
    return <div {...rest} className={["aui-chat-content-root", className].filter(Boolean).join(" ")} />;
}

ChatContentRoot.displayName = "ChatContent.Root";
