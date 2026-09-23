import * as React from 'react'

/**
 * ChatContent.Composer.Input 的 props
 * 继承 textarea 的所有 HTML 属性
 * 默认行为：value/onChange 受控于 store.composerValue
 *           支持 Cmd/Ctrl + Enter 发送
 */
export interface ChatContentComposerInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    children?: React.ReactNode
}

export declare class ChatContentComposerInput extends React.Component<ChatContentComposerInputProps, any> { }
