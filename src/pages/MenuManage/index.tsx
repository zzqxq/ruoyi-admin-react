import { Button, Card, Space } from 'antd';

export default function MenuManage() {

  return (
    <div className="space-y-4">
      <Card title="Menu Management" variant="borderless" className="shadow-sm">
        <div className="space-y-3">
          <div>
            <div className="text-gray-500 text-sm">计数器（Zustand 全局 store）</div>
            <div className="font-medium text-2xl">0</div>
          </div>

          <Space wrap>
            <Button type="primary">
              +1
            </Button>
            <Button>
              -1
            </Button>
            <Button>
              重置
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
}
