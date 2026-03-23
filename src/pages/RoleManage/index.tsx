import { useState } from 'react';
import { Card, Input, Button, Table, Tag, Space } from 'antd';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';

export default function RoleManage() {
  const [count, setCount] = useState(0);

  const columns = [
    { title: 'Role Name', dataIndex: 'name', key: 'name' },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Permissions', dataIndex: 'permissions', key: 'permissions', render: (perms: string[]) => (
      <>
        {perms.map(p => <Tag key={p} color="cyan">{p}</Tag>)}
      </>
    )},
    { title: 'Action', key: 'action', render: () => (
      <Space size="middle">
        <a className="text-blue-600">Edit</a>
        <a className="text-red-600">Delete</a>
      </Space>
    )},
  ];

  const data = [
    { key: '1', name: 'Admin', description: 'Full access to all features', permissions: ['all'] },
    { key: '2', name: 'Editor', description: 'Can edit content', permissions: ['read', 'write'] },
    { key: '3', name: 'Viewer', description: 'Read-only access', permissions: ['read'] },
  ];

  return (
    <div className="space-y-4">
      <Card variant="borderless" className="shadow-sm">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4 items-center">
            <Input placeholder="Search roles..." prefix={<SearchOutlined />} className="w-64" />
            <Button type="primary" icon={<SearchOutlined />}>Search</Button>
            <div className="ml-4 flex items-center gap-2">
              <span className="text-sm text-gray-500">Test No Keep-Alive:</span>
              <Button onClick={() => setCount(c => c + 1)}>Count: {count}</Button>
            </div>
          </div>
          <Button type="primary" icon={<PlusOutlined />}>Add Role</Button>
        </div>
      </Card>
      <Card variant="borderless" className="shadow-sm">
        <Table columns={columns} dataSource={data} />
      </Card>
    </div>
  );
}
