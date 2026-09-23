import React from "react";
import type { ThreadListRootProps } from "../../types/ThreadList/Root";

/**
 * ThreadList 根容器
 * 纯透传 div
 */
export default function ThreadListRoot(props: ThreadListRootProps) {
    const { className, ...rest } = props;
    return <div {...rest} className={["aui-thread-list-root", className].filter(Boolean).join(" ")} />;
}

ThreadListRoot.displayName = "ThreadList.Root";
