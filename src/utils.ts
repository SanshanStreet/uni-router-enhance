import { PagesConfig } from "./pages";
import { CloseInput, CloseTypes, RouteMeta } from "./type";

/**
 * 提取URL路径的第二段或者将多段路径用下划线连接
 * @param url 需要处理的URL
 * @returns 处理后的字符串
 */
export type RouteNameStrategy = 'default' | 'package_page' | ((routePath: string) => string);

export function extractSecondPathSegment(url: string): string {
	const segments = url.split("/").slice(1, -1);
	return segments.length === 1 ? segments[0] : segments.join("_");
}

export const resolveRouteName = (routePath: string, strategy: RouteNameStrategy = 'default'): string | undefined => {
	if (typeof strategy === 'function') {
		return strategy(routePath);
	}

	const normalized = routePath.replace(/^\/+/, '').replace(/\.vue$/i, '');
	if (strategy === 'package_page') {
		const segments = normalized.split('/').filter(Boolean);
		if (segments[segments.length - 1] === 'index') {
			segments.pop();
		}
		return segments.length > 0 ? segments.join('_') : undefined;
	}

	return extractSecondPathSegment(routePath);
};

const isEnumValue = <T extends Record<string, string>>(enumObject: T, value: unknown): value is T[keyof T] =>
	Object.values(enumObject).includes(value as T[keyof T]);

export const ensureLeadingSlash = (url: string): string => (url.startsWith("/") ? url : `/${url}`);

export const buildUrlWithQuery = (url: string, query: Record<string, any>): string => {
	const normalized = ensureLeadingSlash(url);
	const queryEntries = Object.entries(query ?? {}).filter(([, value]) => value !== undefined);
	if (queryEntries.length === 0) {
		return normalized;
	}

	const queryString = queryEntries
		.map(([key, value]) => {
			const serialized = typeof value === "object" && value !== null ? JSON.stringify(value) : String(value);
			return `${encodeURIComponent(key)}=${encodeURIComponent(serialized)}`;
		})
		.join("&");

	return `${normalized}?${queryString}`;
};
export const resolveCloseType = (close: CloseInput): CloseTypes => {
	if (!close) return CloseTypes.default;
	if (isEnumValue(CloseTypes, close)) return close;
	if (typeof close === "string" && close in CloseTypes) return CloseTypes[close as keyof typeof CloseTypes];
	return CloseTypes.default;
};

/**
 * 从 pages.json 解析路由信息
 * @param routes - pages.json 配置对象
 * @returns 路由元信息映射
 */
export function parseRoutesFromPagesJson<TName extends string>(routes: PagesConfig, namingStrategy: RouteNameStrategy = 'default') {
	const routeMeta = new Map<TName, RouteMeta>();
	// 获取 TabBar 页面路径集合
	const tabBarPaths = new Set<string>();
	if (routes.tabBar?.list) {
		routes.tabBar.list.forEach(item => {
			tabBarPaths.add(item.pagePath);
		});
	}

	// 处理主包页面
	if (routes.pages) {
		routes.pages.forEach(page => {
			const name = resolveRouteName(page.path, namingStrategy) as TName;
			if (name) {
				routeMeta.set(name, {
					...page,
					name,
					isTabBar: tabBarPaths.has(page.path) || page.type === "tabBar",
					url: page.path,
				});
			}
		});
	}
	if (routes.subPackages) {
		// 处理分包页面
		const subpackages = routes.subPackages;
		subpackages.forEach(subpackage => {
			const root = subpackage.root;
			subpackage.pages.forEach(page => {
				const fullPath = `${root}/${page.path}`;
				const name = resolveRouteName(fullPath, namingStrategy) as TName;;
				if (name) {
					routeMeta.set(name, {
						...page,
						name,
						isTabBar: tabBarPaths.has(fullPath) || page.type === "tabBar",
						url: fullPath,
					});
				}
			});
		});
	}
	return routeMeta;
}
