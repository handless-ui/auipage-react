import React from "react";
import type { ChatContentComposerSendProps } from "../../../types/ChatContent/Composer/Send";
import { useAuiContext } from "../../Context";
import { sendMessage } from "./sendMessage";

/**
 * Composer 发送按钮
 * 点击触发 sendMessage；上一个任务未完成（isExecuting）时禁用，不可重复发送
 */
export default function ChatContentComposerSend(props: ChatContentComposerSendProps) {
    const { store, aui } = useAuiContext();
    const isExecuting = store((s) => s.isExecuting);

    const { className, children, ...rest } = props;
    return (
        <button
            type="button"
            {...rest}
            disabled={rest.disabled || isExecuting}
            data-disabled={isExecuting || undefined}
            className={["aui-composer-send", className].filter(Boolean).join(" ")}
            onClick={(e) => {
                e.preventDefault();
                sendMessage(aui, store);
                props.onClick?.(e);
            }}
        >
            {children ?? "发送"}
        </button>
    );
}

ChatContentComposerSend.displayName = "ChatContent.Composer.Send";
