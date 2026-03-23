import { useMemo } from 'react';
import { Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useLocation } from 'react-router-dom';

type LogType = 'SWAP' | 'PICK' | 'STORE' | 'RETURN';

type OrderLogRow = {
  id: string;
  orderNo: string;
  type: LogType;
  time: number;
  storeName: string;
  batteryId: string;
  operator: string;
  remark: string;
};

export default function OrderLog() {
  const location = useLocation();

  const orderNo = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('orderNo') ?? '';
  }, [location.search]);

  const data = useMemo<OrderLogRow[]>(() => {
    const now = Date.now();
    const storeNames = ['深圳南山店', '深圳福田店', '广州天河店'];
    const operators = ['系统', '店员A', '店员B', '自助柜'];
    const types: LogType[] = ['PICK', 'SWAP', 'STORE', 'RETURN'];

    const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const pick = <T,>(arr: T[]) => arr[rand(0, arr.length - 1)];

    const count = orderNo ? rand(6, 18) : 0;
    const baseTime = now - rand(1, 30) * 24 * 3600 * 1000;

    return Array.from({ length: count }).map((_, i) => {
      const type = pick(types);
      const time = baseTime + i * rand(2, 24) * 3600 * 1000;
      const batteryId = `BAT-${rand(100000, 999999)}`;

      const remark =
        type === 'PICK'
          ? '取电成功'
          : type === 'SWAP'
            ? '换电成功'
            : type === 'STORE'
              ? '电池寄存'
              : '退电完成';

      return {
        id: `${orderNo || 'unknown'}_${i}_${time}`,
        orderNo: orderNo || '-',
        type,
        time,
        storeName: pick(storeNames),
        batteryId,
        operator: pick(operators),
        remark,
      };
    });
  }, [orderNo]);

  const columns = useMemo<ColumnsType<OrderLogRow>>(
    () => [
      { title: '订单编号', dataIndex: 'orderNo', key: 'orderNo', width: 180, fixed: 'left' },
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        width: 100,
        render: (v: LogType) => {
          const map: Record<LogType, { text: string; color: string }> = {
            PICK: { text: '取电', color: 'blue' },
            SWAP: { text: '换电', color: 'green' },
            STORE: { text: '寄存', color: 'orange' },
            RETURN: { text: '退电', color: 'red' },
          };
          return <Tag color={map[v].color}>{map[v].text}</Tag>;
        },
      },
      {
        title: '时间',
        dataIndex: 'time',
        key: 'time',
        width: 170,
        render: (v: number) => new Date(v).toLocaleString(),
      },
      { title: '门店', dataIndex: 'storeName', key: 'storeName', width: 140 },
      { title: '电池ID', dataIndex: 'batteryId', key: 'batteryId', width: 140 },
      { title: '操作人', dataIndex: 'operator', key: 'operator', width: 120 },
      { title: '备注', dataIndex: 'remark', key: 'remark', width: 220 },
    ],
    []
  );

  return (
    <div className="bg-white p-4">
      <Table<OrderLogRow>
        rowKey="id"
        columns={columns}
        dataSource={data}
        scroll={{ x: 1100 }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `共 ${total} 条，当前 ${range[0]}-${range[1]} 条`,
        }}
      />
    </div>
  );
}
