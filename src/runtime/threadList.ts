import { ThreadListRuntime } from "@auipage/core";
import type { AuiStore, AuiStoreState, ThreadListItem } from "../store";

/**
 * 生成 core ThreadListRuntime 的 React 版实现
 * 把命令式回调翻译成 zustand store 的状态更新
 */
export function makeThreadListRuntime(store: AuiStore) {
    return new ThreadListRuntime({
        // 初始化会话列表
        init(threads: any[]) {
            const mapped: ThreadListItem[] = (threads || []).map((t) => ({
                threadId: t.threadId,
                title: t.title,
                status: t.status,
            }));
            store.setState({ threads: mapped });
        },

        // 激活某会话
        active(threadId: string | undefined) {
            store.setState({ activeThreadId: threadId });
        },

        // 追加会话
        append(thread: any) {
            const item: ThreadListItem = {
                threadId: thread.threadId,
                title: thread.title,
                status: thread.status,
            };
            store.setState((s: AuiStoreState) => ({ threads: [item, ...s.threads] }));
        },

        // 删除会话
        delete(threadId: string) {
            store.setState((s: AuiStoreState) => ({
                threads: s.threads.filter((t) => t.threadId !== threadId),
            }));
        },

        // 归档
        archive(threadId: string) {
            store.setState((s: AuiStoreState) => ({
                threads: s.threads.map((t) =>
                    t.threadId === threadId
                        ? { ...t, status: "archived" as const }
                        : t
                ),
            }));
        },

        // 取消归档
        unarchive(threadId: string) {
            store.setState((s: AuiStoreState) => ({
                threads: s.threads.map((t) =>
                    t.threadId === threadId
                        ? { ...t, status: "regular" as const }
                        : t
                ),
            }));
        },
    });
}
