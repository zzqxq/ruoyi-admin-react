import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserStore } from '@/stores/user.ts';
import { login } from '@/api';

const { Title } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const userStore = useUserStore();

  useEffect(() => {
  if (userStore.token) {
    navigate('/', { replace: true });
  }
}, [userStore.token, navigate]);

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const res = await login(values);
      userStore.login(res.data.token);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md shadow-lg rounded-xl overflow-hidden border-0">
        <div className="text-center mb-8 mt-4">
          <Title level={2} className="m-0 text-gray-800">Welcome Back</Title>
          <p className="text-gray-500 mt-2">Please sign in to continue</p>
        </div>

        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={handleLogin}
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Please input your Username!' }]}
          >
            <Input prefix={<UserOutlined className="text-gray-400" />} placeholder="Username (admin or editor)" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your Password!' }]}
          >
            <Input.Password prefix={<LockOutlined className="text-gray-400" />} placeholder="Password (123456)" />
          </Form.Item>

          <Form.Item className="mt-6 mb-2">
            <Button type="primary" htmlType="submit" className="w-full" loading={loading}>
              Sign In
            </Button>
          </Form.Item>
          
          <div className="text-center text-gray-400 text-sm mt-4">
            <p>Admin: admin / 123456</p>
            <p>Editor: editor / 123456</p>
          </div>
        </Form>
      </Card>
    </div>
  );
}
