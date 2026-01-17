import { PagesConfig } from "./pages";
import fs from "fs";
import path from "path";
import { resolveRouteName, RouteNameStrategy } from "./utils";
export type { RouteNameStrategy } from "./utils";

/**
 * 插件配置选项
 */
export interface RouteTypesPluginOptions {
	/** 类型文件输出路径 */
	dts: string;
	/** 自定义类型名称，默认为 'ENHANCE_ROUTE_PATH' */
	typeName?: string;
	/** 自定义类型生成规则 */
	generator?: (routeNames: string[], typeName: string) => string;
	/** 路由名称生成策略，默认 'default' */
	namingStrategy?: RouteNameStrategy;
}

/**
 * 从 pages.json 中提取所有路由名称
 * @param pagesJson pages.json 配置对象
 * @returns 路由名称的 Set 集合
 */
function extractRouteNamesFromPages(pagesJson: PagesConfig, namingStrategy: RouteNameStrategy): Set<string> {
	const routes = new Set<string>();

	// 处理主包页面
	if (pagesJson.pages) {
		pagesJson.pages.forEach(page => {
			const name = resolveRouteName(page.path, namingStrategy);
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
				const name = resolveRouteName(`${root}/${page.path}`, namingStrategy);
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
 * @param typeName 类型名称
 * @returns TypeScript 类型定义字符串
 */
function generateTypeDefinition(routeNames: string[], typeName: string = "ENHANCE_ROUTE_PATH"): string {
	const sortedRoutes = [...routeNames].sort((a, b) => a.localeCompare(b));
	return `export type ${typeName} =\n${sortedRoutes.map(name => `  | '${name}'`).join("\n")}`;
}

/**
 * 读取并解析 pages.json 文件
 * @param pagesJsonPath pages.json 文件路径
 * @returns 解析后的配置对象
 */
function readPagesJson(pagesJsonPath: string): PagesConfig {
	const content = fs.readFileSync(pagesJsonPath, "utf8");
	return JSON.parse(content);
}

/**
 * 生成路由类型文件
 * @param dts 类型文件输出路径
 * @param pagesJsonPath pages.json 文件路径
 * @param options 可选配置
 */
function generateRouteTypeFile(
	dts: string,
	pagesJsonPath: string,
	options?: {
		typeName?: string;
		generator?: (routeNames: string[], typeName: string) => string;
		namingStrategy?: RouteNameStrategy;
	}
): void {
	const pagesJson = readPagesJson(pagesJsonPath);
	const routeNames = extractRouteNamesFromPages(pagesJson, options?.namingStrategy || "default");
	const typeName = options?.typeName || "ENHANCE_ROUTE_PATH";
	const typeDefinition = options?.generator
		? options.generator(Array.from(routeNames), typeName)
		: generateTypeDefinition(Array.from(routeNames), typeName);
	fs.writeFileSync(dts, typeDefinition, "utf8");
}

// 环境配置验证
const getValidatedPaths = () => {
	const inputDir = process.env.UNI_INPUT_DIR || `${process.env.INIT_CWD}/src`;
	if (!inputDir || inputDir.trim() === "") {
		throw new Error("Missing required environment variables: UNI_INPUT_DIR or INIT_CWD");
	}
	return path.resolve(inputDir, "pages.json");
};

/**
 * Vite 插件: 自动生成路由类型定义
 * @param options 插件配置选项，可以是字符串（类型文件输出路径）或配置对象
 * @returns Vite 插件对象
 */
export function routeTypesPlugin(options: string | RouteTypesPluginOptions) {
	let isFirstBuild = true;
	const config: RouteTypesPluginOptions = typeof options === "string" ? { dts: options } : options;

	return {
		name: "route-types-generator",
		/**
		 * 构建开始时生成路由类型
		 */
		buildStart() {
			// 只在首次构建时生成类型,避免重复生成
			if (isFirstBuild) {
				try {
					const pagesJsonPath = getValidatedPaths();
					generateRouteTypeFile(config.dts, pagesJsonPath, {
						typeName: config.typeName,
						generator: config.generator,
						namingStrategy: config.namingStrategy,
					});
					isFirstBuild = false;
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					console.warn("路由类型生成失败:", message);
				}
			}
		},
		/**
		 * 热更新时监听 pages.json 变化
		 */
		watchChange(id: string, change: { event: string }) {
			if (change.event === "update" && id.includes("pages.json")) {
				try {
					const pagesJsonPath = getValidatedPaths();
					generateRouteTypeFile(config.dts, pagesJsonPath, {
						typeName: config.typeName,
						generator: config.generator,
						namingStrategy: config.namingStrategy,
					});
					console.log("🔄 检测到 pages.json 变化，已自动更新路由类型");
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					console.warn("热更新时生成路由类型失败:", message);
				}
			}
		},
	};
}
