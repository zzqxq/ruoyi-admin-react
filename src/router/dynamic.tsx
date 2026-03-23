import { useEffect, useRef, useState, lazy, Suspense } from "react"
import { useUserStore } from "@/stores/user"
import { usePermissionStore } from "@/stores/permission"
import { getUserInfo,getRouters } from "@/api"
import PageLoading from "@/components/PageLoading";
import { constantRoutes } from "./routes"


import type { RouteConfig } from "./routes"
// Import icons
import * as Icons from '@ant-design/icons';
import * as LucideIcons from 'lucide-react';

// 扫描所有 jsx 组件，并建立一个组件映射表
const modules = import.meta.glob('/src/pages/**/*.tsx')
console.log("modules ==>",modules);


const buildRoutes = (data: any[], parentPath?: string): RouteConfig[] => {
  return data.map(item => {
    const route: RouteConfig = {
      path: item.path,
      title: item.title || '',
      keepAlive: item.keepAlive || false,
      hidden: item.hidden,
    };
    if (item.icon) {
      const AntdIcon = (Icons as any)[item.icon];
      
      // 处理 Lucide 图标：尝试直接匹配或转换 kebab-case 为 PascalCase
      const lucideName = item.icon.includes('-') 
        ? item.icon.split('-').map((part: string) => part.charAt(0).toUpperCase() + part.slice(1)).join('')
        : item.icon;
      const LucideIcon = (LucideIcons as any)[lucideName] || (LucideIcons as any)[item.icon];

      if (AntdIcon) {
        route.icon = <AntdIcon />;
      } else if (LucideIcon) {
        route.icon = <LucideIcon size={16} />;
      }
    }
    // 后端约定：component === 'Layout' 代表菜单容器（不加载页面组件）
    if (item.component && item.component !== 'Layout') {
      const fullPath = `/src/pages/${item.component}.tsx`;
      const importFn = modules[fullPath];

      if (importFn) {
        // 1. 使用 lazy 包装异步导入函数
        // 注意：importFn 必须返回一个带有 default 导出的模块
        const DynamicComponent = lazy(importFn as any);

        // 2. 将组件包装在 Suspense 中并赋值给 element
        // 必须转为 <Component /> 这种 ReactNode 格式
        route.element = (
          <Suspense fallback={null}>
            <DynamicComponent />
          </Suspense>
        );
      } else {
        console.error(`未找到页面组件: ${fullPath}`);
      }
    }

    // 默认规则：顶层且无 children 的页面，视为不走 Layout（例如可视化大屏）
    if (!parentPath && route.element && (!item.children || item.children.length === 0)) {
      route.noLayout = true;
    }

    if (item.children) {
      route.children = buildRoutes(item.children, route.path);
    }
    return route;
  });
};

export const RouteProvider = ({ children }: { children: React.ReactNode }) => {
  const token = useUserStore(state => state.token)
  const userInfo = useUserStore(state => state.userInfo)
  const setUserInfo = useUserStore(state => state.setUserInfo)

  const setRoutes = usePermissionStore(state => state.setRoutes)

  const [loading, setLoading] = useState(true)

  // ❗ 防止 StrictMode 执行两次
  const hasInit = useRef(false)

  useEffect(() => {
    if (hasInit.current) return
    hasInit.current = true

    const init = async () => {
      try {
        // 1️⃣ 没 token 直接结束
        if (!token) {
          setLoading(false)
          return
        }
        let currentRoles = userInfo?.roles

        // 2️⃣ 没角色 → 获取用户信息
        if (!currentRoles || currentRoles.length === 0) {
          const userRes = await getUserInfo()
          const userInfo = userRes.data
          currentRoles = userInfo.roles || []
          setUserInfo(userInfo)
        }
        
        // 3️⃣ 有角色 → 获取动态路由
        if (currentRoles.length > 0) {
          const routeRes = await getRouters()
          // 合并静态路由和动态路由
          const routes = [...constantRoutes, ...buildRoutes(routeRes.data)]
          setRoutes(routes)
        }

      } catch (error) {
        console.error('初始化动态路由失败:', error)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [token])

  // 4️⃣ loading 状态（防止闪屏）
  if (loading) {
    return <PageLoading />;
  }

  return <>{children}</>
}