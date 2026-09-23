import React from "react";
import type { ThreadListItemsProps } from "../../types/ThreadList/Items";
import { useAuiContext } from "../Context";
import { ThreadListItemContext } from "./ItemContext";

/**
 * 会话列表渲染
 * 订阅 store.threads，按顺序调用 children render-prop 渲染每条 thread
 * 同时为每条 thread 注入 ThreadListItemContext，供 Item.* 子组件消费
 */
export default function ThreadListItems(props: ThreadListItemsProps) {
    const { store } = useAuiContext();
    const threads = store((s) => s.threads);
    const children = props.children as
        | ((props: { thread: any }) => React.ReactNode)
        | undefined;

    const { className, ...rest } = props as any;
    return (
        <div {...rest} className={["aui-thread-list-items", className].filter(Boolean).join(" ")}>
            {threads.map((t) => (
                <ThreadListItemContext.Provider key={t.threadId} value={{ thread: t }}>
                    {children ? children({ thread: t }) : null}
                </ThreadListItemContext.Provider>
            ))}
        </div>
    );
}

ThreadListItems.displayName = "ThreadList.Items";
