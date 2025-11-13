var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/type.ts
var CloseTypes = /* @__PURE__ */ ((CloseTypes2) => {
  CloseTypes2["default"] = "default";
  CloseTypes2["current"] = "current";
  CloseTypes2["all"] = "all";
  return CloseTypes2;
})(CloseTypes || {});

// src/utils.ts
function extractSecondPathSegment(url) {
  const segments = url.split("/").slice(1, -1);
  return segments.length === 1 ? segments[0] : segments.join("_");
}
var isEnumValue = (enumObject, value) => Object.values(enumObject).includes(value);
var ensureLeadingSlash = (url) => url.startsWith("/") ? url : `/${url}`;
var buildUrlWithQuery = (url, query) => {
  const normalized = ensureLeadingSlash(url);
  const queryEntries = Object.entries(query ?? {}).filter(([, value]) => value !== void 0);
  if (queryEntries.length === 0) {
    return normalized;
  }
  const queryString = queryEntries.map(([key, value]) => {
    const serialized = typeof value === "object" && value !== null ? JSON.stringify(value) : String(value);
    return `${encodeURIComponent(key)}=${encodeURIComponent(serialized)}`;
  }).join("&");
  return `${normalized}?${queryString}`;
};
var resolveCloseType = (close) => {
  if (!close) return "default" /* default */;
  if (isEnumValue(CloseTypes, close)) return close;
  if (typeof close === "string" && close in CloseTypes) return CloseTypes[close];
  return "default" /* default */;
};
function parseRoutesFromPagesJson(routes) {
  const routeMeta = /* @__PURE__ */ new Map();
  const tabBarPaths = /* @__PURE__ */ new Set();
  if (routes.tabBar?.list) {
    routes.tabBar.list.forEach((item) => {
      tabBarPaths.add(item.pagePath);
    });
  }
  if (routes.pages) {
    routes.pages.forEach((page) => {
      const name = extractSecondPathSegment(page.path);
      if (name) {
        routeMeta.set(name, {
          ...page,
          name,
          isTabBar: tabBarPaths.has(page.path) || page.type === "tabBar",
          url: page.path
        });
      }
    });
  }
  if (routes.subPackages) {
    const subpackages = routes.subPackages;
    subpackages.forEach((subpackage) => {
      const root = subpackage.root;
      subpackage.pages.forEach((page) => {
        const fullPath = `${root}/${page.path}`;
        const name = extractSecondPathSegment(fullPath);
        if (name) {
          routes.set(name, {
            ...page,
            name,
            isTabBar: tabBarPaths.has(fullPath) || page.type === "tabBar",
            url: fullPath
          });
        }
      });
    });
  }
  return routeMeta;
}

