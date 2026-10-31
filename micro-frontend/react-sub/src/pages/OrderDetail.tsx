import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, App, Button, Card, Descriptions, Result, Space, Tag } from 'antd'
import { EVENT_ORDER_SETTLED, ORDER_COMPLETED, ORDER_PAID, ORDER_PENDING, ORDER_REFUNDED, ORDER_SHIPPED, PERM, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '../shared/contract'
import { hasPerm, useGlobal } from '../shared/globalStore'
import type { OrderStatus } from '../shared/contract'
import type { Order } from '../shared/mockDb'
import { loadOrders, onDbChange, updateOrder } from '../shared/mockDb'

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { modal } = App.useApp()
  const { bus } = useGlobal()
  const [order, setOrder] = useState<Order | null>(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const load = () => {
      setOrder(loadOrders().find((o) => o.id === id) ?? null)
    }
    load()
    const offDb = onDbChange(load)
    return offDb
  }, [id])

  if (!order) {
    return (
      <Result
        status="404"
        title="订单不存在"
        subTitle={`订单 ${id} 不存在`}
        extra={<Button onClick={() => navigate('/orders')}>返回列表</Button>}
      />
    )
  }

  const save = (next: Order) => {
    updateOrder(next)
    setOrder(next)
  }

  const settle = (next: Order, type: 'complete' | 'refund') => {
    save(next)
    bus.emit(EVENT_ORDER_SETTLED, {
      orderId: next.id,
      productId: next.productId,
      productName: next.productName,
      quantity: next.quantity,
      type,
      time: Date.now(),
    })
    setNotice(`已通过基座EventBus通知商品应用回补库存 +${next.quantity}`)
  }

  const now = () => Date.now()
  const canEdit = hasPerm(PERM.ORDER_EDIT)
  const canRefund = hasPerm(PERM.ORDER_REFUND) && order.status !== ORDER_COMPLETED && order.status !== ORDER_REFUNDED

  const handleRefund = () => {
    modal.confirm({
      title: `确认对订单 ${order.id} 执行退款？`,
      content: '退款将通知商品应用回补库存',
      okText: '确认退款',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk() {
        settle({ ...order, status: ORDER_REFUNDED, updatedAt: now() }, 'refund')
      },
    })
  }

  // 状态机标签颜色映射
  const statusColor = ORDER_STATUS_COLORS[order.status as OrderStatus] ?? 'default'

  return (
    <Card title="订单详情" className="page" style={{ maxWidth: 720 }}>
      {notice && <Alert type="success" showIcon message={notice} style={{ marginBottom: 16 }} />}
      <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="订单号">{order.id}</Descriptions.Item>
        <Descriptions.Item label="商品ID">{order.productId}</Descriptions.Item>
        <Descriptions.Item label="商品名称">{order.productName}</Descriptions.Item>
        <Descriptions.Item label="数量">{order.quantity}</Descriptions.Item>
        <Descriptions.Item label="金额">￥{order.amount.toFixed(2)}</Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag color={statusColor}>{ORDER_STATUS_LABELS[order.status as OrderStatus]}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="创建时间">{new Date(order.createdAt).toLocaleString()}</Descriptions.Item>
        <Descriptions.Item label="更新时间">{new Date(order.updatedAt).toLocaleString()}</Descriptions.Item>
      </Descriptions>

      <Space>
        {canEdit && order.status === ORDER_PENDING && (
          <Button type="primary" onClick={() => save({ ...order, status: ORDER_PAID, updatedAt: now() })}>
            支付
          </Button>
        )}
        {canEdit && order.status === ORDER_PAID && (
          <Button type="primary" onClick={() => save({ ...order, status: ORDER_SHIPPED, updatedAt: now() })}>
            发货
          </Button>
        )}
        {canEdit && order.status === ORDER_SHIPPED && (
          <Button
            type="primary"
            onClick={() => settle({ ...order, status: ORDER_COMPLETED, updatedAt: now() }, 'complete')}
          >
            确认完成
          </Button>
        )}
        {canRefund && (
          <Button danger onClick={handleRefund}>
            退款
          </Button>
        )}
        <Button onClick={() => navigate('/orders')}>返回列表</Button>
      </Space>
    </Card>
  )
}
