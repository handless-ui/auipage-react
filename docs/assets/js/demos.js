/* @auipage/react 文档 demo
 *
 * 用 dist 里的真实产物（全局 AuipageReact）渲染一套最小工作台：
 * ThreadList + ChatContent + 内存版三套适配器，回复是逐字流式输出。
 */
(function () {
    "use strict";

    var React = window.React;
    var ReactDOM = window.ReactDOM;
    var Aui = window.AuipageReact;

    if (!React || !ReactDOM || !Aui) {
        console.warn("[docs] React / ReactDOM / AuipageReact 未就绪");
        return;
    }

    var h = React.createElement;
    var ChatContent = Aui.ChatContent;
    var ThreadList = Aui.ThreadList;

    var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

    /* ---------------------------------------------------------- 假数据 */

    function seed() {
        return {
            threads: [
                { threadId: "t1", title: "怎么接入自己的后端？", status: "regular" },
                { threadId: "t2", title: "前端工具能弹窗吗", status: "regular" },
                { threadId: "t3", title: "多会话是怎么隔离的", status: "archived" }
            ],
            history: {
                t1: [
                    {
                        messages: [
                            { role: "user", content: [{ type: "text", text: "适配器和组件是怎么分工的？" }] },
                            {
                                role: "assistant", content: [{
                                    type: "text",
                                    text: "适配器只做数据搬运：把后端的 SSE 变成 AsyncGenerator、把消息写进你的库、把会话列表读出来。组件只认 store，负责把 parts 渲染成 DOM。"
                                }]
                            }
                        ]
                    },
                    {
                        messages: [
                            { role: "user", content: [{ type: "text", text: "怎么接入自己的后端？" }] },
                            {
                                role: "assistant", content: [{
                                    type: "text",
                                    text: "写三套适配器：ChatTransport 负责流式对话，MessageHistory 负责历史读写，ThreadList 负责会话管理。它们都从 @auipage/react 顶层导出，装配成一个对象交给 AuiRuntimeProvider。"
                                }]
                            }
                        ]
                    }
                ],
                t2: [
                    {
                        messages: [
                            { role: "user", content: [{ type: "text", text: "前端工具能弹窗吗" }] },
                            {
                                role: "assistant", content: [{
                                    type: "text",
                                    text: "可以。defineTool 的 render 字段就是一个 React 组件：你能在里面放表单、选择器、确认框，用户选完调 call(result) 把结果交还 core。"
                                }]
                            }
                        ]
                    }
                ],
                t3: []
            }
        };
    }

    function replyFor(question) {
        if (!question) {
            return "你可以问我适配器、组件树或者前端工具怎么用。";
        }
        return "收到「" + question.slice(0, 18) + "」。@auipage/react 只提供状态与交互，样式和视觉全归你：" +
            "把 AuiRuntimeProvider 挂上三套适配器，再用 ChatContent、ThreadList 把节点搭出来即可。";
    }

    function lastUserText(messages) {
        var text = "";
        (messages || []).forEach(function (message) {
            (message.content || []).forEach(function (part) {
                if (part.type === "text") text += part.text || "";
            });
        });
        return text.trim();
    }

    /* ------------------------------------------------------ 适配器工厂 */

    function createAdapter() {
        var db = seed();

        var ChatTransport = new Aui.ChatTransportAdapter({
            async *run(params) {
                var question = lastUserText(params.messages);

                yield { type: "thinking", text: "先确认用户想问什么，再给一段可执行的说明。" };
                await sleep(120);

                for (var ch of replyFor(question)) {
                    yield { type: "text", text: ch };
                    await sleep(22);
                }
            },
            response() {
                /* 文档 demo 不需要回传后端 */
            }
        });

        var MessageHistory = new Aui.MessageHistoryAdapter({
            async load(threadId) {
                return db.history[threadId] || [];
            },
            async append(threadId, group) {
                (db.history[threadId] = db.history[threadId] || []).push(group);
            }
        });

        var ThreadListAdapterInstance = new Aui.ThreadListAdapter({
            async list() {
                return db.threads;
            },
            async new(group) {
                var first = "";
                ((group && group.messages) || []).forEach(function (m) {
                    (m.content || []).forEach(function (p) {
                        if (p.type === "text") first += p.text || "";
                    });
                });
                var thread = {
                    threadId: "t" + (db.threads.length + 1) + "-" + Date.now(),
                    title: (first || "新会话").slice(0, 20),
                    status: "regular"
                };
                db.threads.unshift(thread);
                return thread;
            },
            async archive(threadId) {
                db.threads = db.threads.map(function (t) {
                    return t.threadId === threadId ? { threadId: t.threadId, title: t.title, status: "archived" } : t;
                });
            },
            async unarchive(threadId) {
                db.threads = db.threads.map(function (t) {
                    return t.threadId === threadId ? { threadId: t.threadId, title: t.title, status: "regular" } : t;
                });
            },
            async delete(threadId) {
                db.threads = db.threads.filter(function (t) { return t.threadId !== threadId; });
            }
        });

        return { ChatTransport: ChatTransport, MessageHistory: MessageHistory, ThreadList: ThreadListAdapterInstance };
    }

    /* ------------------------------------------------------- 界面切片 */

    function partsRender() {
        return function (props) {
            var part = props.part;
            var key = part.id || props.index;

            if (part.type === "text") {
                return h("span", { key: key, className: "aui-chat-content-part aui-chat-content-part-text" }, part.text);
            }
            if (part.type === "loading") {
                return h("span", { key: key, className: "aui-chat-content-part aui-chat-content-part-loading" }, part.text || "正在生成…");
            }
            if (part.type === "thinking") {
                return h("span", { key: key, className: "aui-chat-content-part aui-chat-content-part-thinking" }, "思考：" + (part.text || ""));
            }
            if (part.type === "tool-call") {
                return h("span", { key: key, className: "aui-chat-content-part" },
                    "[tool] " + part.name + " · " + part.phase);
            }
            return null;
        };
    }

    function ChatPanel() {
        return h(ChatContent.Root, null,
            h(ChatContent.Viewport, null,
                h(ChatContent.Messages, null,
                    function () {
                        return h(ChatContent.Parts, null, partsRender());
                    }
                )
            ),
            h(ChatContent.Composer.Root, null,
                h(ChatContent.Composer.Input, { placeholder: "问点什么，比如：怎么接入后端？" }),
                h(ChatContent.Composer.Send, null, "发送")
            )
        );
    }

    function Sidebar() {
        return h(ThreadList.Root, null,
            h(ThreadList.New, null, "+ 新建会话"),
            h(ThreadList.Items, null,
                function (scope) {
                    var thread = scope.thread;
                    return h(ThreadList.Item.Root, { key: thread.threadId },
                        h(ThreadList.Item.Trigger, null,
                            h(ThreadList.Item.Title, null, thread.title)
                        ),
                        h(ThreadList.Item.Archive, null, "归档"),
                        h(ThreadList.Item.UnArchive, null, "恢复"),
                        h(ThreadList.Item.Delete, null, "删除")
                    );
                }
            )
        );
    }

    function Workbench(props) {
        var adapter = React.useRef(null);
        if (!adapter.current) adapter.current = createAdapter();

        return h(Aui.AuiRuntimeProvider, {
            adapter: adapter.current,
            tools: props.tools || []
        }, h("div", { className: "workbench" }, h(Sidebar, null), h(ChatPanel, null)));
    }

    /* --------------------------------------------------------- 挂载 */

    function mount(selector, component, activateFirst) {
        var el = document.querySelector(selector);
        if (!el) return;

        ReactDOM.createRoot(el).render(h(component));

        if (activateFirst) {
            setTimeout(function () {
                var trigger = el.querySelector(".aui-item-trigger");
                if (trigger) trigger.click();
            }, 700);
        }
    }

    mount('[data-demo="workbench"]', Workbench, true);
})();
