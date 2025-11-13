import { createRouterHook, RouterHookResult } from './useRouter';
import { createRouteHook, RouteInfo } from './useRoute';
import type { RouteMeta } from './type';
import { PagesConfig } from './pages';
import { parseRoutesFromPagesJson } from './utils';

// 导出类型供外部使用
export type { RouteInfo, RouterHookResult, RouteMeta };
export { CloseTypes, RouterParams } from './type';

type RouteHandler = (payload?: unknown) => unknown | Promise<unknown>;

/**
 * 标准化的路由位置
 */
export interface RouteLocationNormalized<TName extends string> {
    /** 路由名称 */
    name: TName;
    /** 路由元信息 */
    meta?: RouteMeta;
    /** 查询参数 */
    query: Record<string, any>;
    /** 完整路径 */
    path: string;
}

/**
 * 路由地址(用于重定向)
 */
export type RouteLocationRaw<TName extends string> =
    | TName
    | {
        path: TName;
        query?: Record<string, any>;
        replace?: boolean;
    };

/**
 * 路由守卫函数类型
 * @param to 即将要进入的目标路由
 * @param from 当前导航正要离开的路由
 * @returns 
 *   - false: 取消当前导航
 *   - RouteLocationRaw: 重定向到不同的地址
 *   - undefined/true/void: 继续导航
 */
export type NavigationGuard<TName extends string> = (
    to: RouteLocationNormalized<TName>,
    from: RouteLocationNormalized<TName>
) => void | boolean | RouteLocationRaw<TName> | Promise<void | boolean | RouteLocationRaw<TName>>;



/**
 * Router 核心能力：注册处理函数与拦截器，并存储元信息。
 */
export interface RouterCore<TName extends string> {
    /**
     * 注册一个路由处理函数。返回一个取消订阅（卸载）函数，用于移除该处理函数。
     */
    register(name: TName, handler: RouteHandler): () => void;
    /**
     * 通过名称移除已注册的处理函数。若存在则返回 true。
     */
    unregister(name: TName): boolean;
    /**
     * 检查是否已为给定名称注册处理函数。
     */
    has(name: TName): boolean;
    /**
     * 获取指定路由名称对应的处理函数。
     */
    getHandler(name: TName): RouteHandler | undefined;
    /**
     * 添加一个 beforeEach 导航守卫。返回一个卸载该守卫的函数。
     */
    beforeEach(guard: NavigationGuard<TName>): () => void;
    /**
     * 添加一个 afterEach 导航守卫。返回一个卸载该守卫的函数。
     */
    afterEach(guard: NavigationGuard<TName>): () => void;
    /**
     * 记录路由元信息，返回一个用于撤销注册的函数。
     */
    defineRoute(name: TName, meta: RouteMeta): () => void;
    /**
     * 获取对应路由的元信息。
     */
    getRouteMeta(name: TName): RouteMeta | undefined;
    /**
     * 获取所有路由的元信息快照。
     */
    listRouteMeta(): ReadonlyMap<TName, RouteMeta>;
    /**
     * 手动执行 beforeEach 导航守卫链。
     * @returns 返回导航控制结果
     */
    runBeforeInterceptors(
        to: RouteLocationNormalized<TName>,
        from: RouteLocationNormalized<TName>
    ): Promise<{ shouldContinue: boolean; redirectTo?: RouteLocationRaw<TName> }>;
    /**
     * 手动执行 afterEach 导航守卫链。
     */
    runAfterInterceptors(to: RouteLocationNormalized<TName>, from: RouteLocationNormalized<TName>): Promise<void>;
    /**
     * 设置页面缓存数据(query 和 handler 返回值)
     */
    setPageCache(url: TName, data: { query: Record<string, any>; handlerResult?: unknown }): void;
    /**
     * 获取页面缓存数据
     */
    getPageCache(url: TName): { query: Record<string, any>; handlerResult?: unknown } | undefined;
    /**
     * 删除页面缓存数据
     */
    deletePageCache(url: TName): void;
}

