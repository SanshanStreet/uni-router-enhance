# uni-router-enhance

一个为 uni-app 设计的**类型安全**路由增强库，提供完整的 TypeScript 类型支持、路由守卫、动态处理函数等高级特性。

## ✨ 特性

- 🎯 **类型安全**：完整的 TypeScript 类型支持，编译时检查路由参数
- 🛡️ **路由守卫**：支持全局守卫和路由级守卫，轻松实现权限控制
- 🔄 **动态处理**：支持路由跳转前后的动态处理函数
- 📦 **轻量级**：核心代码精简，不增加额外负担
- 🔌 **易集成**：无缝集成到现有 uni-app 项目
- 🎨 **灵活配置**：支持多种配置方式，满足不同场景需求

## 📦 安装

使用 npm 安装：

```bash
npm install uni-router-enhance
```

使用 yarn 安装：

```bash
yarn add uni-router-enhance
```

使用 pnpm 安装：

```bash
pnpm add uni-router-enhance
```

## 🚀 快速开始

### 基础使用

```typescript
import { createRouter } from 'uni-router-enhance'

// 定义路由配置
const router = createRouter({
  routes: [
    {
      path: '/pages/index/index',
      name: 'home',
      meta: {
        title: '首页'
      }
    },
    {
      path: '/pages/user/user',
      name: 'user',
      meta: {
        title: '用户中心',
        requiresAuth: true
      }
    }
  ]
})

// 导航到指定路由
router.push({ name: 'home' })
router.push({ path: '/pages/index/index' })
```

### 带参数的路由跳转

```typescript
// 使用 query 参数
router.push({
  name: 'user',
  query: {
    id: '123',
    tab: 'profile'
  }
})

// 类型安全的参数传递
interface UserParams {
  id: string
  tab?: 'profile' | 'settings'
}

router.push<UserParams>({
  name: 'user',
  query: {
    id: '123',
    tab: 'profile'
  }
})
```

## 🛡️ 路由守卫

### 全局守卫

```typescript
// 全局前置守卫
router.beforeEach((to, from, next) => {
  // 检查是否需要登录
  if (to.meta?.requiresAuth) {
    const isLoggedIn = checkAuth() // 你的登录检查逻辑
    if (!isLoggedIn) {
      // 重定向到登录页
      next({ name: 'login' })
      return
    }
  }
  next()
})

// 全局后置守卫
router.afterEach((to, from) => {
  // 设置页面标题
  uni.setNavigationBarTitle({
    title: to.meta?.title || '默认标题'
  })
})
```

### 路由级守卫

```typescript
const router = createRouter({
  routes: [
    {
      path: '/pages/admin/admin',
      name: 'admin',
      meta: {
        title: '管理后台',
        requiresAuth: true,
        role: 'admin'
      },
      beforeEnter: (to, from, next) => {
        const userRole = getUserRole() // 获取用户角色
        if (userRole === 'admin') {
          next()
        } else {
          next({ name: 'home' })
        }
      }
    }
  ]
})
```

## 📚 API 文档

### createRouter(options)

创建路由实例。

**参数：**

- `options.routes`: 路由配置数组
- `options.mode`: 路由模式（可选）

**返回值：** Router 实例

### Router 实例方法

#### push(location)

导航到新路由。

```typescript
router.push({ name: 'home' })
router.push({ path: '/pages/index/index' })
router.push({ name: 'user', query: { id: '123' } })
```

#### replace(location)

替换当前路由（不会在历史记录中留下记录）。

```typescript
router.replace({ name: 'home' })
```

#### back(delta?)

返回上一页或指定页数。

```typescript
router.back() // 返回上一页
router.back(2) // 返回两页
```

#### redirectTo(location)

关闭当前页面，跳转到应用内的某个页面。

```typescript
router.redirectTo({ name: 'home' })
```

#### reLaunch(location)

关闭所有页面，打开到应用内的某个页面。

```typescript
router.reLaunch({ name: 'home' })
```

#### switchTab(location)

跳转到 tabBar 页面，并关闭其他所有非 tabBar 页面。

```typescript
router.switchTab({ name: 'home' })
```

#### beforeEach(guard)

注册全局前置守卫。

```typescript
router.beforeEach((to, from, next) => {
  // 守卫逻辑
  next()
})
```

#### afterEach(hook)

注册全局后置钩子。

```typescript
router.afterEach((to, from) => {
  // 后置处理逻辑
})
```

## 🔧 配置选项

### 路由配置

```typescript
interface RouteConfig {
  path: string          // 页面路径
  name?: string         // 路由名称
  meta?: RouteMeta      // 路由元信息
  beforeEnter?: NavigationGuard  // 路由级守卫
}

interface RouteMeta {
  title?: string        // 页面标题
  requiresAuth?: boolean // 是否需要登录
  [key: string]: any    // 自定义元信息
}
```

### 导航配置

