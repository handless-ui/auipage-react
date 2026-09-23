import React from "react";
import type { ThreadListNewProps } from "../../types/ThreadList/New";
import { useAuiContext } from "../Context";

/**
 * 新建会话按钮
 * 点击调 aui.newThread()，core 内部等价于 activeThread(undefined)
 */
export default function ThreadListNew(props: ThreadListNewProps) {
    const { aui } = useAuiContext();

    const { className, children, ...rest } = props;
    return (
        <button
            type="button"
            {...rest}
            className={["aui-thread-list-new", className].filter(Boolean).join(" ")}
            onClick={(e) => {
                e.preventDefault();
                aui.newThread();
                props.onClick?.(e);
            }}
        >
            {children}
        </button>
    );
}

ThreadListNew.displayName = "ThreadList.New";
