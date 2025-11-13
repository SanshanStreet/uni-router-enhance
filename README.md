# uni-router-enhance

一个为 uni-app 设计的**类型安全**路由增强库，提供完整的 TypeScript 类型支持、路由守卫、动态处理函数等高级特性。

## ✨ 特性

- 🔒 **完全类型安全** - 基于 `pages.json` 自动生成路由类型，避免路由拼写错误
- 🛡️ **导航守卫** - 支持 `beforeEach` 和 `afterEach` 全局守卫
- 🎯 **动态处理函数** - 为特定路由注册数据预加载、权限检查等处理逻辑
- 📦 **查询参数类型化** - 支持 TypeScript 类型推断的查询参数
- 🔄 **自动类型生成** - Vite 插件自动从 `pages.json` 生成路由类型
- 🎨 **灵活的页面关闭策略** - 支持 `navigateTo`、`redirectTo`、`reLaunch` 等多种跳转方式
- 💾 **路由数据缓存** - 自动缓存查询参数和处理函数返回值

## 📦 安装

```bash
npm install uni-router-enhance
# 或
pnpm add uni-router-enhance
# 或
yarn add uni-router-enhance
```

## 🚀 快速开始

### 1. 配置 Vite 插件

在 `vite.config.ts` 中配置自动类型生成插件：

```typescript
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import { routeTypesPlugin } from 'uni-router-enhance'

export default defineConfig({
  plugins: [
    uni(),
    // 自动从 pages.json 生成路由类型
    routeTypesPlugin('./types/auto-page.d.ts')
  ]
})
```

### 2. 创建 Router 实例

在 `src/router/index.ts` 中创建 router 实例：

```typescript
import { createRouter } from 'uni-router-enhance'
import pagesJson from '../pages.json'
import type { ENHANCE_ROUTE_PATH } from '../../types/auto-page.d.ts'

// 创建路由实例，传入 pages.json 配置
const router = createRouter<ENHANCE_ROUTE_PATH>(pagesJson)

// 配置全局前置守卫
router.beforeEach((to, from) => {
  console.log('导航前:', to, from)
  // 返回 false 可以取消导航
  // 返回路由名称或路由对象可以重定向
})

// 配置全局后置守卫
router.afterEach((to, from) => {
  console.log('导航后:', to, from)
})

// 导出钩子函数供页面使用
const { useRouter, useRoute } = router

export {
  useRouter,
  useRoute,
  router
}
```

### 3. 在页面中使用

#### 基本路由跳转

```vue
<script setup lang="ts">
import { useRouter } from '@/router'

const { push } = useRouter()

// 简单跳转（类型安全）
const goToHome = () => {
  push('home')
}

// 带查询参数跳转
const goToDetail = () => {
  push({
    path: 'detail',
    query: {
      id: '123',
      name: 'Product'
    }
  })
}

// 带回调的跳转
const goToProfile = () => {
  push('profile', {
    success: (result) => {
      console.log('跳转成功，handler 返回:', result)
    },
    fail: (error) => {
      console.error('跳转失败:', error)
    }
  })
}
</script>
```

#### 页面关闭策略

```typescript
import { CloseTypes } from 'uni-router-enhance'

// 默认: navigateTo - 保留当前页面
push({
  path: 'detail',
  close: CloseTypes.default
})

// redirectTo - 关闭当前页面
push({
  path: 'login'
})

// reLaunch - 关闭所有页面
push({
  path: 'index',
  close: 'all'
})

// 也可以使用字符串
push({
  path: 'home',
  close: 'current'
})
```

#### 获取当前路由信息

```vue
<script setup lang="ts">
import { useRoute } from '@/router'

const route = useRoute()

// 访问路由信息
console.log('当前路由名称:', route.name)
console.log('路由元信息:', route.meta)
console.log('查询参数:', route.query)
console.log('Handler 返回值:', route.handlerResult)
</script>

<template>
  <view>
    <text>当前页面: {{ route.name }}</text>
    <text>参数 ID: {{ route.query.id }}</text>
  </view>
</template>
```

## 🔧 高级功能

### 导航守卫

#### 全局前置守卫 (beforeEach)

```typescript
router.beforeEach((to, from) => {
  console.log(`从 ${from.name} 跳转到 ${to.name}`)
  
  // 权限检查示例
  if (to.meta?.requireAuth && !isLoggedIn()) {
    // 重定向到登录页
    return 'login'
  }
  
  // 返回 false 取消导航
  if (someCondition) {
    return false
  }
  
  // 不返回或返回 true 继续导航
})
```

#### 全局后置守卫 (afterEach)

```typescript
router.afterEach((to, from) => {
  // 页面访问统计
  analytics.track('page_view', {
    from: from.name,
    to: to.name,
    timestamp: Date.now()
  })
  
  // 设置页面标题
  if (to.meta?.title) {
    uni.setNavigationBarTitle({ title: to.meta.title })
  }
})
```

