import * as React from 'react'

/**
 * ChatContent.Viewport 的 props
 * 继承 div 的所有 HTML 属性
 * 默认行为：监听 messages.length 变化时自动滚到底部
 */
export interface ChatContentViewportProps extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode
}

export declare class ChatContentViewport extends React.Component<ChatContentViewportProps, any> { }
