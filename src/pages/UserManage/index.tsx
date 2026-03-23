import { useState } from 'react';
import { Card, Input, Button, Table, Tag, Space } from 'antd';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';

export default function UserManage() {
  const [searchText, setSearchText] = useState('');
  const [count, setCount] = useState(0);

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: 'Username', dataIndex: 'username', key: 'username' },
    { title: 'Role', dataIndex: 'role', key: 'role', render: (role: string) => <Tag color="blue">{role}</Tag> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => <Tag color={status === 'Active' ? 'green' : 'red'}>{status}</Tag> },
    { title: 'Action', key: 'action', render: () => (
      <Space size="middle">
        <a className="text-blue-600">Edit</a>
        <a className="text-red-600">Delete</a>
      </Space>
    )},
  ];

  const data = [
    { key: '1', id: '1', username: 'admin', role: 'Admin', status: 'Active' },
    { key: '2', id: '2', username: 'editor', role: 'Editor', status: 'Active' },
    { key: '3', id: '3', username: 'guest', role: 'Guest', status: 'Inactive' },
  ];

  return (
    <div className="space-y-4">
      <Card variant="borderless" className="shadow-sm">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4 items-center">
            <Input 
              placeholder="Search users..." 
              prefix={<SearchOutlined />} 
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="w-64"
            />
            <Button type="primary" icon={<SearchOutlined />}>Search</Button>
            <div className="ml-4 flex items-center gap-2">
              <span className="text-sm text-gray-500">Test Keep-Alive:</span>
              <Button onClick={() => setCount(c => c + 1)}>Count: {count}</Button>
            </div>
          </div>
          <Button type="primary" icon={<PlusOutlined />}>Add User</Button>
        </div>
      </Card>
      <Card variant="borderless" className="shadow-sm">
        <Table columns={columns} dataSource={data} />
      </Card>
    </div>
  );
}