// src/useRouter.ts
var performNavigation = async (url, close) => {
  const navigationMethods = {
    ["default" /* default */]: (options) => new Promise((resolve, reject) => {
      uni.navigateTo({
        ...options,
        success: () => resolve(),
        fail: (err) => reject(err)
      });
    }),
    ["current" /* current */]: (options) => new Promise((resolve, reject) => {
      uni.redirectTo({
        ...options,
        success: () => resolve(),
        fail: (err) => reject(err)
      });
    }),
    ["all" /* all */]: (options) => new Promise((resolve, reject) => {
      uni.reLaunch({
        ...options,
        success: () => resolve(),
        fail: (err) => reject(err)
      });
    })
  };
  await navigationMethods[close]({ url });
};
function createRouterHook(router) {
  const getCurrentRouteName = () => {
    const currentPage = getCurrentPages().at(-1);
    if (!currentPage?.route) {
      return "";
    }
    return extractSecondPathSegment(currentPage.route) || "";
  };
  const basicPush = async (input) => {
    const routeData = typeof input === "string" ? { path: input } : input;
    const path2 = routeData.path;
    if (!path2) {
      const error = new Error("\u8DEF\u7531\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A");
      routeData.fail?.(error);
      if (!routeData.fail) throw error;
      return;
    }
    const meta = router.getRouteMeta(path2);
    if (!meta) {
      const error = new Error(`\u627E\u4E0D\u5230\u5339\u914D\u7684\u8DEF\u7531\u914D\u7F6E: ${String(path2)}`);
      routeData.fail?.(error);
      if (!routeData.fail) throw error;
      return;
    }
    const query = routeData.query ?? {};
    const closeType = resolveCloseType(routeData.close);
    const routePayload = { query, closeType, meta };
    const fromName = getCurrentRouteName();
    const fromMeta = fromName ? router.getRouteMeta(fromName) : void 0;
    const to = {
      name: path2,
      meta,
      query,
      path: meta.url
    };
    const from = {
      name: fromName || "",
      meta: fromMeta,
      query: {},
      path: fromMeta?.url || ""
    };
    let navigationResult;
    let redirectTo;
    try {
      const beforeResult = await router.runBeforeInterceptors(to, from);
      if (!beforeResult.shouldContinue) {
        if (beforeResult.redirectTo) {
          redirectTo = beforeResult.redirectTo;
        } else {
          return;
        }
      }
    } catch (error) {
      routeData.fail?.(error);
      if (!routeData.fail) throw error;
      return;
    }
    if (redirectTo) {
      if (typeof redirectTo === "string") {
        return basicPush(
          typeof routeData === "object" ? { ...routeData, path: redirectTo } : redirectTo
        );
      } else {
        return basicPush({
          ...routeData,
          path: redirectTo.path,
          query: redirectTo.query || routeData.query
          // TODO: 处理 replace 选项
        });
      }
    }
    try {
      const handler = router.getHandler(path2);
      navigationResult = handler ? await handler(routePayload) : void 0;
      await router.runAfterInterceptors(to, from);
    } catch (error) {
      routeData.fail?.(error);
      if (!routeData.fail) throw error;
      return;
    }
    if (navigationResult === false) {
      return;
    }
    router.setPageCache(path2, {
      query,
      handlerResult: navigationResult
    });
    try {
      if (meta.isTabBar) {
        if (Object.keys(query).length > 0) {
          console.warn("\u8DF3\u8F6C tabBar \u9875\u9762\u65F6\u4F1A\u5FFD\u7565 query \u53C2\u6570");
        }
        await new Promise((resolve, reject) => {
          uni.switchTab({
            url: ensureLeadingSlash(meta.url),
            success: () => resolve(),
            fail: (err) => reject(err)
          });
        });
      } else {
        await performNavigation(buildUrlWithQuery(meta.url, query), closeType);
      }
      routeData.success?.(navigationResult);
    } catch (error) {
      router.deletePageCache(path2);
      routeData.fail?.(error);
      if (!routeData.fail) throw error;
    }
  };
  const push = async (data, callbacks) => {
    const routeData = typeof data === "string" ? { path: data } : data;
    const finalRouteData = {
      ...routeData,
      success: callbacks?.success ?? routeData.success,
      fail: callbacks?.fail ?? routeData.fail
    };
    await basicPush(finalRouteData);
  };
  return {
    push
  };
}

// src/useRoute.ts
function createRouteHook(router) {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  if (!currentPage?.route) {
    console.warn("\u65E0\u6CD5\u83B7\u53D6\u5F53\u524D\u9875\u9762\u7684\u8DEF\u7531\u4FE1\u606F");
    return {
      name: "",
      meta: void 0,
      query: {},
      handlerResult: void 0
    };
  }
  const routeName = extractSecondPathSegment(currentPage.route);
  const meta = router.getRouteMeta(routeName);
  const cache = router.getPageCache(routeName);
  const mergedQuery = {
    ...cache?.query,
    ...currentPage.options
  };
  return {
    name: routeName,
    meta,
    query: mergedQuery,
    handlerResult: cache?.handlerResult
  };
}

