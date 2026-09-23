import { createContext, useContext } from "react";
import type { ThreadListItem } from "../store";

/**
 * 单条会话上下文
 * 由 Items 组件为每条 thread 创建 Provider，Item.* 子组件消费
 */
export interface ThreadListItemContextValue {
    thread: ThreadListItem;
}

export const ThreadListItemContext = createContext<
    ThreadListItemContextValue | null
>(null);

/**
 * 在 Item.* 组件中拿到当前所在 thread
 * 必须在 <ThreadList.Items> 的 render-prop 子树中调用
 */
export function useThreadListItem(): ThreadListItemContextValue {
    const ctx = useContext(ThreadListItemContext);
    if (!ctx) {
        throw new Error(
            "ThreadListItemContext not found. Did you forget to wrap with <ThreadList.Items>?"
        );
    }
    return ctx;
}