/**
 * Router 对外暴露的完整接口，只包含公开的方法。
 */
export interface Router<TName extends string> {
    /**
     * 注册一个路由处理函数。返回一个取消订阅（卸载）函数，用于移除该处理函数。
     */
    register(name: TName, handler: RouteHandler): () => void;
    /**
     * 通过名称移除已注册的处理函数。若存在则返回 true。
     */
    unregister(name: TName): boolean;
    /**
     * 检查是否已为给定名称注册处理函数。
     */
    has(name: TName): boolean;
    /**
     * 添加一个 beforeEach 导航守卫。返回一个卸载该守卫的函数。
     */
    beforeEach(guard: NavigationGuard<TName>): () => void;
    /**
     * 添加一个 afterEach 导航守卫。返回一个卸载该守卫的函数。
     */
    afterEach(guard: NavigationGuard<TName>): () => void;
    /**
     * 生成绑定当前 Router 实例的 useRouter 钩子。
     */
    useRouter(): RouterHookResult<TName>;
    /**
     * 生成绑定当前 Router 实例的 useRoute 钩子,获取当前页面的路由信息。
     */
    useRoute(): RouteInfo<TName>;
}

/**
 * 创建一个路由实例，泛型 TName 表示允许的路由名称（通常为字符串字面量联合类型）。
 */