// src/create.ts
function createRouter(routes) {
  const handlers = /* @__PURE__ */ new Map();
  const beforeInterceptors = [];
  const afterInterceptors = [];
  const routeMeta = /* @__PURE__ */ new Map();
  const pageCache = /* @__PURE__ */ new Map();
  if (routes) {
    parseRoutesFromPagesJson(routes).forEach((meta, name) => {
      routeMeta.set(name, meta);
    });
  }
  const addInterceptor = (bucket, guard) => {
    bucket.push(guard);
    return () => {
      const index = bucket.indexOf(guard);
      if (index >= 0) bucket.splice(index, 1);
    };
  };
  const runInterceptors = async (bucket, to, from) => {
    for (const guard of bucket) {
      const result = await guard(to, from);
      if (result === false) {
        return { shouldContinue: false };
      }
      if (result && typeof result === "object" && "path" in result) {
        return { shouldContinue: false, redirectTo: result };
      }
      if (typeof result === "string") {
        return { shouldContinue: false, redirectTo: result };
      }
    }
    return { shouldContinue: true };
  };
  const runAfterInterceptors = async (bucket, to, from) => {
    for (const guard of bucket) {
      await guard(to, from);
    }
  };
  const routerImpl = {
    // 注册路由处理函数
    register: (name, handler) => {
      handlers.set(name, handler);
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
    deletePageCache: (name) => pageCache.delete(name)
  };
  const useRouterFactory = () => createRouterHook(routerImpl);
  const useRouteFactory = () => createRouteHook(routerImpl);
  return {
    afterEach: routerImpl.afterEach,
    // 注册 afterEach 守卫
    beforeEach: routerImpl.beforeEach,
    // 注册 beforeEach 守卫
    register: routerImpl.register,
    // 注册路由处理函数
    unregister: routerImpl.unregister,
    // 移除路由处理函数
    has: routerImpl.has,
    // 检查处理函数是否存在
    useRouter: useRouterFactory,
    // 创建 useRouter 钩子
    useRoute: useRouteFactory
    // 创建 useRoute 钩子
  };
}

// src/plugin.ts
import fs from "fs";
import path from "path";
function extractRouteNamesFromPages(pagesJson) {
  const routes = /* @__PURE__ */ new Set();
  if (pagesJson.pages) {
    pagesJson.pages.forEach((page) => {
      const name = extractSecondPathSegment(page.path);
      if (name) {
        routes.add(name);
      }
    });
  }
  if (pagesJson.subPackages) {
    pagesJson.subPackages.forEach((subpackage) => {
      const root = subpackage.root;
      subpackage.pages.forEach((page) => {
        const name = extractSecondPathSegment(`${root}/${page.path}`);
        if (name) {
          routes.add(name);
        }
      });
    });
  }
  return routes;
}
function generateTypeDefinition(routeNames) {
  const sortedRoutes = [...routeNames].sort((a, b) => a.localeCompare(b));
  return `export type Path =
${sortedRoutes.map((name) => `  | '${name}'`).join("\n")}`;
}
function readPagesJson(pagesJsonPath) {
  const content = fs.readFileSync(pagesJsonPath, "utf8");
  return JSON.parse(content);
}
function generateRouteTypeFile(dts, pagesJsonPath) {
  const pagesJson = readPagesJson(pagesJsonPath);
  const routeNames = extractRouteNamesFromPages(pagesJson);
  const typeDefinition = generateTypeDefinition(Array.from(routeNames));
  fs.writeFileSync(dts, typeDefinition, "utf8");
}
function routeTypesPlugin(dts) {
  let isFirstBuild = true;
  return {
    name: "route-types-generator",
    /**
     * 构建开始时生成路由类型
     */
    buildStart() {
      if (isFirstBuild) {
        try {
          const pagesJsonPath = path.resolve(__dirname, "../src/pages.json");
          generateRouteTypeFile(dts, pagesJsonPath);
          isFirstBuild = false;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.warn("\u8DEF\u7531\u7C7B\u578B\u751F\u6210\u5931\u8D25:", message);
        }
      }
    },
    /**
     * 热更新时监听 pages.json 变化
     */
    handleHotUpdate(ctx) {
      if (ctx.file.endsWith("pages.json")) {
        try {
          const { generateRouteTypes } = __require("./script/generate-route-types.js");
          generateRouteTypes();
          console.log("\u{1F504} \u68C0\u6D4B\u5230 pages.json \u53D8\u5316\uFF0C\u5DF2\u81EA\u52A8\u66F4\u65B0\u8DEF\u7531\u7C7B\u578B");
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.warn("\u70ED\u66F4\u65B0\u65F6\u751F\u6210\u8DEF\u7531\u7C7B\u578B\u5931\u8D25:", message);
        }
      }
    }
  };
}
export {
  createRouter,
  routeTypesPlugin
};
//# sourceMappingURL=index.mjs.map