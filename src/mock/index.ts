import Mock from 'mockjs';

// Set global mock timeout
Mock.setup({
  timeout: '200-600',
});

// 模拟登陆
Mock.mock(/\/(api\/)?login/, 'post', (options) => {
  const body = JSON.parse(options.body);
  if (body.username === 'admin' && body.password === '123456') {
    return {
      code: 200,
      message: 'success',
      data: {
        token: 'mock-token-123456',
      },
    };
  } else {
    return {
      code: 400,
      message: '用户名或密码错误',
    };
  }
});

// 模拟获取用户信息
Mock.mock(/\/(api\/)?getUserInfo/, 'get', () => {
  return {
    code: 200,
    message: 'success',
    data: {
      id: 1,
      username: 'admin',
      avatar: 'https://picsum.photos/seed/admin/32/32',
      roles: ['admin'],
      permissions: ['*:*:*'],
    },
  };
});

// 模拟获取路由列表
Mock.mock(/\/(api\/)?get(Routes|Routers)/, 'get', () => {
  return {
    code: 200,
    message: 'success',
    data: [
      {
            "path": "/leader",
            "title": "可视化大屏",
            "icon": "FundProjectionScreenOutlined",
            "component": "Leader/index",
            "keepAlive": true,
            "hidden": false
      },
      { 
        path: '/order', 
        title: '订单管理', 
        icon: 'ShoppingCartOutlined', 
        hidden: false,
        children: [
          { path: '/order/rent', title: '租赁订单', icon: 'FileTextOutlined', component: 'Order/rent/index', keepAlive: true,hidden: false },
          { path: '/order/log', title: '订单日志', icon: 'DashboardOutlined', component: 'Order/log/index', keepAlive: true,hidden: true },
        ] 
      },
      {
        path: '/system',
        title: '系统管理',
        icon: 'SettingOutlined',
        hidden: false,
        children: [
          { path: '/system/users', title: '用户管理', icon: 'TeamOutlined', component: 'UserManage/index', keepAlive: true,hidden: false },
          { path: '/system/users/:id', title: '用户详情', icon: 'UserOutlined', component: 'UserManage/index', keepAlive: false,hidden: false },
          { path: '/system/roles', title: '角色管理', icon: 'SafetyOutlined', component: 'RoleManage/index', keepAlive: false,hidden: false},
          { path: '/system/menus', title: '菜单管理', icon: 'AppstoreOutlined', component: 'MenuManage/index', keepAlive: true,hidden: false },
        ]
      },
      {
        path: '/monitor',
        title: '系统监控',
        icon: 'DesktopOutlined',
        hidden: false,
        children: [
          { path: '/monitor/logs', title: '系统日志', icon: 'FileTextOutlined', component: 'PlaceholderPage/index', keepAlive: true,hidden: false },
          { path: '/monitor/server', title: '服务器信息', icon: 'DashboardOutlined', component: 'PlaceholderPage/index', keepAlive: true,hidden: false },
        ]
      },
      {
        path: '/demo',
        title: '工具demo',
        icon: 'ProductOutlined',
        hidden: false,
        children: [
          { path: '/demo/map', title: '百度地图', icon: 'map-plus', component: 'Demo/BaiduMapDemo/index', keepAlive: true,hidden: false },
          { path: '/demo/edit', title: '富文本编辑器', icon: 'FileEdit', component: 'Demo/WangEditorDemo/index', keepAlive: true,hidden: false },
          { path: '/demo/upload', title: '图片上传', icon: 'UploadOutlined', component: 'Demo/OssUploadDemo/index', keepAlive: true,hidden: false },
        ]
      }
    ]
  };
});

// 模拟请求接口401
Mock.mock(/\/(api\/)?test401/, 'get', () => {
  return {
    code: 401,
    message: '无效的会话，或者会话已过期，请重新登录。',
  };
});

console.log('Mock.js initialized');
