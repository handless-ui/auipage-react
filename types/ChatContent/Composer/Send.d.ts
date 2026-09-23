import * as React from 'react'

/**
 * ChatContent.Composer.Send 的 props
 * 继承 button 的所有 HTML 属性
 * 默认行为：onClick 触发 sendMessage；发送中（isExecuting）时禁用按钮
 */
export interface ChatContentComposerSendProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children?: React.ReactNode
}

export declare class ChatContentComposerSend extends React.Component<ChatContentComposerSendProps, any> { }
