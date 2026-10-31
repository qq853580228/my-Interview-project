import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Button, Card, Empty, List, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EVENT_ALARM_REPORT, EVENT_PRODUCT_OFFLINE, EVENT_PRODUCT_ONLINE, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, PERM } from '../shared/contract'
import type { OrderStatus, ProductShelfPayload } from '../shared/contract'
import { hasPerm, useGlobal } from '../shared/globalStore'
import type { Order } from '../shared/mockDb'
import { loadOrders, onDbChange } from '../shared/mockDb'

interface LogItem {
  time: string
  text: string
}

function fmtTime(t: number): string {
  return new Date(t).toLocaleTimeString()
}

export default function OrderList() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const { bus } = useGlobal()
  const [orders, setOrders] = useState<Order[]>(() => loadOrders())
  const [logs, setLogs] = useState<LogItem[]>([])

  useEffect(() => {
    const refresh = () => setOrders(loadOrders())
    const pushLog = (text: string) => {
      setLogs((prev) => [{ time: fmtTime(Date.now()), text }, ...prev].slice(0, 10))
    }
    const offProductOffline = bus.on(EVENT_PRODUCT_OFFLINE, (p) => {
      const payload = p as ProductShelfPayload
      pushLog(`收到商品下架事件：「${payload.productName}」已禁止生成新订单`)
      refresh()
    })
    const offProductOnline = bus.on(EVENT_PRODUCT_ONLINE, (p) => {
      const payload = p as ProductShelfPayload
      pushLog(`收到商品上架事件：「${payload.productName}」已恢复可下单`)
      refresh()
    })
    const offDb = onDbChange(refresh)
    return () => {
      offProductOffline()
      offProductOnline()
      offDb()
    }
  }, [bus])

  const emitAlarm = () => {
    bus.emit(EVENT_ALARM_REPORT, {
      level: 'error',
      source: 'react-sub',
      title: '退款通道异常',
      message: '模拟：支付网关超时，退款单积压',
      time: Date.now(),
    })
    message.success('已上报告警：退款通道异常（error 级），查看基座右上角铃铛红点')
  }

  const columns: ColumnsType<Order> = [
    { title: '订单号', dataIndex: 'id', width: 160 },
    { title: '商品', dataIndex: 'productName' },
    { title: '数量', dataIndex: 'quantity', width: 80 },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 120,
      render: (v: number) => `￥${v.toFixed(2)}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: OrderStatus) => (
        <Tag color={ORDER_STATUS_COLORS[status]}>{' ' + ORDER_STATUS_LABELS[status]}</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 190,
      render: (t: number) => new Date(t).toLocaleString(),
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_: unknown, o: Order) =>
        hasPerm(PERM.ORDER_VIEW) && (
          <Button size="small" onClick={() => navigate(`/orders/${o.id}`)}>
            详情
          </Button>
        ),
    },
  ]

  return (
    <div className="page">
      <Space className="toolbar">
        {hasPerm(PERM.ORDER_CREATE) && (
          <Button type="primary" onClick={() => navigate('/orders/create')}>
            新建订单
          </Button>
        )}
        <Button danger onClick={emitAlarm}>
          模拟退款异常告警
        </Button>
      </Space>

      <Table<Order>
        rowKey="id"
        size="middle"
        columns={columns}
        dataSource={orders}
        pagination={false}
        locale={{ emptyText: <Empty description="暂无订单" /> }}
      />

      <Card
        size="small"
        title="事件日志（最近10条）"
        className="log-panel"
        styles={{ body: { paddingTop: 8 } }}
      >
        {logs.length === 0 ? (
          <Typography.Text type="secondary">
            暂无事件，可在基座中打开商品应用(vue-sub)操作上下架试试
          </Typography.Text>
        ) : (
          <List
            size="small"
            split={false}
            dataSource={logs}
            renderItem={(l, i) => (
              <List.Item key={`${l.time}-${i}`} className="log-item">
                [{l.time}] {l.text}
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  )
}
