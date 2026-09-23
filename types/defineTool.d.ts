import type { ComponentType } from "react";

/**
 * render 组件收到的数据
 *
 * 实时态与历史回读态共用同一套 props（数据源对齐，避免回读漏字段）：
 * - 实时态：call 有值，组件交互完成后调用 call(result) 把结果交还 core
 * - 历史态：call 为空，uiResult/uiStatus 有值，组件以只读方式展示当时的选择
 */
export interface ToolRenderProps {
    /** 模型解析出的入参 */
    args: any;
    /** execute 的执行结果（异常时为错误对象） */
    result?: any;
    /** execute 的执行状态 */
    status: "pending" | "success" | "error";
    /** 历史回读：render 组件当时通过 call 交还的结果 */
    uiResult?: unknown;
    /** 历史回读：render 交互的状态 */
    uiStatus?: "success" | "error";
    /** 实时态：调用后交还工具结果并结束挂起 */
    call?: (result: unknown) => void;
}

/** React 版工具定义：结构与 core Tool 一致，仅 render 改为 React 组件 */
export interface ReactTool {
    description: {
        type: "function";
        function: {
            name: string;
            description: string;
            parameters: Record<string, unknown>;
        };
    };
    /** 页面侧执行函数；省略时由 defineTool 兜底为空执行 */
    execute: (args: any) => unknown | Promise<unknown>;
    /** 工具渲染组件；缺省时该工具退化为纯工具调用 */
    render?: ComponentType<ToolRenderProps>;
}

/** defineTool 的平铺入参 */
export interface DefineToolOptions {
    /** 工具名，对应 description.function.name */
    name: string;
    /** 给模型看的功能描述 */
    description: string;
    /** 入参 JSON Schema */
    parameters: Record<string, unknown>;
    /** 页面侧执行函数；缺省时视为无需执行、直接进入交互 */
    execute?: (args: any) => unknown | Promise<unknown>;
    /** 工具渲染组件；缺省时 execute 的返回值就是工具结果 */
    render?: ComponentType<ToolRenderProps>;
}

/**
 * 定义一个 React 版前端工具
 *
 * 与 @auipage/core 的 defineTool 对齐 name/description/parameters/execute，
 * 区别仅在于 render 是一个 React 组件而非异步交互函数——core 只把 render
 * 当作不透明字段透传给 runtime，不会主动调用它，因此可以直接承载组件。
 *
 * 注意：core 对前端工具是无判空直接调用 execute 的，纯交互工具若省略
 * execute 会抛错，这里统一兜底为空执行，让 render 收到 success 状态。
 */
export declare function defineTool(options: DefineToolOptions): ReactTool;
