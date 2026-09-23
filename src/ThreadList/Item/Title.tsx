import React from "react";
import type { ThreadListItemTitleProps } from "../../../types/ThreadList/Item/Title";
import { useThreadListItem } from "../ItemContext";

/**
 * 会话标题
 * 自动渲染当前 thread 的 title（用户可在 children 中覆盖）
 */
export default function ThreadListItemTitle(props: ThreadListItemTitleProps) {
    const { thread } = useThreadListItem();
    const { className, ...rest } = props;
    return <span {...rest} className={["aui-item-title", className].filter(Boolean).join(" ")}>{props.children ?? thread.title ?? "新会话"}</span>;
}

ThreadListItemTitle.displayName = "ThreadList.Item.Title";
