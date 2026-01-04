import type { RouterCore } from './create';
import type { RouteLocationNormalized, RouteLocationRaw } from './create';
import { CloseTypes, RouterParams, TypeSafePush } from './type';
import { ensureLeadingSlash, buildUrlWithQuery, resolveCloseType } from './utils';


const performNavigation = async (url: string, close: CloseTypes): Promise<void> => {
	const navigationMethods: Record<CloseTypes, (options: UniApp.NavigateToOptions) => Promise<void>> = {
		[CloseTypes.default]: (options) =>
			new Promise<void>((resolve, reject) => {
				uni.navigateTo({
					...options,
					success: () => resolve(),
					fail: (err) => reject(err),
				});
			}),
		[CloseTypes.current]: (options) =>
			new Promise<void>((resolve, reject) => {
				uni.redirectTo({
					...options,
					success: () => resolve(),
					fail: (err) => reject(err),
				});
			}),
		[CloseTypes.all]: (options) =>
			new Promise<void>((resolve, reject) => {
				uni.reLaunch({
					...options,
					success: () => resolve(),
					fail: (err) => reject(err),
				});
			}),
	};

	await navigationMethods[close]({ url });
};

export type RouterHookResult<TPath extends string> = {
	/** 类型安全的路由跳转方法 */
	push: TypeSafePush<TPath>;
};

/**
 * 创建与指定 Router 实例绑定的路由钩子，避免在调用端重复传参。
 */
export function createRouterHook<TName extends string>(router: RouterCore<TName>): RouterHookResult<TName> {
	/**
	 * 获取当前路由名称
	 */
	const getCurrentRouteName = (): TName | '' => {
		const currentPage = getCurrentPages().at(-1);
		if (!currentPage?.route) {
			return '';
		}
		return router.resolveNameByUrl(currentPage.route) || '';
	};

	/**
	 * 统一的路由跳转实现：先触发 createRouter 注册的拦截器与处理器，再执行实际跳转。
	 */
	const basicPush = async (input: TName | RouterParams<TName>): Promise<void> => {
		const routeData = typeof input === 'string' ? { path: input } : input;
		const path = routeData.path;
		if (!path) {
			const error = new Error('路由名称不能为空');
			routeData.fail?.(error);
			if (!routeData.fail) throw error;
			return;
		}

		const meta = router.getRouteMeta(path);
		if (!meta) {
			const error = new Error(`找不到匹配的路由配置: ${String(path)}`);
			routeData.fail?.(error);
			if (!routeData.fail) throw error;
			return;
		}

		const query = routeData.query ?? {};
		const closeType = resolveCloseType(routeData.close);

		const routePayload = { query, closeType, meta };

		// 获取来源路由信息
		const fromName = getCurrentRouteName();
		const fromMeta = fromName ? router.getRouteMeta(fromName) : undefined;

		// 创建标准化的路由位置对象
		const to: RouteLocationNormalized<TName> = {
			name: path,
			meta,
			query,
			path: meta.url,
		};

		const from: RouteLocationNormalized<TName> = {
			name: fromName || ('' as TName),
			meta: fromMeta,
			query: {},
			path: fromMeta?.url || '',
		};

		let navigationResult: unknown;
		let redirectTo: RouteLocationRaw<TName> | undefined;

		try {
			// 执行 beforeEach 导航守卫
			const beforeResult = await router.runBeforeInterceptors(to, from);

			if (!beforeResult.shouldContinue) {
				// 导航被取消
				if (beforeResult.redirectTo) {
					// 重定向到其他路由
					redirectTo = beforeResult.redirectTo;
				} else {
					// 完全取消导航
					return;
				}
			}
		} catch (error) {
			routeData.fail?.(error as Error);
			if (!routeData.fail) throw error;
			return;
		}

		// 如果有重定向,递归调用 push
		if (redirectTo) {
			if (typeof redirectTo === 'string') {
				// 简单的路由名称重定向
				return basicPush(
					typeof routeData === 'object'
						? { ...routeData, path: redirectTo }
						: redirectTo
				);
			} else {
				// 路由对象重定向
				return basicPush({
					...routeData,
					path: redirectTo.path,
					query: redirectTo.query || routeData.query,
					// TODO: 处理 replace 选项
				});
			}
		}

		// 执行 handler
		try {
			const handler = router.getHandler(path);
			navigationResult = handler ? await handler(routePayload) : undefined;
			await router.runAfterInterceptors(to, from);
		} catch (error) {
			routeData.fail?.(error as Error);
			if (!routeData.fail) throw error;
			return;
		}

		if (navigationResult === false) {
			return;
		}

		// 将 query 和 handler 返回值一起缓存,供目标页面使用
		router.setPageCache(path, {
			query,
			handlerResult: navigationResult,
		});

		try {
			if (meta.isTabBar) {
				if (Object.keys(query).length > 0) {
					console.warn('跳转 tabBar 页面时会忽略 query 参数');
				}
				await new Promise<void>((resolve, reject) => {
					uni.switchTab({
						url: ensureLeadingSlash(meta.url),
						success: () => resolve(),
						fail: (err) => reject(err),
					});
				});
			} else {
				await performNavigation(buildUrlWithQuery(meta.url, query), closeType);
			}

			// 成功回调，传递 handler 的返回值(仅用于通知跳转成功)
			routeData.success?.(navigationResult);
		} catch (error) {
			router.deletePageCache(path);
			routeData.fail?.(error as Error);
			if (!routeData.fail) throw error;
		}
	};

	/**
	 * 导出给外部使用的 push，支持额外回调合并。
	 */
	const push: TypeSafePush<TName> = async (data, callbacks) => {
		if (data == null) {
			const error = new Error('路由参数不能为空');
			callbacks?.fail?.(error);
			throw error;
		}

		const routeData = typeof data === 'string' ? { path: data } : data;
		const finalRouteData: RouterParams<TName> = {
			...routeData,
			success: callbacks?.success ?? routeData.success,
			fail: callbacks?.fail ?? routeData.fail,
		};

		await basicPush(finalRouteData);
	};

	return {
		push
	}
}