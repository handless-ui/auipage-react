import * as React from 'react'
import type { ChatMessage } from '../store'

/**
 * 单条消息片段的形态
 * 直接对齐 src/store.ts 中的 ChatContentPart 判别联合
 */
export type { ChatContentPart } from '../store'

/** 单条消息形态，对齐 src/store.ts 中的 ChatMessage */
export type { ChatMessage }

/**
 * ChatContent.Messages 的 props
 * children 为 render-prop，按每条 message 调用一次
 */
export interface ChatContentMessagesProps {
    children?: (props: { message: ChatMessage }) => React.ReactNode
}

export declare class ChatContentMessages extends React.Component<ChatContentMessagesProps, any> { }
