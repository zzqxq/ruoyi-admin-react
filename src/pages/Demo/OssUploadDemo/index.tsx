import React, { useState } from 'react';
import { Card, Form, Button, Divider, Space, Typography } from 'antd';
import OssUpload from '@/components/OssUpload';

const { Title, Paragraph } = Typography;

export default function OssUploadDemo() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = (values: any) => {
    setLoading(true);
    console.log('表单提交数据:', values);
    setTimeout(() => {
      setLoading(false);
      alert('提交数据已打印到控制台');
    }, 1000);
  };

  return (
    <div className="p-6">
      <Card title="图片上传组件示例" className="w-full">
        <Paragraph>
          基于 <code>ali-oss</code> 封装的上传组件，支持单图、多图、拖拽排序、图片类型限制、图片大小限制等功能。
        </Paragraph>
        
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            single: 'https://picsum.photos/200/200?random=6',
            multiple: [
              'https://picsum.photos/200/200?random=1',
              'https://picsum.photos/200/200?random=2',
            ]
          }}
        >
          <Title level={5}>1. 单图上传（限制 PNG/JPG + 最大 2MB）</Title>
          <Form.Item
            label="头像上传 (maxCount=1)"
            name="single"
          >
            <OssUpload
              maxCount={1}
              title="上传头像"
              maxSizeMB={2}
            />
          </Form.Item>

          <Divider />

          <Title level={5}>2. 多图上传 + 拖拽排序（限制 JPG + 最大 5MB）</Title>
          <Form.Item
            label="商品相册 (最多9张，可拖拽图片调整顺序)"
            name="multiple"
          >
            <OssUpload
              maxCount={9}
              sortable={true}
              title="上传相册"
              allowedTypes={['.jpg', '.jpeg']}
              maxSizeMB={5}
            />
          </Form.Item>

          <Divider />

          <Title level={5}>3. 多图上传 + 禁用拖拽（限制 PNG/JPG/GIF + 最大 0.01MB）</Title>
          <Form.Item
            label="资质证明 (最多3张，禁止拖拽)"
            name="certs"
          >
            <OssUpload
              maxCount={3}
              sortable={false}
              title="上传证明"
              allowedTypes={['image/jpeg', 'image/png', 'image/gif', '.jpg', '.jpeg', '.png', '.gif']}
              maxSizeMB={0.01}
            />
          </Form.Item>

          <Form.Item className="mt-8">
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                提交表单
              </Button>
              <Button onClick={() => form.resetFields()}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
