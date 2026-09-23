import * as React from 'react'

/**
 * ChatContent.Composer.Root 的 props
 * 继承 form 的所有 HTML 属性
 * 默认行为：阻止 form 默认提交
 */
export interface ChatContentComposerRootProps extends React.FormHTMLAttributes<HTMLFormElement> {
    children?: React.ReactNode
}

export declare class ChatContentComposerRoot extends React.Component<ChatContentComposerRootProps, any> { }
