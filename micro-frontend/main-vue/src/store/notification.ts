import { computed, reactive } from 'vue'
import type { AlarmPayload } from '../shared/contract'

export interface NoticeItem {
  id: string
  type: 'alarm' | 'system'
  level: 'warn' | 'error' | 'info'
  source: string
  title: string
  message: string
  time: number
  read: boolean
}

const MAX_ITEMS = 50

/**
 * 全局消息通知中心（联动场景4：子应用告警 -> 基座右上角红点）
 * 同时记录基座中继过的业务事件流水，演示时可在通知面板看到中继过程
 */
export const notificationStore = reactive({
  items: [] as NoticeItem[],
})

export const unreadCount = computed(
  () => notificationStore.items.filter((i) => !i.read).length
)

let seq = 0
function push(item: Omit<NoticeItem, 'id' | 'time' | 'read'> & { time?: number }): void {
  notificationStore.items.unshift({
    id: `N_${Date.now()}_${seq++}`,
    time: Date.now(),
    read: false,
    ...item,
  })
  // 只保留最近 MAX_ITEMS 条，防止演示久了列表无限增长
  if (notificationStore.items.length > MAX_ITEMS) {
    notificationStore.items.length = MAX_ITEMS
  }
}

export function pushAlarm(payload: AlarmPayload): void {
  push({
    type: 'alarm',
    level: payload.level,
    source: payload.source,
    title: payload.title,
    message: payload.message,
    time: payload.time,
  })
}

export function pushSystem(title: string, message: string): void {
  push({ type: 'system', level: 'info', source: 'main-vue', title, message })
}

export function markAllRead(): void {
  notificationStore.items.forEach((i) => (i.read = true))
}

export function clearAll(): void {
  notificationStore.items.length = 0
}
