import { useMemo, useState, useEffect } from 'react';
import { Layout } from 'antd';
import { matchPath, useLocation, useNavigate } from 'react-router-dom';
import { flattenRoutes, RouteConfig } from '../router/routes';
import { usePermissionStore } from "@/stores/permission"
import Sidebar from './Sidebar';
import Header from './Header';
import TagsView from './TagsView';
import NotFound from '@/pages/NotFound';

const { Content } = Layout;

// 最大缓存标签页数量（类似浏览器标签页上限）
const MAX_TABS = 10;

export default function KeepAliveLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const routes = usePermissionStore(state => state.routes);
  const tabs = usePermissionStore(state => state.tabs);
  const setTabs = usePermissionStore(state => state.setTabs);
  const setLastAccess = usePermissionStore(state => state.setLastAccess);
  const deleteLastAccess = usePermissionStore(state => state.deleteLastAccess);

  // 侧边栏折叠状态
  const [collapsed, setCollapsed] = useState(false);

  const [is404, setIs404] = useState(false);

  /**
   * 扁平化路由（把嵌套路由拍平成一维数组）
   * 方便后面快速匹配当前路由
   */
  
  const flatRoutes = useMemo(() => flattenRoutes(routes), [routes]);

  /**
   * 规范化路径
   * 作用：
   *   /user/  → /user
   * 避免因为结尾斜杠导致重复 tab
   */
  const normalizedPathname = useMemo(() => {
    const pathname = location.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      return pathname.slice(0, -1);
    }
    return pathname;
  }, [location.pathname]);

  /**
   * 根据当前路径匹配路由配置
   * 支持动态路由（如 /user/:id）
   */
  const currentRoute = useMemo(() => {
    const matches = flatRoutes
      .map(route => {
        // matchPath 支持动态路径匹配
        const matched = matchPath(
          { path: route.path, end: true },
          normalizedPathname
        );
        return matched ? route : null;
      })
      .filter((r): r is RouteConfig => Boolean(r));

    if (matches.length === 0) return undefined;

    // 如果匹配到多个，取“最具体”的（路径最长）
    matches.sort((a, b) => b.path.length - a.path.length);

    return matches[0];
  }, [flatRoutes, normalizedPathname]);

  /**
   * 核心逻辑：
   * 监听路由变化 → 管理 tabs（缓存页面）
   */
  useEffect(() => {

    console.log('location.pathname =>', location.pathname);
    console.log('currentRoute =>', currentRoute);
    if (currentRoute) {
      setIs404(false);
      setTabs(prev => {
        const tabKey = normalizedPathname;

        // 查找当前 tab 是否已经存在
        const existingIndex = prev.findIndex(t => t.path === tabKey);

        const next = [...prev];

        // 记录访问时间（用于 LRU）
        setLastAccess(tabKey, Date.now());

        // 如果不存在 → 新增 tab
        if (existingIndex === -1) {
          next.push({
            ...currentRoute,
            path: tabKey, // 用实际访问路径作为 key（支持动态路由）
          });
        }

        /**
         * 超出最大缓存数量 → 执行 LRU 淘汰
         * LRU = 最近最少使用
         */
        if (next.length > MAX_TABS) {
          // 不能删除当前激活的 tab
          const evictionCandidates = next.filter(t => t.path !== tabKey);

          if (evictionCandidates.length > 0) {
            const currentLastAccess = usePermissionStore.getState().lastAccess;
            let lruPath = evictionCandidates[0].path;
            let lruTime = currentLastAccess[lruPath] ?? 0;

            // 找最久未访问的 tab
            for (const t of evictionCandidates) {
              const time = currentLastAccess[t.path] ?? 0;
              if (time < lruTime) {
                lruTime = time;
                lruPath = t.path;
              }
            }

            // 删除缓存记录
            deleteLastAccess(lruPath);

            // 删除对应 tab
            return next.filter(t => t.path !== lruPath);
          }
        }

        return next;
      });
    } else if (location.pathname !== '/') {
      setIs404(true);
      console.log('未匹配到路由（非法路径）');
      /**
       * 未匹配到路由（非法路径）
       * 自动跳转首页
       */
      // navigate('/');
    }
  }, [currentRoute, location.pathname, navigate, normalizedPathname]);

  /**
   * 关闭标签页
   */
  const closeTab = (path: string) => {
    setTabs(prev => {
      const nextTabs = prev.filter(t => t.path !== path);

      deleteLastAccess(path);

      // 如果关闭的是当前页 → 自动跳到最后一个 tab 或首页
      if (normalizedPathname === path) {
        const lastTab = nextTabs[nextTabs.length - 1];
        navigate(lastTab ? lastTab.path : '/');
      }

      return nextTabs;
    });
  };

  if (is404) {
    return <NotFound />;
  }

  const isFullscreen = Boolean(currentRoute?.noLayout);

  return (
    <Layout className="h-screen overflow-hidden font-sans">
      {/* 左侧菜单 */}
      {!isFullscreen && <Sidebar collapsed={collapsed} />}

      <Layout className="flex flex-col min-w-0">
        {/* 顶部导航 */}
        {!isFullscreen && <Header collapsed={collapsed} setCollapsed={setCollapsed} />}

        {/* 标签页 */}
        {!isFullscreen && (
          <TagsView
            tabs={tabs}
            activePath={normalizedPathname}
            onClose={closeTab}
          />
        )}

        {/* 主内容区域 */}
        <Content className={isFullscreen ? "flex-1 overflow-hidden bg-white relative" : "flex-1 overflow-x-hidden overflow-y-auto bg-white p-4 relative"}>
          {tabs.map(tab => {
            const isActive = normalizedPathname === tab.path;

            if (!tab.keepAlive && !isActive) return null;

            return (
              <div
                key={tab.path}
                style={{
                  display: isActive ? 'block' : 'none',
                  height: '100%',
                }}
              >
                {tab.element}
              </div>
            );
          })}
        </Content>
      </Layout>
    </Layout>
  );
}