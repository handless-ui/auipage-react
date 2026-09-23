import * as React from 'react'
import type { ChatContentPart } from './Messages'

/**
 * ChatContent.Parts 的 props
 * 自动从 MessageContext 拿当前 message，遍历 parts 渲染
 *
 * children 支持两种形式：
 * - render-prop: ({ part }) => ReactNode，按 part 粒度自定义渲染
 * - 默认渲染: 任意 ReactNode（text/loading/thinking 输出文本，tool-call 不显示）
 */
export interface ChatContentPartsProps {
    children?:
        | React.ReactNode
        | ((props: { part: ChatContentPart }) => React.ReactNode)
}

export declare class ChatContentParts extends React.Component<ChatContentPartsProps, any> { }
