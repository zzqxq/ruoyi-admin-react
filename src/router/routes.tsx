import React from 'react';
import {
  DashboardOutlined,
  UserOutlined,
  SettingOutlined,
  AppstoreOutlined,
  SafetyOutlined,
  DesktopOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import Dashboard from '../pages/Dashboard';
import UserManage from '../pages/UserManage';
import RoleManage from '../pages/RoleManage';
import PlaceholderPage from '../pages/PlaceholderPage';
import Rent from '../pages/Order/rent';
import OrderLog from '../pages/Order/log';
import MenuManage from '../pages/MenuManage';

export interface RouteConfig {
  path: string;
  title: string;
  icon?: React.ReactNode;
  element?: React.ReactNode;
  keepAlive?: boolean;
  children?: RouteConfig[];
  hidden?: boolean;
  noLayout?: boolean;
}

// 静态路由
export const constantRoutes: RouteConfig[] = [
  { path: '/', title: '首页', icon: <DashboardOutlined />, element: <Dashboard />, keepAlive: true },
  // {
  //   path: '/system',
  //   title: '系统管理',
  //   icon: <SettingOutlined />,
  //   children: [
  //     { path: '/system/users', title: '用户管理', icon: <UserOutlined />, element: <UserManage />, keepAlive: true },
  //     { path: '/system/roles', title: '角色管理', icon: <SafetyOutlined />, element: <RoleManage />, keepAlive: false },
  //     { path: '/system/menus', title: '菜单管理', icon: <AppstoreOutlined />, element: <MenuManage />, keepAlive: true },
  //   ]
  // },
  // {
  //   path: '/monitor',
  //   title: '系统监控',
  //   icon: <DesktopOutlined />,
  //   children: [
  //     { path: '/monitor/logs', title: '系统日志', icon: <FileTextOutlined />, element: <PlaceholderPage />, keepAlive: true },
  //     { path: '/monitor/server', title: '服务器信息', icon: <DashboardOutlined />, element: <PlaceholderPage />, keepAlive: true },
  //   ]
  // },
  // {
  //   path: '/order',
  //   title: '租赁管理',
  //   icon: <FileTextOutlined />,
  //   children: [
  //     { path: '/order/rent', title: '租赁订单', icon: <FileTextOutlined />, element: <Rent />, keepAlive: true },
  //     { path: '/order/log', title: '订单日志', icon: <FileTextOutlined />, element: <OrderLog />, keepAlive: true },
  //   ]
  // }
];

// 扁平化路由
export const flattenRoutes = (routesList: RouteConfig[]): RouteConfig[] => {
  let flat: RouteConfig[] = [];
  routesList.forEach(route => {
    if (route.children) {
      flat = [...flat, ...flattenRoutes(route.children)];
    }
    if (route.element) {
      flat.push(route);
    }
  });
  return flat;
};
