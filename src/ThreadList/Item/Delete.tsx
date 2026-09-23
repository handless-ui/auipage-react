import React from "react";
import type { ThreadListItemDeleteProps } from "../../../types/ThreadList/Item/Delete";
import { useAuiContext } from "../../Context";
import { useThreadListItem } from "../ItemContext";

/**
 * 删除会话按钮
 * 点击调 aui.deleteThread(threadId)
 */
export default function ThreadListItemDelete(props: ThreadListItemDeleteProps) {
    const { aui } = useAuiContext();
    const { thread } = useThreadListItem();

    const { className, children, ...rest } = props;
    return (
        <button
            type="button"
            {...rest}
            className={["aui-item-delete", className].filter(Boolean).join(" ")}
            onClick={(e) => {
                e.preventDefault();
                aui.deleteThread(thread.threadId);
                props.onClick?.(e);
            }}
        >
            {children}
        </button>
    );
}

ThreadListItemDelete.displayName = "ThreadList.Item.Delete";