export function createRouter<const TRoutes extends Record<string, RouteMeta>>(routes: PagesConfig): Router<Extract<keyof TRoutes, string>>;
export function createRouter<TName extends string>(routes?: PagesConfig): Router<TName>;
export function createRouter<TName extends string>(routes?: PagesConfig): Router<TName> {
    // 存储路由处理函数的映射表
    const handlers = new Map<TName, RouteHandler>();
    // beforeEach 导航守卫数组
    const beforeInterceptors: NavigationGuard<TName>[] = [];
    // afterEach 导航守卫数组
    const afterInterceptors: NavigationGuard<TName>[] = [];
    // 路由元信息映射表
    const routeMeta = new Map<TName, RouteMeta>();
    // 页面缓存: 存储 query 和 handler 返回值
    const pageCache = new Map<TName, { query: Record<string, any>; handlerResult?: unknown }>();

    // 如果提供了 pages.json 配置,解析并注册所有路由
    if (routes) {
        parseRoutesFromPagesJson(routes).forEach((meta, name) => {
            routeMeta.set(name as TName, meta);
        });
    }

    /**
     * 添加守卫到指定的守卫数组
     * @param bucket 守卫数组
     * @param guard 要添加的守卫函数
     * @returns 返回一个卸载函数,调用后可移除该守卫
     */
    const addInterceptor = (bucket: NavigationGuard<TName>[], guard: NavigationGuard<TName>) => {
        bucket.push(guard);
        return () => {
            const index = bucket.indexOf(guard);
            if (index >= 0) bucket.splice(index, 1);
        };
    };
    /**
     * 执行导航守卫链
     * 按注册顺序依次执行守卫,任何守卫返回 false 或重定向地址都会中断后续守卫的执行
     * @param bucket 守卫数组
     * @param to 目标路由位置
     * @param from 来源路由位置
     * @returns 返回导航控制结果
     *   - shouldContinue: true 表示继续导航, false 表示取消导航
     *   - redirectTo: 如果存在,表示重定向到该地址
     */
    const runInterceptors = async (
        bucket: NavigationGuard<TName>[],
        to: RouteLocationNormalized<TName>,
        from: RouteLocationNormalized<TName>
    ): Promise<{ shouldContinue: boolean; redirectTo?: RouteLocationRaw<TName> }> => {
        for (const guard of bucket) {
            // 在循环中 await,以支持异步守卫的顺序执行
            // eslint-disable-next-line no-await-in-loop
            const result = await guard(to, from);

            // 处理守卫返回值
            if (result === false) {
                // 返回 false 取消导航
                return { shouldContinue: false };
            }

            if (result && typeof result === 'object' && 'path' in result) {
                // 返回路由对象重定向 { path: 'home', query: {...}, replace: true }
                return { shouldContinue: false, redirectTo: result };
            }

            if (typeof result === 'string') {
                // 返回路由名称字符串重定向
                return { shouldContinue: false, redirectTo: result as TName };
            }

            // result 为 undefined 或 true,继续执行下一个守卫
        }

        // 所有守卫都通过,允许导航继续
        return { shouldContinue: true };
    };

    /**
     * 执行 after 守卫链(不支持导航控制,仅用于通知)
     * after 守卫在导航完成后执行,无法阻止或重定向导航
     * @param bucket 守卫数组
     * @param to 目标路由位置
     * @param from 来源路由位置
     */
    const runAfterInterceptors = async (
        bucket: NavigationGuard<TName>[],
        to: RouteLocationNormalized<TName>,
        from: RouteLocationNormalized<TName>
    ): Promise<void> => {
        for (const guard of bucket) {
            // 按顺序执行所有 after 守卫
            // eslint-disable-next-line no-await-in-loop
            await guard(to, from);
        }
    };



    // Router 核心实现对象,包含所有内部方法
    const routerImpl: RouterCore<TName> = {
        // 注册路由处理函数
        register: (name, handler) => {
            handlers.set(name, handler);
            // 返回卸载函数
            return () => {
                handlers.delete(name);
            };
        },
        // 移除路由处理函数
        unregister: (name) => handlers.delete(name),
        // 检查是否已注册处理函数
        has: (name) => handlers.has(name),
        // 获取路由处理函数
        getHandler: (name) => handlers.get(name),
        // 添加 beforeEach 守卫
        beforeEach: (interceptor) => addInterceptor(beforeInterceptors, interceptor),
        // 添加 afterEach 守卫
        afterEach: (interceptor) => addInterceptor(afterInterceptors, interceptor),
        // 定义路由元信息
        defineRoute: (name, meta) => {
            routeMeta.set(name, meta);
            // 返回撤销函数
            return () => {
                routeMeta.delete(name);
            };
        },
        // 获取路由元信息
        getRouteMeta: (name) => routeMeta.get(name),
        // 获取所有路由元信息的只读快照
        listRouteMeta: () => new Map(routeMeta),
        // 执行 beforeEach 守卫链
        runBeforeInterceptors: (to, from) => runInterceptors(beforeInterceptors, to, from),
        // 执行 afterEach 守卫链
        runAfterInterceptors: (to, from) => runAfterInterceptors(afterInterceptors, to, from),
        // 页面缓存管理方法
        setPageCache: (name, data) => pageCache.set(name, data),
        getPageCache: (name) => pageCache.get(name),
        deletePageCache: (name) => pageCache.delete(name),
    };

    // 创建 useRouter 工厂函数,闭包持有完整的 routerImpl
    const useRouterFactory = () => createRouterHook(routerImpl);
    // 创建 useRoute 工厂函数,闭包持有完整的 routerImpl
    const useRouteFactory = () => createRouteHook(routerImpl);

    // 只返回公开的方法,隐藏内部实现细节
    return {
        afterEach: routerImpl.afterEach,        // 注册 afterEach 守卫
        beforeEach: routerImpl.beforeEach,      // 注册 beforeEach 守卫
        register: routerImpl.register,          // 注册路由处理函数
        unregister: routerImpl.unregister,      // 移除路由处理函数
        has: routerImpl.has,                    // 检查处理函数是否存在
        useRouter: useRouterFactory,            // 创建 useRouter 钩子
        useRoute: useRouteFactory               // 创建 useRoute 钩子
    } as Router<TName>;
}
