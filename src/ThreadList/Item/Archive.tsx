import React from "react";
import type { ThreadListItemArchiveProps } from "../../../types/ThreadList/Item/Archive";
import { useAuiContext } from "../../Context";
import { useThreadListItem } from "../ItemContext";

/**
 * 归档按钮
 * 点击调 aui.archiveThread(threadId)
 */
export default function ThreadListItemArchive(props: ThreadListItemArchiveProps) {
    const { aui } = useAuiContext();
    const { thread } = useThreadListItem();

    const { className, children, ...rest } = props;
    return (
        <button
            type="button"
            {...rest}
            className={["aui-item-archive", className].filter(Boolean).join(" ")}
            onClick={(e) => {
                e.preventDefault();
                aui.archiveThread(thread.threadId);
                props.onClick?.(e);
            }}
        >
            {children}
        </button>
    );
}

ThreadListItemArchive.displayName = "ThreadList.Item.Archive";