#### 守卫返回值

- `undefined` 或 `true`: 继续导航
- `false`: 取消导航
- 路由名称字符串: 重定向到指定路由
- 路由对象: 重定向到指定路由并携带参数

```typescript
router.beforeEach((to, from) => {
  // 简单重定向
  if (needRedirect) {
    return 'home'
  }
  
  // 带参数重定向
  if (needRedirectWithParams) {
    return {
      path: 'detail',
      query: { id: '123' }
    }
  }
})
```

### 路由处理函数 (Handler)

Handler 函数允许你在路由跳转时执行自定义逻辑，例如数据预加载、权限验证、埋点上报等。

#### 注册 Handler

```typescript
import { router } from '@/router'

// 数据预加载示例
router.register('productDetail', async (payload) => {
  const { query } = payload
  const productId = query.id
  
  // 预加载商品数据
  const product = await fetchProduct(productId)
  
  // 返回的数据可在目标页面通过 route.handlerResult 获取
  return product
})

// 权限检查示例
router.register('adminPanel', async (payload) => {
  const user = await getCurrentUser()
  
  if (!user.isAdmin) {
    throw new Error('无权限访问管理面板')
  }
  
  return { allowed: true }
})

// 埋点上报示例
router.register('orderList', async (payload) => {
  analytics.track('page_view', {
    page: 'orderList',
    timestamp: Date.now(),
    ...payload.query
  })
})
```

#### 获取 Handler 返回值

```vue
<script setup lang="ts">
import { useRoute } from '@/router'

const route = useRoute()

// 获取 handler 返回的数据
const product = route.handlerResult as Product

onMounted(() => {
  if (product) {
    console.log('预加载的商品数据:', product)
  }
})
</script>
```

#### 动态管理 Handler

```typescript
// 检查是否已注册
if (router.has('productDetail')) {
  console.log('已注册 productDetail handler')
}

// 注销 handler（返回取消函数）
const unregister = router.register('temp', async () => {
  // 临时逻辑
})

// 稍后移除
unregister()

// 或直接移除
router.unregister('temp')
```

### 路由元信息 (Meta)

路由元信息从 `pages.json` 自动提取，包含以下字段：

```typescript
interface RouteMeta {
  /** 页面路径 */
  url: string
  /** 页面标题 */
  navigationBarTitleText?: string
  /** 是否为 tabBar 页面 */
  isTabBar?: boolean
  /** 页面唯一标识 */
  name: string
  /** 页面样式配置 */
  style?: Record<string, any>
}
```

在 `pages.json` 中配置的页面样式会自动映射到 meta：

```json
{
  "pages": [
    {
      "path": "pages/home/index",
      "style": {
        "navigationBarTitleText": "首页",
        "enablePullDownRefresh": true
      }
    }
  ]
}
```

访问元信息：

```typescript
const route = useRoute()
console.log(route.meta?.navigationBarTitleText) // "首页"
console.log(route.meta?.isTabBar) // true/false
```

## 📝 API 参考

### createRouter

创建 router 实例。

```typescript
function createRouter<TName extends string>(
  routes?: PagesConfig
): Router<TName>
```

**参数：**
- `routes`: pages.json 配置对象（可选）

**返回：** Router 实例

### Router 实例方法

#### register

注册路由处理函数。

```typescript
register(name: TName, handler: RouteHandler): () => void
```

**参数：**
- `name`: 路由名称
- `handler`: 处理函数，接收 payload，可返回任意值或 Promise

**返回：** 取消注册的函数

#### unregister

移除已注册的处理函数。

```typescript
unregister(name: TName): boolean
```

**返回：** 是否成功移除

#### has

检查是否已注册处理函数。

```typescript
has(name: TName): boolean
```

#### beforeEach

添加全局前置守卫。

```typescript
beforeEach(guard: NavigationGuard<TName>): () => void
```

**返回：** 移除守卫的函数

#### afterEach

添加全局后置守卫。

```typescript
afterEach(guard: NavigationGuard<TName>): () => void
```

**返回：** 移除守卫的函数

#### useRouter

返回路由操作钩子。

```typescript
useRouter(): RouterHookResult<TName>
```

**返回对象：**
- `push`: 类型安全的路由跳转函数

#### useRoute

返回当前路由信息。

```typescript
useRoute(): RouteInfo<TName>
```

**返回对象：**
- `name`: 当前路由名称
- `meta`: 路由元信息
- `query`: 查询参数
- `handlerResult`: Handler 返回值

### useRouter 返回的方法

#### push

类型安全的路由跳转。

```typescript
push(
  data: TName | RouterParams<TName>,
  callbacks?: {
    success?: (result?: unknown) => void
    fail?: (error?: any) => void
  }
): Promise<void>
```

