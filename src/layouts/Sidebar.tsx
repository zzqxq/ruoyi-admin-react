import { useEffect, useState } from 'react';
import { Layout, Menu } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { RouteConfig } from '../router/routes';
import { usePermissionStore } from "@/stores/permission"

const { Sider } = Layout;

export default function Sidebar({ collapsed }: { collapsed: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const routes = usePermissionStore(state => state.routes);
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  const getMenuItems = (routesList: RouteConfig[]) => {
    return routesList
    .filter(route => !route.hidden)
    .map(route => {
      if (route.children && route.children.length > 0) {
        return {
          key: route.path,
          icon: route.icon,
          label: route.title,
          children: getMenuItems(route.children)
        };
      }
      return {
        key: route.path,
        icon: route.icon,
        label: route.title,
      };
    });
  };

  useEffect(() => {
    const pathParts = location.pathname.split('/').filter(i => i);
    if (pathParts.length > 1) {
      const parentPath = '/' + pathParts[0];
      if (!collapsed && !openKeys.includes(parentPath)) {
        setOpenKeys(prev => [...prev, parentPath]);
      }
    }
  }, [location.pathname, collapsed]);

  const onOpenChange = (keys: string[]) => {
    setOpenKeys(keys);
  };

  return (
    <Sider trigger={null} collapsible collapsed={collapsed} width={240} theme="light" className="border-r border-gray-200">
      <div className="h-16 flex items-center justify-center border-b border-gray-200 overflow-hidden whitespace-nowrap">
        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center shrink-0">
          <span className="text-white font-bold">R</span>
        </div>
        {!collapsed && <span className="text-gray-800 font-bold text-lg ml-2">React Admin</span>}
      </div>
      <Menu
        theme="light"
        mode="inline"
        selectedKeys={[location.pathname]}
        openKeys={collapsed ? undefined : openKeys}
        onOpenChange={onOpenChange}
        items={getMenuItems(routes)}
        onClick={({ key }) => navigate(key)}
        className="custom-scrollbar border-r-0"
        style={{ height: 'calc(100vh - 64px)', overflowY: 'auto' }}
      />
    </Sider>
  );
}
