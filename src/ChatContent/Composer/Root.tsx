import React from "react";
import type { ChatContentComposerRootProps } from "../../../types/ChatContent/Composer/Root";

/**
 * Composer 根容器
 * 渲染为 form，阻止默认提交（实际发送走 Send 的 onClick）
 */
export default function ChatContentComposerRoot(props: ChatContentComposerRootProps) {
    const { className, ...rest } = props;
    return <form {...rest} className={["aui-composer-root", className].filter(Boolean).join(" ")} onSubmit={(e) => e.preventDefault()} />;
}

ChatContentComposerRoot.displayName = "ChatContent.Composer.Root";
