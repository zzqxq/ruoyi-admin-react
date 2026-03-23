import { Layout, Dropdown, Avatar, Badge, Breadcrumb } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SearchOutlined,
  BellOutlined,
  FullscreenOutlined,
  UserOutlined
} from '@ant-design/icons';
import { useLocation, matchPath, useNavigate,Link  } from 'react-router-dom';
import { RouteConfig } from '../router/routes';
import { useUserStore } from '@/stores/user.ts';
import { usePermissionStore } from '@/stores/permission'

const { Header: AntHeader } = Layout;

const findBreadcrumbs = (routes: RouteConfig[], pathname: string): RouteConfig[] => {
  for (const route of routes) {
    if (matchPath({ path: route.path, end: true }, pathname)) {
      return [route];
    }
    if (route.children) {
      const childBreadcrumbs = findBreadcrumbs(route.children, pathname);
      if (childBreadcrumbs.length > 0) {
        return [route, ...childBreadcrumbs];
      }
    }
  }
  return [];
};

export default function Header({ collapsed, setCollapsed }: { collapsed: boolean, setCollapsed: (c: boolean) => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const userStore = useUserStore();
  const routes = usePermissionStore(state => state.routes);

  const breadcrumbs = findBreadcrumbs(routes, location.pathname);
  
  const handleLogout = () => {
    userStore.logout();
    navigate('/login');
  };

  const userMenu = {
    items: [
      { key: 'profile', label: 'Profile' },
      { key: 'settings', label: 'Settings' },
      { type: 'divider' as const },
      { key: 'logout', label: 'Logout', danger: true,onClick: handleLogout },
    ]
  };

  return (
    <AntHeader 
      className="px-4 flex items-center justify-between shadow-sm z-10 h-16 leading-16 shrink-0" 
      style={{ background: '#fff',padding: '0 16px' }}
    >
      <div className="flex items-center gap-4">
        <span
          className="text-lg cursor-pointer hover:text-blue-500 transition-colors flex items-center"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </span>
        <Breadcrumb 
          className="hidden sm:block mt-1"
          items={[
              {
                title: <Link to="/">首页</Link>
              },
              ...breadcrumbs.filter(b => b.path !== '/').map(b => ({ title: b.title }))
            ]}
        />
      </div>
      
      <div className="flex items-center gap-4">
        <SearchOutlined className="text-lg cursor-pointer hover:text-blue-500 hidden sm:block" />
        <FullscreenOutlined className="text-lg cursor-pointer hover:text-blue-500 hidden sm:block" />
        <Badge dot offset={[-4, 4]}>
          <BellOutlined className="text-lg cursor-pointer hover:text-blue-500" />
        </Badge>
        <Dropdown menu={userMenu} placement="bottomRight">
          <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 rounded transition-colors h-10 mt-2">
            <Avatar size="small" icon={<UserOutlined />} src="https://picsum.photos/seed/admin/32/32" />
            <span className="text-sm font-medium hidden sm:block leading-none">Admin</span>
          </div>
        </Dropdown>
      </div>
    </AntHeader>
  );
}
