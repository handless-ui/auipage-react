import type { AuiPage } from "@auipage/core";
import type { AuiStore, AuiStoreState } from "../../store";

/**
 * 共享的发送逻辑
 * 1. 从 store 拿到 composerValue 并清空输入框
 * 2. 调 aui.sendMessage 触发流式对话
 * 3. 期间维护 isExecuting 状态（用于 UI 禁用提示等）
 *
 * 上一个任务未完成时直接忽略，不允许重复发送
 */
export function sendMessage(aui: AuiPage, store: AuiStore) {
    const state: AuiStoreState = store.getState();
    const text = state.composerValue.trim();

    if (!text || state.isExecuting) return;

    // 立即清空输入框并标记执行中
    store.setState({ composerValue: "", isExecuting: true });

    aui.sendMessage({
        role: "user",
        content: [{ type: "text", text }],
    })
        .catch((err) => {
            // core 在 isExecuting 时会 reject，这里吞掉错误以保证 UI 不崩
            // 用户可在外层包装 aui.sendMessage 或监听 store.isExecuting 自行处理
            // eslint-disable-next-line no-console
            console.error("[auipage-react] sendMessage failed:", err);
        })
        .finally(() => {
            store.setState({ isExecuting: false });
        });
}
