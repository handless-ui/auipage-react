import * as React from 'react'

/**
 * 单条会话的形态
 * 对齐 src/store.ts 中的 ThreadListItem
 */
export type { ThreadListItem } from '../store'

/**
 * ThreadList.Items 的 props
 * children 为 render-prop，按每条 thread 调用一次
 */
export interface ThreadListItemsProps {
    children?: (props: { thread: ThreadListItem }) => React.ReactNode
}

export declare class ThreadListItems extends React.Component<ThreadListItemsProps, any> { }
