import { MessageHistoryAdapter, ThreadListAdapter, ChatTransportAdapter } from "@auipage/core";
import type { ReactTool } from "./defineTool";

export interface AuiRuntimeProviderProps {
    adapter: {
        MessageHistory: MessageHistoryAdapter;
        ThreadList: ThreadListAdapter;
        ChatTransport: ChatTransportAdapter;
    };
    /** 前端工具（React 版 defineTool 的产物） */
    tools?: ReactTool[];
    children?: React.ReactNode;
}
