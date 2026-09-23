import React from "react";
import type { ThreadListItemUnArchiveProps } from "../../../types/ThreadList/Item/UnArchive";
import { useAuiContext } from "../../Context";
import { useThreadListItem } from "../ItemContext";

/**
 * 取消归档按钮
 * 点击调 aui.unarchiveThread(threadId)
 */
export default function ThreadListItemUnArchive(props: ThreadListItemUnArchiveProps) {
    const { aui } = useAuiContext();
    const { thread } = useThreadListItem();

    const { className, children, ...rest } = props;
    return (
        <button
            type="button"
            {...rest}
            className={["aui-item-unarchive", className].filter(Boolean).join(" ")}
            onClick={(e) => {
                e.preventDefault();
                aui.unarchiveThread(thread.threadId);
                props.onClick?.(e);
            }}
        >
            {children}
        </button>
    );
}

ThreadListItemUnArchive.displayName = "ThreadList.Item.UnArchive";
