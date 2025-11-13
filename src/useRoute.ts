import type { RouterCore } from './create';
import type { RouteMeta } from './type';
import { extractSecondPathSegment } from './utils';

/**
 * 扩展 uni-app 页面实例类型,包含 options 属性
 */
interface UniPageInstance extends Page.PageInstance<AnyObject, Record<string, any>> {
	/** 页面路由路径 */
	route?: string;
	/** 页面 URL 查询参数 */
	options?: Record<string, string>;
}

/**
 * useRoute 返回的路由信息
 */
export interface RouteInfo<TName extends string> {
	/** 路由名称 */
	name: TName;
	/** 路由元信息 */
	meta?: RouteMeta;
	/** 合并后的查询参数(包含 URL 参数和缓存参数) */
	query: Record<string, any>;
	/** Handler 返回值 */
	handlerResult?: unknown;
}

/**
 * 创建路由钩子,获取当前页面的路由信息
 * @param router - Router 核心实例
 * @returns 当前页面的路由信息
 */
export function createRouteHook<TName extends string>(router: RouterCore<TName>): RouteInfo<TName> {
	// 获取当前页面实例
	const pages = getCurrentPages();
	const currentPage = pages[pages.length - 1] as UniPageInstance | undefined;

	// 如果没有当前页面,返回空信息
	if (!currentPage?.route) {
		console.warn('无法获取当前页面的路由信息');
		return {
			name: '' as TName,
			meta: undefined,
			query: {},
			handlerResult: undefined,
		};
	}

	// 从路由路径提取路由名称
	const routeName = extractSecondPathSegment(currentPage.route) as TName;

	// 获取路由元信息
	const meta = router.getRouteMeta(routeName);

	// 获取页面缓存数据(包含 query 和 handlerResult)
	const cache = router.getPageCache(routeName as TName);

	// 合并查询参数: 缓存的 query + URL 中的 options
	const mergedQuery: Record<string, any> = {
		...cache?.query,
		...currentPage.options,
	};

	return {
		name: routeName,
		meta,
		query: mergedQuery,
		handlerResult: cache?.handlerResult,
	};
}