```typescript
interface NavigationOptions {
  name?: string         // 路由名称
  path?: string         // 路由路径
  query?: Record<string, any>  // 查询参数
  animationType?: string       // 动画类型
  animationDuration?: number   // 动画时长
}
```

## 💡 使用示例

### 示例 1：用户认证

```typescript
import { createRouter } from 'uni-router-enhance'

const router = createRouter({
  routes: [
    { path: '/pages/index/index', name: 'home' },
    { path: '/pages/login/login', name: 'login' },
    { 
      path: '/pages/profile/profile', 
      name: 'profile',
      meta: { requiresAuth: true }
    }
  ]
})

router.beforeEach((to, from, next) => {
  const token = uni.getStorageSync('token')
  
  if (to.meta?.requiresAuth && !token) {
    next({ name: 'login', query: { redirect: to.path } })
  } else {
    next()
  }
})

export default router
```

### 示例 2：页面标题管理

```typescript
router.afterEach((to) => {
  if (to.meta?.title) {
    uni.setNavigationBarTitle({
      title: to.meta.title
    })
  }
})
```

### 示例 3：页面访问日志

```typescript
router.afterEach((to, from) => {
  console.log(`从 ${from.path} 导航到 ${to.path}`)
  
  // 上报页面访问统计
  reportPageView({
    page: to.path,
    title: to.meta?.title
  })
})
```

## 🎯 最佳实践

### 1. 路由配置集中管理

建议在单独的文件中管理路由配置：

```typescript
// router/routes.ts
export const routes = [
  {
    path: '/pages/index/index',
    name: 'home',
    meta: { title: '首页' }
  },
  // ... 更多路由
]

// router/index.ts
import { createRouter } from 'uni-router-enhance'
import { routes } from './routes'

const router = createRouter({ routes })
export default router
```

### 2. 类型安全的参数传递

使用 TypeScript 接口定义参数类型：

```typescript
interface UserPageParams {
  userId: string
  tab?: 'info' | 'orders' | 'settings'
}

router.push<UserPageParams>({
  name: 'user',
  query: {
    userId: '123',
    tab: 'info'
  }
})
```

### 3. 路由守卫分层

将不同职责的守卫逻辑分离：

```typescript
// 认证守卫
const authGuard = (to, from, next) => {
  if (to.meta?.requiresAuth && !isAuthenticated()) {
    next({ name: 'login' })
    return
  }
  next()
}

// 权限守卫
const permissionGuard = (to, from, next) => {
  if (to.meta?.permission && !hasPermission(to.meta.permission)) {
    next({ name: 'forbidden' })
    return
  }
  next()
}

router.beforeEach(authGuard)
router.beforeEach(permissionGuard)
```

### 4. 错误处理

```typescript
router.onError((error) => {
  console.error('路由错误:', error)
  uni.showToast({
    title: '页面跳转失败',
    icon: 'none'
  })
})
```

## 📝 TypeScript 支持

### 类型定义

```typescript
import type { 
  Router, 
  RouteConfig, 
  NavigationGuard,
  RouteLocation 
} from 'uni-router-enhance'

// 扩展路由元信息类型
declare module 'uni-router-enhance' {
  interface RouteMeta {
    title?: string
    requiresAuth?: boolean
    permission?: string
    keepAlive?: boolean
  }
}
```

### 类型安全的路由跳转

```typescript
// 定义路由参数类型
type RouteParams = {
  home: never
  user: { id: string }
  detail: { id: string; type: 'post' | 'article' }
}

// 使用类型化的路由跳转
const push = <T extends keyof RouteParams>(
  name: T,
  ...args: RouteParams[T] extends never ? [] : [query: RouteParams[T]]
) => {
  router.push({ name, query: args[0] })
}

// 调用时会有类型检查
push('home') // ✅
push('user', { id: '123' }) // ✅
push('user') // ❌ 缺少参数
push('user', { id: 123 }) // ❌ 类型错误
```

## 🔍 常见问题

### Q: 如何在小程序中使用？

A: uni-router-enhance 完全兼容 uni-app 的各个平台，包括微信小程序、支付宝小程序等。只需按照正常流程安装和配置即可。

### Q: 是否支持路由懒加载？

A: uni-app 的页面本身就是按需加载的，uni-router-enhance 遵循 uni-app 的页面加载机制。

### Q: 如何处理路由参数？

A: 在目标页面的 onLoad 生命周期中可以接收参数：

```typescript
export default {
  onLoad(query: Record<string, string>) {
    console.log(query.id) // 获取参数
  }
}
```

### Q: 守卫中的 next() 必须调用吗？

A: 是的，必须调用 next() 来继续导航流程，否则导航会被阻塞。

## 🤝 贡献指南

欢迎贡献代码、提出问题和建议！

### 提交 Issue

- 搜索现有 Issue，避免重复
- 使用清晰的标题和详细的描述
- 如果是 bug，请提供复现步骤

### 提交 Pull Request

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 License

[MIT](LICENSE)

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者！
