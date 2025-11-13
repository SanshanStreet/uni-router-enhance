import { PagesConfig } from "./pages";
import fs from "fs";
import path from "path";
import { extractSecondPathSegment } from "./utils";



/**
 * 从 pages.json 中提取所有路由名称
 * @param pagesJson pages.json 配置对象
 * @returns 路由名称的 Set 集合
 */
function extractRouteNamesFromPages(pagesJson: PagesConfig): Set<string> {
	const routes = new Set<string>();

	// 处理主包页面
	if (pagesJson.pages) {
		pagesJson.pages.forEach(page => {
			const name = extractSecondPathSegment(page.path);
			if (name) {
				routes.add(name);
			}
		});
	}

	// 处理分包页面
	if (pagesJson.subPackages) {
		pagesJson.subPackages.forEach(subpackage => {
			const root = subpackage.root;
			subpackage.pages.forEach(page => {
				const name = extractSecondPathSegment(`${root}/${page.path}`);
				if (name) {
					routes.add(name);
				}
			});
		});
	}

	return routes;
}

/**
 * 生成路由类型定义字符串
 * @param routeNames 路由名称数组
 * @returns TypeScript 类型定义字符串
 */
function generateTypeDefinition(routeNames: string[]): string {
	const sortedRoutes = [...routeNames].sort((a, b) => a.localeCompare(b));
	return `export type ENHANCE_ROUTE_PATH =\n${sortedRoutes.map(name => `  | '${name}'`).join('\n')}`;
}

/**
 * 读取并解析 pages.json 文件
 * @param pagesJsonPath pages.json 文件路径
 * @returns 解析后的配置对象
 */
function readPagesJson(pagesJsonPath: string): PagesConfig {
	const content = fs.readFileSync(pagesJsonPath, 'utf8');
	return JSON.parse(content);
}

/**
 * 生成路由类型文件
 * @param dts 类型文件输出路径
 * @param pagesJsonPath pages.json 文件路径
 */
function generateRouteTypeFile(dts: string, pagesJsonPath: string): void {
	const pagesJson = readPagesJson(pagesJsonPath);
	const routeNames = extractRouteNamesFromPages(pagesJson);
	const typeDefinition = generateTypeDefinition(Array.from(routeNames));
	fs.writeFileSync(dts, typeDefinition, 'utf8');
}

// 环境配置验证
const getValidatedPaths = () => {
	const inputDir = process.env.UNI_INPUT_DIR || `${process.env.INIT_CWD}/src`;
	if (!inputDir || inputDir.trim() === '') {
		throw new Error('Missing required environment variables: UNI_INPUT_DIR or INIT_CWD');
	}
	return path.resolve(inputDir, 'pages.json')
};

/**
 * Vite 插件: 自动生成路由类型定义
 * @param dts 类型文件输出路径
 * @returns Vite 插件对象
 */
export function routeTypesPlugin(dts: string) {
	let isFirstBuild = true;

	return {
		name: 'route-types-generator',
		/**
		 * 构建开始时生成路由类型
		 */
		buildStart() {
			// 只在首次构建时生成类型,避免重复生成
			if (isFirstBuild) {
				try {
					const pagesJsonPath = getValidatedPaths();
					generateRouteTypeFile(dts, pagesJsonPath);
					isFirstBuild = false;
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					console.warn('路由类型生成失败:', message);
				}
			}
		},
		/**
		 * 热更新时监听 pages.json 变化
		 */
		handleHotUpdate(ctx: any) {
			// 监听 pages.json 变化，自动重新生成类型
			if (ctx.file.endsWith('pages.json')) {
				try {
					const pagesJsonPath = getValidatedPaths();


					generateRouteTypeFile(dts, pagesJsonPath);
					console.log('🔄 检测到 pages.json 变化，已自动更新路由类型');
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					console.warn('热更新时生成路由类型失败:', message);
				}
			}
		},
	};
}

