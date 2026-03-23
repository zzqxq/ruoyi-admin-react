import { type Key, useMemo, useState } from 'react';
import { Button, DatePicker, Form, Image, Input, Modal, Select, Space, Table, Tag, Upload, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import {
  SearchOutlined,
  PlusOutlined,
  ReloadOutlined,
  DownOutlined,
  UpOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

export default function Rent() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [expanded, setExpanded] = useState(false);
  const [modalForm] = Form.useForm();

  const storeOptions = useMemo(
    () => [
      { label: '深圳南山店', value: 'store_001' },
      { label: '深圳福田店', value: 'store_002' },
      { label: '广州天河店', value: 'store_003' },
    ],
    []
  );

  const storeMap = useMemo(() => {
    const m = new Map<string, string>();
    storeOptions.forEach(s => m.set(s.value, s.label));
    return m;
  }, [storeOptions]);

  const batteryTypeOptions = useMemo(
    () => [
      { label: '锂电 48V', value: 'LITHIUM_48V' },
      { label: '锂电 60V', value: 'LITHIUM_60V' },
      { label: '铅酸 48V', value: 'LEAD_ACID_48V' },
    ],
    []
  );

  type OrderRow = {
    orderNo: string;
    userId: string;
    userName: string;
    userPhone: string;
    storeId: string;
    storeContactName: string;
    storeContactPhone: string;
    guideName: string;
    guidePhone: string;
    referrerName: string;
    referrerPhone: string;
    batteryId: string;
    batteryType: string;
    rentStartAt: number;
    rentEndAt: number;
    freeDeposit: boolean;
    freeDepositProof?: string;
    status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
    createdAt: number;
  };

  const gotoOrderLog = (orderNo: string) => {
    navigate(`/order/log?orderNo=${encodeURIComponent(orderNo)}`);
  };

  const generateMockOrders = useMemo(() => {
    const now = Date.now();
    const freeDepositProofUrl =
      'https://sygx-server-bucket-admin.oss-cn-shanghai.aliyuncs.com/quill-images/1766023101482d71b514926463d5670206a2ce0612e7c.jpg';
    const phoneSeed = ['138', '139', '156', '158', '177', '188'];
    const names = ['张三', '李四', '王五', '赵六', '孙七', '周八', '吴九', '郑十'];
    const contacts = ['陈店长', '刘经理', '何主管', '唐客服'];
    const guides = ['小张', '小李', '小王', '小赵'];
    const referrers = ['老客户A', '老客户B', '骑手C', '朋友D'];
    const statuses: OrderRow['status'][] = ['ACTIVE', 'EXPIRED', 'CANCELLED'];

    const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const pick = <T,>(arr: T[]) => arr[rand(0, arr.length - 1)];
    const randPhone = () => `${pick(phoneSeed)}${rand(1000, 9999)}${rand(1000, 9999)}`;
    const randOrderNo = (i: number) => `R${dayjs(now).format('YYYYMMDD')}${String(i + 1).padStart(4, '0')}`;
    const buildFreeDepositProof = (orderNo: string) => {
      void orderNo;
      return freeDepositProofUrl;
    };

    return () =>
      Array.from({ length: 57 }).map((_, i) => {
        const createdAt = now - rand(0, 60) * 24 * 3600 * 1000;
        const rentStartAt = createdAt + rand(0, 5) * 24 * 3600 * 1000;
        const rentEndAt = rentStartAt + rand(7, 90) * 24 * 3600 * 1000;
        const storeId = pick(storeOptions).value;
        const userName = pick(names);
        const freeDeposit = Math.random() > 0.7;
        const orderNo = randOrderNo(i);

        return {
          orderNo,
          userId: String(rand(10000, 99999)),
          userName,
          userPhone: randPhone(),
          storeId,
          storeContactName: pick(contacts),
          storeContactPhone: randPhone(),
          guideName: pick(guides),
          guidePhone: randPhone(),
          referrerName: pick(referrers),
          referrerPhone: randPhone(),
          batteryId: `BAT-${rand(100000, 999999)}`,
          batteryType: pick(batteryTypeOptions).value,
          rentStartAt,
          rentEndAt,
          freeDeposit,
          freeDepositProof: freeDeposit ? buildFreeDepositProof(orderNo) : undefined,
          status: pick(statuses),
          createdAt,
        } satisfies OrderRow;
      });
  }, [batteryTypeOptions, storeOptions]);

  const [data, setData] = useState<OrderRow[]>(() => generateMockOrders());

  type QueryState = {
    userPhone?: string;
    userName?: string;
    storeId?: string;
    storeContactName?: string;
    storeContactPhone?: string;
    guideName?: string;
    guidePhone?: string;
    referrerName?: string;
    referrerPhone?: string;
    batteryId?: string;
    rentStartRange?: [number, number];
    rentEndRange?: [number, number];
    freeDeposit?: boolean;
    batteryType?: string;
  };

  const [query, setQuery] = useState<QueryState>({});
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [editingOrderNo, setEditingOrderNo] = useState<string | null>(null);

  const [proofOpen, setProofOpen] = useState(false);
  const [proofOrderNo, setProofOrderNo] = useState<string>('');
  const [proofSrc, setProofSrc] = useState<string>('');

  const filteredData = useMemo(() => {
    const includes = (a: string, b?: string) => {
      if (!b) return true;
      return a.toLowerCase().includes(b.trim().toLowerCase());
    };

    return data.filter(row => {
      if (query.storeId && row.storeId !== query.storeId) return false;
      if (query.batteryType && row.batteryType !== query.batteryType) return false;
      if (typeof query.freeDeposit === 'boolean' && row.freeDeposit !== query.freeDeposit) return false;

      if (!includes(row.userPhone, query.userPhone)) return false;
      if (!includes(row.userName, query.userName)) return false;
      if (!includes(row.storeContactName, query.storeContactName)) return false;
      if (!includes(row.storeContactPhone, query.storeContactPhone)) return false;
      if (!includes(row.guideName, query.guideName)) return false;
      if (!includes(row.guidePhone, query.guidePhone)) return false;
      if (!includes(row.referrerName, query.referrerName)) return false;
      if (!includes(row.referrerPhone, query.referrerPhone)) return false;
      if (!includes(row.batteryId, query.batteryId)) return false;

      if (query.rentStartRange) {
        const [start, end] = query.rentStartRange;
        if (row.rentStartAt < start || row.rentStartAt > end) return false;
      }
      if (query.rentEndRange) {
        const [start, end] = query.rentEndRange;
        if (row.rentEndAt < start || row.rentEndAt > end) return false;
      }

      return true;
    });
  }, [data, query]);

  const openAdd = () => {
    setModalMode('add');
    setEditingOrderNo(null);
    modalForm.resetFields();
    modalForm.setFieldsValue({
      freeDeposit: false,
      status: 'ACTIVE',
      rentStartAt: dayjs(),
      rentEndAt: dayjs().add(30, 'day'),
    });
    setModalOpen(true);
  };

  const openView = (row: OrderRow) => {
    setModalMode('view');
    setEditingOrderNo(row.orderNo);
    modalForm.setFieldsValue({
      ...row,
      rentStartAt: dayjs(row.rentStartAt),
      rentEndAt: dayjs(row.rentEndAt),
    });
    setModalOpen(true);
  };

  const openEdit = (row: OrderRow) => {
    setModalMode('edit');
    setEditingOrderNo(row.orderNo);
    modalForm.setFieldsValue({
      ...row,
      rentStartAt: dayjs(row.rentStartAt),
      rentEndAt: dayjs(row.rentEndAt),
    });
    setModalOpen(true);
  };

  const openFreeDepositProof = (row: OrderRow) => {
    setProofOrderNo(row.orderNo);
    setProofSrc(row.freeDepositProof ?? '');
    setProofOpen(true);
  };

  const deleteByOrderNos = (orderNos: string[]) => {
    if (orderNos.length === 0) return;
    Modal.confirm({
      title: '确认删除？',
      content: `将删除 ${orderNos.length} 条记录`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        setData(prev => prev.filter(r => !orderNos.includes(r.orderNo)));
        setSelectedRowKeys([]);
        message.success('删除成功');
      },
    });
  };

  const onToolbarEdit = () => {
    if (selectedRowKeys.length !== 1) return;
    const row = data.find(r => r.orderNo === String(selectedRowKeys[0]));
    if (row) openEdit(row);
  };

  const onToolbarDelete = () => {
    const keys = selectedRowKeys.map(k => String(k));
    deleteByOrderNos(keys);
  };

  const exportCsv = () => {
    const headers = [
      'orderNo',
      'userId',
      'userName',
      'userPhone',
      'storeId',
      'storeContactName',
      'storeContactPhone',
      'guideName',
      'guidePhone',
      'referrerName',
      'referrerPhone',
      'batteryId',
      'batteryType',
      'rentStartAt',
      'rentEndAt',
      'freeDeposit',
      'status',
      'createdAt',
    ] as const;

    const esc = (v: unknown) => {
      const s = String(v ?? '');
      const safe = s.replace(/"/g, '""');
      return `"${safe}"`;
    };

    const lines = [headers.join(',')].concat(
      filteredData.map(row =>
        headers
          .map(h => {
            const val = (row as any)[h];
            return esc(val);
          })
          .join(',')
      )
    );

    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rent_orders_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const columns = useMemo<ColumnsType<OrderRow>>(
    () => [
      {
        title: '订单编号',
        dataIndex: 'orderNo',
        key: 'orderNo',
        width: 160,
        fixed: 'left' as const,
        render: (v: string) => (
          <Button type="link" size="small" onClick={() => gotoOrderLog(v)}>
            {v}
          </Button>
        ),
      },
      { title: '下单人ID', dataIndex: 'userId', key: 'userId', width: 110 },
      { title: '姓名', dataIndex: 'userName', key: 'userName', width: 100 },
      { title: '手机号', dataIndex: 'userPhone', key: 'userPhone', width: 130 },
      {
        title: '门店',
        dataIndex: 'storeId',
        key: 'storeId',
        width: 120,
        render: (v: string) => storeMap.get(v) ?? v,
      },
      { title: '门店联系人', dataIndex: 'storeContactName', key: 'storeContactName', width: 110 },
      { title: '联系人手机号', dataIndex: 'storeContactPhone', key: 'storeContactPhone', width: 130 },
      { title: '导购员', dataIndex: 'guideName', key: 'guideName', width: 90 },
      { title: '导购员手机号', dataIndex: 'guidePhone', key: 'guidePhone', width: 130 },
      { title: '推荐人', dataIndex: 'referrerName', key: 'referrerName', width: 100 },
      { title: '推荐人手机号', dataIndex: 'referrerPhone', key: 'referrerPhone', width: 130 },
      { title: '当前电池ID', dataIndex: 'batteryId', key: 'batteryId', width: 140 },
      {
        title: '电池类型',
        dataIndex: 'batteryType',
        key: 'batteryType',
        width: 120,
        render: (v: string) => {
          const hit = batteryTypeOptions.find(x => x.value === v);
          return hit?.label ?? v;
        },
      },
      {
        title: '起租时间',
        dataIndex: 'rentStartAt',
        key: 'rentStartAt',
        width: 120,
        render: (v: number) => new Date(v).toLocaleDateString(),
      },
      {
        title: '到期时间',
        dataIndex: 'rentEndAt',
        key: 'rentEndAt',
        width: 120,
        render: (v: number) => new Date(v).toLocaleDateString(),
      },
      {
        title: '免押',
        dataIndex: 'freeDeposit',
        key: 'freeDeposit',
        width: 80,
        render: (v: boolean) => (v ? <Tag color="green">是</Tag> : <Tag>否</Tag>),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 90,
        render: (v: OrderRow['status']) => {
          const color = v === 'ACTIVE' ? 'blue' : v === 'EXPIRED' ? 'orange' : 'red';
          const text = v === 'ACTIVE' ? '进行中' : v === 'EXPIRED' ? '已到期' : '已取消';
          return <Tag color={color}>{text}</Tag>;
        },
      },
      {
        title: '操作',
        key: 'actions',
        width: 160,
        fixed: 'right',
        align: 'center',
        render: (_, row) => (
          <div className="flex justify-center">
            <Space size={4} orientation="vertical" align="center">
              {row.freeDeposit ? (
                <Button type="link" size="small" onClick={() => openFreeDepositProof(row)}>
                  免押详情
                </Button>
              ) : null}
              <Button type="link" size="small" onClick={() => openView(row)}>
                查看
              </Button>
              <Button type="link" size="small" onClick={() => openEdit(row)}>
                编辑
              </Button>
              <Button type="link" size="small" danger onClick={() => deleteByOrderNos([row.orderNo])}>
                删除
              </Button>
            </Space>
          </div>
        ),
      },
    ],
    [batteryTypeOptions, deleteByOrderNos, gotoOrderLog, openEdit, openFreeDepositProof, openView, storeMap]
  );

  const onSearch = async () => {
    const values = await form.validateFields();

    const toRange = (range?: [any, any]) => {
      if (!range?.[0] || !range?.[1]) return undefined;
      const start = range[0].startOf('day').valueOf();
      const end = range[1].endOf('day').valueOf();
      return [start, end] as [number, number];
    };

    setQuery({
      userPhone: values.userPhone,
      userName: values.userName,
      storeId: values.storeId,
      storeContactName: values.storeContactName,
      storeContactPhone: values.storeContactPhone,
      guideName: values.guideName,
      guidePhone: values.guidePhone,
      referrerName: values.referrerName,
      referrerPhone: values.referrerPhone,
      batteryId: values.batteryId,
      rentStartRange: toRange(values.rentStartRange),
      rentEndRange: toRange(values.rentEndRange),
      freeDeposit: typeof values.freeDeposit === 'boolean' ? values.freeDeposit : undefined,
      batteryType: values.batteryType,
    });
    setPagination(p => ({ ...p, current: 1 }));
  };

  const onReset = () => {
    form.resetFields();
    setQuery({});
    setPagination(p => ({ ...p, current: 1 }));
    setSelectedRowKeys([]);
  };

  const canEdit = selectedRowKeys.length === 1;
  const canDelete = selectedRowKeys.length > 0;

  return (
    <div className="space-y-4">
      <div >
        <Form form={form} layout="vertical">
          <div className="flex gap-4">
            <div className="flex-1 min-w-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Form.Item name="userPhone">
                  <Input placeholder="手机号" allowClear />
                </Form.Item>
                <Form.Item name="userName">
                  <Input placeholder="姓名" allowClear />
                </Form.Item>
                <Form.Item name="storeId">
                  <Select placeholder="选择门店" options={storeOptions} allowClear />
                </Form.Item>
                <Form.Item name="batteryId">
                  <Input placeholder="当前电池ID" allowClear />
                </Form.Item>
              </div>

              {expanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Form.Item name="storeContactName">
                    <Input placeholder="门店联系人" allowClear />
                  </Form.Item>

                  <Form.Item name="storeContactPhone">
                    <Input placeholder="门店联系人手机号" allowClear />
                  </Form.Item>
                  <Form.Item name="guideName">
                    <Input placeholder="导购员" allowClear />
                  </Form.Item>
                  <Form.Item name="guidePhone">
                    <Input placeholder="导购员手机号" allowClear />
                  </Form.Item>
                  <Form.Item name="referrerName">
                    <Input placeholder="推荐人" allowClear />
                  </Form.Item>

                  <Form.Item name="referrerPhone">
                    <Input placeholder="推荐人手机号" allowClear />
                  </Form.Item>
                  <Form.Item name="rentStartRange">
                    <DatePicker.RangePicker className="w-full" placeholder={['起租开始', '起租结束']} />
                  </Form.Item>
                  <Form.Item name="rentEndRange">
                    <DatePicker.RangePicker className="w-full" placeholder={['到期开始', '到期结束']} />
                  </Form.Item>

                  <Form.Item name="freeDeposit">
                    <Select
                      placeholder="是否免押"
                      allowClear
                      options={[
                        { label: '是', value: true },
                        { label: '否', value: false },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item name="batteryType">
                    <Select placeholder="电池类型" allowClear options={batteryTypeOptions} />
                  </Form.Item>
                </div>
              )}
            </div>

            <div className="shrink-0 w-50">
              <div className="flex justify-end">
                <Space>
                  <Button type="primary" icon={<SearchOutlined />} onClick={onSearch}>
                    查询
                  </Button>
                  <Button icon={<ReloadOutlined />} onClick={onReset}>
                    重置
                  </Button>
                </Space>
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-2">
            <Button
              type="link"
              onClick={() => setExpanded(v => !v)}
              icon={expanded ? <UpOutlined /> : <DownOutlined />}
            >
              {expanded ? '收起' : '展开'}
            </Button>
          </div>
        </Form>
      </div>

      <div >
        <div className="flex items-center gap-4 mb-3">
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
              新增
            </Button>
            <Button icon={<EditOutlined />} disabled={!canEdit} onClick={onToolbarEdit}>
              修改
            </Button>
            <Button danger icon={<DeleteOutlined />} disabled={!canDelete} onClick={onToolbarDelete}>
              删除
            </Button>
            <Upload
              accept=".csv,.xlsx,.xls"
              showUploadList={false}
              beforeUpload={(file) => {
                message.info(`已选择文件：${file.name}（当前为模拟导入）`);
                return false;
              }}
            >
              <Button icon={<UploadOutlined />}>导入</Button>
            </Upload>
            <Button icon={<DownloadOutlined />} onClick={exportCsv}>
              导出
            </Button>
          </Space>
        </div>
        <Table<OrderRow>
          rowKey="orderNo"
          columns={columns}
          dataSource={filteredData}
          scroll={{ x: 1760 }}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: filteredData.length,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) => `共 ${total} 条，当前 ${range[0]}-${range[1]} 条`,
          }}
          onChange={(p) => {
            setPagination({
              current: p.current ?? 1,
              pageSize: p.pageSize ?? 10,
            });
          }}
        />
      </div>

      <Modal
        open={modalOpen}
        title={modalMode === 'add' ? '新增订单' : modalMode === 'edit' ? '编辑订单' : '查看订单'}
        okText={modalMode === 'view' ? '关闭' : '保存'}
        cancelText="取消"
        onCancel={() => setModalOpen(false)}
        onOk={async () => {
          if (modalMode === 'view') {
            setModalOpen(false);
            return;
          }

          const values = await modalForm.validateFields();
          const rentStartAt = values.rentStartAt?.valueOf?.() ?? Date.now();
          const rentEndAt = values.rentEndAt?.valueOf?.() ?? Date.now();

          if (modalMode === 'add') {
            const now = Date.now();
            const orderNo = `R${new Date(now).getFullYear()}${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`;
            const row: OrderRow = {
              orderNo,
              userId: values.userId ?? `U${String(Math.floor(Math.random() * 90000) + 10000)}`,
              userName: values.userName ?? '',
              userPhone: values.userPhone ?? '',
              storeId: values.storeId ?? storeOptions[0]?.value ?? 'store_001',
              storeContactName: values.storeContactName ?? '',
              storeContactPhone: values.storeContactPhone ?? '',
              guideName: values.guideName ?? '',
              guidePhone: values.guidePhone ?? '',
              referrerName: values.referrerName ?? '',
              referrerPhone: values.referrerPhone ?? '',
              batteryId: values.batteryId ?? '',
              batteryType: values.batteryType ?? batteryTypeOptions[0]?.value ?? 'LITHIUM_48V',
              rentStartAt,
              rentEndAt,
              freeDeposit: Boolean(values.freeDeposit),
              status: values.status ?? 'ACTIVE',
              createdAt: now,
            };
            setData(prev => [row, ...prev]);
            message.success('新增成功');
          }

          if (modalMode === 'edit' && editingOrderNo) {
            setData(prev =>
              prev.map(r => {
                if (r.orderNo !== editingOrderNo) return r;
                return {
                  ...r,
                  userId: values.userId ?? r.userId,
                  userName: values.userName ?? r.userName,
                  userPhone: values.userPhone ?? r.userPhone,
                  storeId: values.storeId ?? r.storeId,
                  storeContactName: values.storeContactName ?? r.storeContactName,
                  storeContactPhone: values.storeContactPhone ?? r.storeContactPhone,
                  guideName: values.guideName ?? r.guideName,
                  guidePhone: values.guidePhone ?? r.guidePhone,
                  referrerName: values.referrerName ?? r.referrerName,
                  referrerPhone: values.referrerPhone ?? r.referrerPhone,
                  batteryId: values.batteryId ?? r.batteryId,
                  batteryType: values.batteryType ?? r.batteryType,
                  rentStartAt,
                  rentEndAt,
                  freeDeposit: typeof values.freeDeposit === 'boolean' ? values.freeDeposit : r.freeDeposit,
                  status: values.status ?? r.status,
                };
              })
            );
            message.success('保存成功');
          }

          setModalOpen(false);
        }}
        destroyOnHidden
      >
        <Form form={modalForm} layout="vertical" disabled={modalMode === 'view'}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item name="orderNo" label="订单编号">
              <Input disabled placeholder="自动生成" />
            </Form.Item>
            <Form.Item name="userId" label="下单人ID">
              <Input placeholder="下单人ID" />
            </Form.Item>
            <Form.Item name="userName" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
              <Input placeholder="姓名" />
            </Form.Item>
            <Form.Item name="userPhone" label="手机号" rules={[{ required: true, message: '请输入手机号' }]}>
              <Input placeholder="手机号" />
            </Form.Item>
            <Form.Item name="storeId" label="门店" rules={[{ required: true, message: '请选择门店' }]}>
              <Select options={storeOptions} placeholder="选择门店" />
            </Form.Item>
            <Form.Item name="batteryId" label="电池ID">
              <Input placeholder="电池ID" />
            </Form.Item>
            <Form.Item name="batteryType" label="电池类型" rules={[{ required: true, message: '请选择电池类型' }]}>
              <Select options={batteryTypeOptions} placeholder="电池类型" />
            </Form.Item>
            <Form.Item name="freeDeposit" label="是否免押">
              <Select
                placeholder="是否免押"
                options={[
                  { label: '是', value: true },
                  { label: '否', value: false },
                ]}
              />
            </Form.Item>
            <Form.Item name="status" label="状态">
              <Select
                placeholder="状态"
                options={[
                  { label: '进行中', value: 'ACTIVE' },
                  { label: '已到期', value: 'EXPIRED' },
                  { label: '已取消', value: 'CANCELLED' },
                ]}
              />
            </Form.Item>
            <Form.Item name="rentStartAt" label="起租时间" rules={[{ required: true, message: '请选择起租时间' }]}>
              <DatePicker className="w-full" />
            </Form.Item>
            <Form.Item name="rentEndAt" label="到期时间" rules={[{ required: true, message: '请选择到期时间' }]}>
              <DatePicker className="w-full" />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal
        open={proofOpen}
        title={proofOrderNo ? `免押详情 - ${proofOrderNo}` : '免押详情'}
        footer={null}
        onCancel={() => setProofOpen(false)}
        destroyOnHidden
      >
        {proofSrc ? (
          <Image src={proofSrc} alt="免押操作截图" style={{ width: '100%' }} />
        ) : (
          <div className="text-center text-gray-500">暂无免押操作截图</div>
        )}
      </Modal>
    </div>
  );
}
