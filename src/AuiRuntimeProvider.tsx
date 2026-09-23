import React, { useRef } from "react";
import { AuiPage } from "@auipage/core";
import type { Tool } from "@auipage/core";
import type { AuiRuntimeProviderProps } from "../types/AuiRuntimeProvider";
import { AuiContext, type AuiContextValue } from "./Context";
import { createAuiStore } from "./store";
import { makeChatContentRuntime } from "./runtime/chatContent";
import { makeThreadListRuntime } from "./runtime/threadList";
import type { ReactTool } from "./defineTool";

/**
 * Aui 运行时 Provider
 *
 * 在 React 子树中注入一个完整的 AuiPage 实例（编排器）+ zustand store（状态）。
 * 通过 useRef 保证整个 Provider 生命周期内只创建一次，支持多实例并存。
 */
export default function AuiRuntimeProvider(props: AuiRuntimeProviderProps) {
    const value = useRef<AuiContextValue | null>(null);

    if (!value.current) {
        // 1. 创建 store
        const store = createAuiStore();

        // 2. 前端工具（React 版 defineTool 产物）
        const tools = (props.tools ?? []) as ReactTool[];

        // 3. 创建 runtime，把 store 和工具注入到回调中
        const runtime = {
            ChatContent: makeChatContentRuntime(store, tools),
            ThreadList: makeThreadListRuntime(store),
        };

        // 4. 创建 AuiPage 编排器（构造函数里会立即调 adapter.ThreadList.list() 触发初始化）
        // core 的 Tool 类型把 render 描述为函数，此处 render 实际是 React 组件，
        // 运行时 core 只做字段透传，因此这里做一次结构转换
        const aui = new AuiPage({
            adapter: props.adapter,
            runtime,
            tools: tools as unknown as undefined as never,
        });

        value.current = { aui, store };
    }

    return (
        <AuiContext.Provider value={value.current}>
            {props.children}
        </AuiContext.Provider>
    );
}

AuiRuntimeProvider.displayName = "AuiRuntimeProvider";
