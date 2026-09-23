# [@auipage/react](https://github.com/handless-ui/auipage-react)
React版本的智能体UI组件库

<p>
    <a href="https://zxl20070701.github.io/toolbox/#/npm-download?packages=@auipage/react&interval=7">
        <img src="https://img.shields.io/npm/dm/@auipage/react.svg" alt="downloads">
    </a>
    <a href="https://www.npmjs.com/package/@auipage/react">
        <img src="https://img.shields.io/npm/v/@auipage/react.svg" alt="npm">
    </a>
    <a href="https://github.com/handless-ui/auipage-react/issues">
        <img src="https://img.shields.io/github/issues/handless-ui/auipage-react" alt="issue">
    </a>
    <a href="https://github.com/handless-ui/auipage-react" target='_blank'>
        <img alt="GitHub repo stars" src="https://img.shields.io/github/stars/handless-ui/auipage-react?style=social">
    </a>
    <a href="https://github.com/handless-ui/auipage-react">
        <img src="https://img.shields.io/github/forks/handless-ui/auipage-react" alt="forks">
    </a>
     <a href="https://gitee.com/handless-ui/auipage-react" target='_blank'>
        <img alt="Gitee repo stars" src="https://gitee.com/handless-ui/auipage-react/badge/star.svg">
    </a>
    <a href="https://gitee.com/handless-ui/auipage-react">
        <img src="https://gitee.com/handless-ui/auipage-react/badge/fork.svg" alt="forks">
    </a>
</p>

<img src="https://nodei.co/npm/@auipage/react.png?downloads=true&amp;downloadRank=true&amp;stars=true" alt="NPM">

## 如何使用？

### 安装

```bash
npm install @auipage/react
# 或
yarn add @auipage/react
# 或
pnpm add @auipage/react
```

### 快速上手

一个最小可运行的应用由三步构成：

1. **准备适配器**：分别实现 `ChatTransportAdapter`（对话流式传输）、`MessageHistoryAdapter`（历史消息持久化）、`ThreadListAdapter`（会话列表管理）。
2. **（可选）定义前端工具**：用 `defineTool` 声明可在浏览器端执行/交互的工具。
3. **组合组件**：用 `AuiRuntimeProvider` 注入运行时，再渲染 `ChatContent` 与 `ThreadList` 的子组件树。

```tsx
import { createRoot } from "react-dom/client";
import {
    AuiRuntimeProvider,
    ChatContent,
    ThreadList,
    ChatTransportAdapter,
    MessageHistoryAdapter,
    ThreadListAdapter,
    generator,
} from "@auipage/react";

// 1. 适配器：把 core 与你的后端接口对接起来
const adapter = {
    ChatTransport: new ChatTransportAdapter({
        async *run({ messages, context }) {
            // 显示思考状态
            yield { type: "loading", text: "思考中..." };

            // 把流式响应转成消息片段
            yield* generator((callYield, callEnd, callError) => {
                // 替换为你的流式接口
                // callYield(chunk) 投递一个片段
                // callEnd() 标记结束
                // callError(err) 标记异常
            });
        },
        response(name, data) {
            // 智能体后续请求（如 tool-result）
        },
    }),
    MessageHistory: new MessageHistoryAdapter({
        async load(threadId) { /* 返回历史消息 */ },
        async append(threadId, messages) { /* 持久化新消息 */ },
    }),
    ThreadList: new ThreadListAdapter({
        async list() { /* 返回会话列表 */ },
        async new(messages) { /* 新建会话 */ },
        async archive(threadId) { /* 归档 */ },
        async unarchive(threadId) { /* 取消归档 */ },
        async delete(threadId) { /* 删除 */ },
    }),
};

// 2. 前端工具（可选）
const tools = [];

function App() {
    return (
        <AuiRuntimeProvider adapter={adapter} tools={tools}>
            {/* 聊天视图 */}
            <ChatContent.Root>
                <ChatContent.Viewport>
                    <ChatContent.Messages>
                        {() => (
                            <ChatContent.Parts>
                                {({ part }) => {
                                    if (part.type === "text") {
                                        return <div>{part.text}</div>;
                                    }
                                    if (part.type === "loading") {
                                        return <div>{part.text}</div>;
                                    }
                                    if (part.type === "thinking") {
                                        return <div>{part.text}</div>;
                                    }
                                    if (part.type === "tool-call") {
                                        return <div>{part.name}</div>;
                                    }
                                    return null;
                                }}
                            </ChatContent.Parts>
                        )}
                    </ChatContent.Messages>
                </ChatContent.Viewport>
                <ChatContent.Composer.Root>
                    <ChatContent.Composer.Input />
                    <ChatContent.Composer.Send>发送</ChatContent.Composer.Send>
                </ChatContent.Composer.Root>
            </ChatContent.Root>

            {/* 会话列表 */}
            <ThreadList.Root>
                <ThreadList.New>新建会话</ThreadList.New>
                <ThreadList.Items>
                    {({ thread }) => (
                        <ThreadList.Item.Root>
                            <ThreadList.Item.Trigger>
                                <ThreadList.Item.Title>
                                    {thread.title || "新会话"}
                                </ThreadList.Item.Title>
                            </ThreadList.Item.Trigger>
                            <ThreadList.Item.Archive>归档</ThreadList.Item.Archive>
                            <ThreadList.Item.UnArchive>取消归档</ThreadList.Item.UnArchive>
                            <ThreadList.Item.Delete>删除</ThreadList.Item.Delete>
                        </ThreadList.Item.Root>
                    )}
                </ThreadList.Items>
            </ThreadList.Root>
        </AuiRuntimeProvider>
    );
}

createRoot(document.getElementById("app")!).render(<App />);
```

## 版权

MIT License

Copyright (c) [zxl20070701](https://zxl20070701.github.io/notebook/home.html) 走一步，再走一步
