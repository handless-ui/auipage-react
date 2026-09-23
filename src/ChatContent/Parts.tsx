import React from "react";
import type { ChatContentPartsProps } from "../../types/ChatContent/Parts";
import { useMessageContext } from "./MessageContext";
import type { ChatContentPart } from "../store";

/**
 * 消息片段渲染
 * 自动从 MessageContext 拿到当前 message，遍历其 parts：
 * - children 为函数时 → render-prop，按 { part } 粒度自定义渲染
 * - children 为非函数（含字符串/null）→ 默认渲染：text/loading/thinking 输出文本，tool-call 不显示
 *
 * 外层 span 自动挂 data-role = user / assistant
 */
export default function ChatContentParts(props: ChatContentPartsProps) {
    const { message } = useMessageContext();
    const children = props.children as
        | ((props: { part: ChatContentPart }) => React.ReactNode)
        | React.ReactNode;

    const { className, ...rest } = props as any;
    return (
        <span
            {...rest}
            className={["aui-chat-content-parts", className].filter(Boolean).join(" ")}
            data-role={message.role}
        >
            {message.parts.map((p, i) => {
                if (typeof children === "function") {
                    return <React.Fragment key={i}>{children({ part: p })}</React.Fragment>;
                }
                if ("text" in p) {
                    return (
                        <span
                            key={i}
                            className={[
                                "aui-chat-content-part",
                                `aui-chat-content-part-${p.type}`,
                            ].filter(Boolean).join(" ")}
                        >
                            {p.text}
                        </span>
                    );
                }
                return null;
            })}
        </span>
    );
}

ChatContentParts.displayName = "ChatContent.Parts";