**参数：**
- `data`: 路由名称字符串或路由参数对象
- `callbacks`: 可选的成功/失败回调

**RouterParams 对象：**
```typescript
interface RouterParams<TPath extends string> {
  path?: TPath              // 路由名称
  query?: Record<string, any>  // 查询参数
  close?: CloseTypes           // 页面关闭策略
  success?: (result?: unknown) => void  // 成功回调
  fail?: (error?: any) => void          // 失败回调
}
```

### CloseTypes 枚举

页面关闭策略。

```typescript
enum CloseTypes {
  default = 'default',  // navigateTo - 保留当前页面
  current = 'current',  // redirectTo - 关闭当前页面
  all = 'all'           // reLaunch - 关闭所有页面
}
```

### routeTypesPlugin

Vite 插件，自动生成路由类型。

```typescript
function routeTypesPlugin(dts: string): Plugin
```

**参数：**
- `dts`: 类型文件输出路径

**示例：**
```typescript
routeTypesPlugin('./types/auto-page.d.ts')
```

生成的类型文件示例：

```typescript
export type ENHANCE_ROUTE_PATH =
  | 'demo'
  | 'home'
  | 'index'
  | 'profile'
```

## 🎯 完整示例

### 示例 1：电商应用

```typescript
// router/index.ts
import { createRouter } from 'uni-router-enhance'
import pagesJson from '../pages.json'
import type { ENHANCE_ROUTE_PATH } from '../../types/auto-page.d.ts'

const router = createRouter<ENHANCE_ROUTE_PATH>(pagesJson)

// 全局登录检查
router.beforeEach((to, from) => {
  const needAuth = ['profile', 'order', 'cart'].includes(to.name)
  
  if (needAuth && !isLoggedIn()) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return 'login'
  }
})

// 商品详情页数据预加载
router.register('productDetail', async (payload) => {
  const { query } = payload
  const product = await fetchProduct(query.id)
  return product
})

// 订单列表页权限检查
router.register('orderList', async () => {
  const user = await getCurrentUser()
  if (!user.hasOrders) {
    throw new Error('暂无订单权限')
  }
})

export const { useRouter, useRoute } = router
```

### 示例 2：商品详情页

```vue
<script setup lang="ts">
import { useRoute } from '@/router'

// 获取路由信息
const route = useRoute()

// 从 handler 获取预加载的数据
const product = computed(() => route.handlerResult as Product)

onLoad(() => {
  console.log('页面参数:', route.query)
  console.log('预加载数据:', product.value)
})
</script>

<template>
  <view class="product-detail">
    <image :src="product?.image" />
    <text>{{ product?.name }}</text>
    <text>￥{{ product?.price }}</text>
  </view>
</template>
```

### 示例 3：商品列表页

```vue
<script setup lang="ts">
import { useRouter } from '@/router'

const { push } = useRouter()

const products = ref([])

const goToDetail = (productId: string) => {
  push({
    path: 'productDetail',
    query: { id: productId },
    success: () => {
      console.log('跳转成功')
    },
    fail: (error) => {
      uni.showToast({ title: error.message, icon: 'none' })
    }
  })
}
</script>

<template>
  <view>
    <view 
      v-for="item in products" 
      :key="item.id"
      @click="goToDetail(item.id)"
    >
      {{ item.name }}
    </view>
  </view>
</template>
```

## 🔍 TypeScript 支持

本库完全使用 TypeScript 编写，提供完整的类型定义。

### 自动类型推断

```typescript
// ✅ 类型安全 - 路由名称会被自动检查
push('home')

// ❌ 类型错误 - 不存在的路由
push('nonexistent')

// ✅ 查询参数类型安全
push({
  path: 'detail',
  query: {
    id: '123',
    tab: 'info'
  }
})
```

### 自定义类型

```typescript
// 定义查询参数类型
interface ProductDetailQuery {
  id: string
  from?: 'list' | 'search'
}

// 在 handler 中使用
router.register('productDetail', async (payload) => {
  const query = payload.query as ProductDetailQuery
  console.log(query.id, query.from)
})
```

## ⚠️ 注意事项

1. **TabBar 页面限制**
   - TabBar 页面只能使用 `uni.switchTab` 跳转
   - 跳转到 TabBar 页面时，query 参数会被忽略

2. **路由名称提取规则**
   - 路由名称从页面路径的第二段提取
   - 例如：`pages/home/index` → 路由名称为 `home`
   - 分包路径：`subpackage/detail/index` → 路由名称为 `detail`

3. **Handler 执行时机**
   - Handler 在导航守卫之后、页面跳转之前执行
   - Handler 抛出错误会阻止页面跳转
   - Handler 返回 `false` 会取消导航

4. **缓存清理**
   - 页面缓存在跳转失败时会自动清理
   - 建议在页面 `onLoad` 后及时获取缓存数据

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

MIT License

---

**Made with ❤️ for uni-app developers**
