import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, App, Button, Card, Form, InputNumber, Select, Space, Typography } from 'antd'
import { EVENT_PRODUCT_OFFLINE, EVENT_PRODUCT_ONLINE, PRODUCT_OFF, ORDER_PENDING } from '../shared/contract'
import { useGlobal } from '../shared/globalStore'
import type { Product } from '../shared/mockDb'
import { addOrder, deductStock, loadProducts } from '../shared/mockDb'

export default function OrderCreate() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const { bus, offProducts } = useGlobal()
  const [products, setProducts] = useState<Product[]>(() => loadProducts())
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [error, setError] = useState('')

  useEffect(() => {
    const reload = () => setProducts(loadProducts())
    const offOffline = bus.on(EVENT_PRODUCT_OFFLINE, reload)
    const offOnline = bus.on(EVENT_PRODUCT_ONLINE, reload)
    return () => {
      offOffline()
      offOnline()
    }
  }, [bus])

  const isOff = (p: Product) => p.status === PRODUCT_OFF || offProducts.has(p.id)
  const selected = products.find((p) => p.id === productId) ?? null
  const hasOrderable = products.some((p) => !isOff(p) && p.stock > 0)
  const amount = selected && !isOff(selected) ? selected.price * quantity : 0

  const handleSubmit = () => {
    setError('')
    if (!selected) {
      setError('请选择商品')
      return
    }
    const fresh = loadProducts().find((p) => p.id === selected.id)
    if (!fresh || fresh.status === PRODUCT_OFF || offProducts.has(fresh.id)) {
      setError(`商品「${selected.name}」已下架，禁止下单`)
      message.error(`商品「${selected.name}」已下架，禁止下单`)
      setProducts(loadProducts())
      return
    }
    if (quantity < 1 || quantity > fresh.stock) {
      setError(`数量需在 1 ~ ${fresh.stock}（当前库存）之间`)
      return
    }
    deductStock(fresh.id, quantity)
    const now = Date.now()
    addOrder({
      id: `O${now}`,
      productId: fresh.id,
      productName: fresh.name,
      quantity,
      amount: fresh.price * quantity,
      status: ORDER_PENDING,
      createdAt: now,
      updatedAt: now,
    })
    message.success('订单已创建')
    navigate('/orders')
  }

  return (
    <Card title="新建订单" className="page" style={{ maxWidth: 560 }}>
      {!hasOrderable && (
        <Alert
          type="warning"
          show-icon
          style={{ marginBottom: 16 }}
          message="当前所有商品均不可下单（已下架或库存为0），请到商品应用中上架/补货"
        />
      )}
      <Form layout="vertical" onFinish={handleSubmit}>
        <Form.Item label="商品" required>
          <Select
            placeholder="请选择商品"
            value={productId || undefined}
            onChange={(v) => { setProductId(v); setQuantity(1) }}
            options={products.map((p) => ({
              value: p.id,
              disabled: isOff(p),
              label: `${p.name}（￥${p.price} / 库存${p.stock}）${isOff(p) ? '(已下架-禁止下单)' : p.stock <= 0 ? '(库存为0)' : ''}`,
            }))}
          />
        </Form.Item>
        <Form.Item label="数量" required>
          <InputNumber
            min={1}
            max={selected ? selected.stock : 1}
            value={quantity}
            onChange={(v) => setQuantity(Number(v) || 1)}
            disabled={!selected}
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item label="金额">
          <Typography.Text strong style={{ color: '#d4380d', fontSize: 16 }}>
            ￥{amount.toFixed(2)}
          </Typography.Text>
        </Form.Item>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" disabled={!selected}>提交订单</Button>
            <Button onClick={() => navigate('/orders')}>返回列表</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}
