import type { PageMetaDatum } from './pages';

export enum CloseTypes {
    default = 'default',
    current = 'current',
    all = 'all',
}

export interface RouteMeta extends PageMetaDatum {
    /** 页面对应的真实路径，例如：pages/home/index */
    url: string
    /** 是否为 tabBar 页面 */
    isTabBar?: boolean
    /**
     * 页面唯一key
     */
    name: string
}

export interface RouterParams<TPath extends string> {
    /** 路由名称（来自 createRouter 注册的类型） */
    path?: TPath
    /** 需要传递给目标页面的查询参数 */
    query?: Record<string, any>
    /** 页面关闭策略 */
    close?: CloseTypes | keyof typeof CloseTypes
    /** 成功回调，可以接收 handler 的返回值 */
    success?: (result?: unknown) => void
    /** 失败回调 */
    fail?: (error?: any) => void
}

/** 类型安全的路由推送函数类型 */
export type TypeSafePush<TPath extends string> = (
    data: TPath | RouterParams<TPath>,
    callbacks?: {
        success?: (result?: unknown) => void
        fail?: (error?: any) => void
    }
) => Promise<void>

/**
 * 页面关闭策略输入类型
 */
export type CloseInput = CloseTypes | keyof typeof CloseTypes | undefined;


