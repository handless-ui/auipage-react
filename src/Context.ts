import { createContext, useContext } from "react";
import type { AuiPage } from "@auipage/core";
import type { AuiStore } from "./store";

/**
 * 全局 Aui 运行时上下文
 * 由 AuiRuntimeProvider 创建并下发，所有 ChatContent.* / ThreadList.* 组件消费
 */
export interface AuiContextValue {
    aui: AuiPage;
    store: AuiStore;
}

export const AuiContext = createContext<AuiContextValue | null>(null);

/**
 * 在组件内获取 Aui 上下文
 * 必须在 <AuiRuntimeProvider> 包裹的子树中调用，否则抛错
 */
export function useAuiContext(): AuiContextValue {
    const ctx = useContext(AuiContext);
    if (!ctx) {
        throw new Error(
            "AuiContext not found. Did you forget to wrap with <AuiRuntimeProvider>?"
        );
    }
    return ctx;
}
