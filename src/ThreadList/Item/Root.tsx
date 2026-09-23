import React from "react";
import type { ThreadListItemRootProps } from "../../../types/ThreadList/Item/Root";
import { useThreadListItem } from "../ItemContext";
import { useAuiContext } from "../../Context";

/**
 * Item 根容器
 * 自动挂 data-status（regular/archived）和 data-active（是否当前激活）属性，
 * 方便 CSS 选择器按状态着色（对齐 @auipage/core 原 style.css 里的属性选择器）
 */
export default function ThreadListItemRoot(props: ThreadListItemRootProps) {
    const { thread } = useThreadListItem();
    const { store } = useAuiContext();
    const activeId = store((s) => s.activeThreadId);

    const { className, ...rest } = props;
    return (
        <div
            {...rest}
            className={["aui-item-root", className].filter(Boolean).join(" ")}
            data-status={thread.status}
            data-active={activeId === thread.threadId || undefined}
        />
    );
}

ThreadListItemRoot.displayName = "ThreadList.Item.Root";
