import { Button, Card, Row, Col, Space, Statistic } from 'antd';
import { UserOutlined, ShoppingCartOutlined, DollarOutlined, EyeOutlined } from '@ant-design/icons';


export default function Dashboard() {

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" className="shadow-sm">
            <Statistic title="Total Users" value={112893} prefix={<UserOutlined className="text-blue-500" />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" className="shadow-sm">
            <Statistic title="Total Sales" value={9280} prefix={<ShoppingCartOutlined className="text-green-500" />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" className="shadow-sm">
            <Statistic title="Revenue" value={112893} prefix={<DollarOutlined className="text-red-500" />} precision={2} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" className="shadow-sm">
            <Statistic title="Page Views" value={4728} prefix={<EyeOutlined className="text-purple-500" />} />
          </Card>
        </Col>
      </Row>
      <Card title="Recent Activity" variant="borderless" className="shadow-sm min-h-100">
        <p className="text-gray-500">No recent activity to display.</p>
      </Card>
    </div>
  );
}
