import React, { useEffect, useRef } from "react";
import type { ChatContentViewportProps } from "../../types/ChatContent/Viewport";
import { useAuiContext } from "../Context";

/**
 * ChatContent 视口容器
 * 默认带自动滚到底：
 * - 监听 messages 数量变化（新消息追加）
 * - 同时监听所有 parts 文本总长度（流式对话中 text 增量追加时触发）
 * 用 scrollHeight === clientHeight 判断是否需要滚，避免用户手动上滑时被强制拉回
 */
export default function ChatContentViewport(props: ChatContentViewportProps) {
    const { store } = useAuiContext();
    const ref = useRef<HTMLDivElement>(null);

    // 消息数量变化 → 新消息追加
    const messageCount = store((s) => s.messages.length);
    // 所有 parts 文本总长度 → 流式对话中 text 增量
    const textLength = store((s) =>
        s.messages.reduce(
            (acc, m) =>
                acc +
                m.parts.reduce((a, p) => a + ("text" in p ? p.text.length : 0), 0),
            0
        )
    );

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        // 只有滚动条出现时才滚到底（内容超出容器高度）
        if (el.scrollHeight > el.clientHeight) {
            el.scrollTop = el.scrollHeight;
        }
    }, [messageCount, textLength]);

    const { className, ...rest } = props;
    return (
        <div
            ref={ref}
            {...rest}
            className={["aui-chat-content-viewport", className]
                .filter(Boolean)
                .join(" ")}
        />
    );
}

ChatContentViewport.displayName = "ChatContent.Viewport";
