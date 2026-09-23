import * as React from 'react'

/**
 * ChatContent.Root 的 props
 * 继承 div 的所有 HTML 属性，方便透传 className/style/onClick 等
 */
export interface ChatContentRootProps extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode
}

export declare class ChatContentRoot extends React.Component<ChatContentRootProps, any> { }
