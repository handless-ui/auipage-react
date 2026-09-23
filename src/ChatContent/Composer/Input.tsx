import React from "react";
import type { ChatContentComposerInputProps } from "../../../types/ChatContent/Composer/Input";
import { useAuiContext } from "../../Context";
import { sendMessage } from "./sendMessage";

/**
 * Composer 输入框
 * 受控：value/onChange 都走 store.composerValue
 * 快捷键：Cmd/Ctrl + Enter 触发发送
 */
export default function ChatContentComposerInput(
    props: ChatContentComposerInputProps
) {
    const { store, aui } = useAuiContext();
    const value = store((s) => s.composerValue);

    const { className, ...rest } = props;
    return (
        <textarea
            {...rest}
            className={["aui-composer-input", className].filter(Boolean).join(" ")}
            value={value}
            onChange={(e) => store.setState({ composerValue: e.target.value })}
            onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    sendMessage(aui, store);
                }
                props.onKeyDown?.(e);
            }}
        />
    );
}

ChatContentComposerInput.displayName = "ChatContent.Composer.Input";
