<template>
  <div class="page">
    <a-space class="toolbar">
      <a-button v-if="hasPerm(PERM.PRODUCT_CREATE)" type="primary" @click="router.push('/products/create')">
        新增商品
      </a-button>
      <a-button v-if="hasPerm(PERM.PRODUCT_SHELF)" danger @click="emitLowStockAlarm">
        上报低库存告警（演示场景4）
      </a-button>
      <a-typography-text type="secondary">权限：{{ globalStore.permissions.join(', ') }}</a-typography-text>
    </a-space>

    <!-- 事件日志区：显示收到的订单结算事件（联动场景3） -->
    <a-card v-if="eventLog.length > 0" size="small" title="事件日志（最近 10 条）" class="event-log">
      <a-list size="small" :data-source="eventLog" :split="false">
        <template #renderItem="{ item }">
          <a-list-item class="log-item">[{{ formatTime(item.time) }}] {{ item.message }}</a-list-item>
        </template>
      </a-list>
    </a-card>

    <a-table
      row-key="id"
      size="middle"
      :columns="columns"
      :data-source="products"
      :pagination="false"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'price'">¥{{ record.price }}</template>
        <template v-else-if="column.key === 'stock'">
          {{ record.stock }}
          <a-tag v-if="record.stock < 10" color="orange">低库存</a-tag>
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tag :color="record.status === PRODUCT_ON ? 'green' : 'red'">
            {{ PRODUCT_STATUS_LABELS[record.status as ProductStatus] }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'updatedAt'">{{ formatTime(record.updatedAt) }}</template>
        <template v-else-if="column.key === 'actions'">
          <a-space>
            <a-button v-if="hasPerm(PERM.PRODUCT_EDIT)" size="small" @click="router.push(`/products/${record.id}/edit`)">
              编辑
            </a-button>
            <a-button v-if="hasPerm(PERM.PRODUCT_SHELF)" size="small" @click="toggleShelf(record)">
              {{ record.status === PRODUCT_ON ? PRODUCT_STATUS_LABELS[PRODUCT_OFF] : PRODUCT_STATUS_LABELS[PRODUCT_ON] }}
            </a-button>
            <a-button v-if="hasPerm(PERM.PRODUCT_DELETE)" size="small" danger @click="onDelete(record)">
              删除
            </a-button>
          </a-space>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, onBeforeUnmount } from 'vue'
  import { useRouter } from 'vue-router'
  import { Modal, message } from 'ant-design-vue'
  import { globalStore, hasPerm, getBus } from '../store/global'
  import {
    loadProducts,
    removeProduct,
    updateProduct,
    restoreStock,
    onDbChange,
    type Product,
  } from '../shared/mockDb'
  import {
    PERM,
    PRODUCT_OFF,
    PRODUCT_ON,
    PRODUCT_STATUS_LABELS,
    EVENT_PRODUCT_OFFLINE,
    EVENT_PRODUCT_ONLINE,
    EVENT_ORDER_SETTLED,
    EVENT_ALARM_REPORT,
    type ProductShelfPayload,
    type OrderSettledPayload,
    type AlarmPayload,
    type ProductStatus,
  } from '../shared/contract'

  const router = useRouter()
  const products = ref<Product[]>([])
  const eventLog = ref<Array<{ time: number; message: string }>>([])
  const disposers: Array<() => void> = []

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 110 },
    { title: '名称', dataIndex: 'name' },
    { title: '价格', key: 'price', width: 100 },
    { title: '库存', key: 'stock', width: 120 },
    { title: '状态', key: 'status', width: 90 },
    { title: '更新时间', key: 'updatedAt', width: 170 },
    { title: '操作', key: 'actions' },
  ]

  function refresh(): void {
    products.value = loadProducts()
  }

  function formatTime(t: number): string {
    return new Date(t).toLocaleString('zh-CN', { hour12: false })
  }

  function pushLog(msg: string): void {
    eventLog.value.unshift({ time: Date.now(), message: msg })
    if (eventLog.value.length > 10) eventLog.value.length = 10
  }

  function toggleShelf(p: Product): void {
    const newStatus: ProductStatus = p.status === PRODUCT_ON ? PRODUCT_OFF : PRODUCT_ON
    updateProduct({ ...p, status: newStatus, updatedAt: Date.now() })
    refresh()

    const payload: ProductShelfPayload = {
      productId: p.id,
      productName: p.name,
      operator: globalStore.user?.nickname || 'unknown',
      time: Date.now(),
    }
    if (newStatus === PRODUCT_OFF) {
      getBus().emit(EVENT_PRODUCT_OFFLINE, payload)
      message.info(`商品「${p.name}」已下架，已通过基座EventBus通知订单应用`)
      pushLog(`商品「${p.name}」已下架，已通过 EventBus 通知订单应用`)
    } else {
      getBus().emit(EVENT_PRODUCT_ONLINE, payload)
      message.info(`商品「${p.name}」已重新上架，已通过基座EventBus通知订单应用`)
      pushLog(`商品「${p.name}」已重新上架，已通过 EventBus 通知订单应用`)
    }
  }

  function onDelete(p: Product): void {
    Modal.confirm({
      title: `确定删除商品「${p.name}」？`,
      content: '删除后不可恢复',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        removeProduct(p.id)
        refresh()
        message.success(`已删除商品「${p.name}」`)
      },
    })
  }

  function emitLowStockAlarm(): void {
    const low = products.value.filter((p) => p.stock < 10)
    if (low.length === 0) {
      message.warning('当前无低库存商品')
      return
    }
    const p = low[0]
    const payload: AlarmPayload = {
      level: 'warn',
      source: 'vue-sub',
      title: '低库存告警',
      message: `商品「${p.name}」库存仅剩 ${p.stock} 件`,
      time: Date.now(),
    }
    getBus().emit(EVENT_ALARM_REPORT, payload)
    message.success(`已上报告警：${payload.message}`)
  }

  onMounted(() => {
    refresh()
    const offOrder = getBus().on(EVENT_ORDER_SETTLED, (payload: unknown) => {
      const p = payload as OrderSettledPayload
      restoreStock(p.productId, p.quantity)
      refresh()
      const after = products.value.find((x) => x.id === p.productId)
      pushLog(
        `收到订单事件：订单 ${p.orderId} ${p.type === 'complete' ? '已完成' : '已退款'}，商品「${p.productName}」库存 +${p.quantity}（当前库存 ${after ? after.stock : '?'}）`
      )
    })
    disposers.push(offOrder)
    disposers.push(onDbChange(() => refresh()))
  })

  onBeforeUnmount(() => {
    while (disposers.length) {
      disposers.pop()?.()
    }
  })
</script>

<style scoped>
  .product-list {
    background: #fff;
    padding: 20px;
    border-radius: 4px;
  }
  .toolbar {
    margin-bottom: 16px;
  }
  .event-log {
    margin-bottom: 16px;
  }
  .log-item {
    font-size: 12px;
    color: #606266;
  }
</style>
