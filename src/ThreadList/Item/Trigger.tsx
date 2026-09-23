import React from "react";
import type { ThreadListItemTriggerProps } from "../../../types/ThreadList/Item/Trigger";
import { useAuiContext } from "../../Context";
import { useThreadListItem } from "../ItemContext";

/**
 * 会话切换触发器
 * 点击调 aui.activeThread(threadId)
 * 归档状态的会话不会被激活（对齐 core 的 runtime.ThreadList.active 约定）
 */
export default function ThreadListItemTrigger(props: ThreadListItemTriggerProps) {
    const { aui } = useAuiContext();
    const { thread } = useThreadListItem();

    const { className, children, ...rest } = props;
    return (
        <button
            type="button"
            {...rest}
            className={["aui-item-trigger", className].filter(Boolean).join(" ")}
            onClick={(e) => {
                e.preventDefault();
                if (thread.status === "regular") {
                    aui.activeThread(thread.threadId);
                }
                props.onClick?.(e);
            }}
        >
            {children}
        </button>
    );
}

ThreadListItemTrigger.displayName = "ThreadList.Item.Trigger";
