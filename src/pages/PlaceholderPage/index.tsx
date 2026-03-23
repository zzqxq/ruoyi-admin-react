import { useState } from 'react';
import { Card, Button, Result } from 'antd';

export default function PlaceholderPage() {
  const [count, setCount] = useState(0);

  return (
    <Card variant="borderless" className="shadow-sm min-h-100 flex items-center justify-center">
      <Result
        status="info"
        title="Page Under Construction"
        subTitle="This page is currently being built. Check back later!"
        extra={[
          <div key="test" className="mt-4 flex flex-col items-center gap-2">
            <span className="text-sm text-gray-500">Test Keep-Alive state:</span>
            <Button onClick={() => setCount(c => c + 1)}>Clicked {count} times</Button>
          </div>
        ]}
      />
    </Card>
  );
}
