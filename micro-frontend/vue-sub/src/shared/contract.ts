// ============================================================
// 微前端统一通信契约（main-vue / vue-sub / react-sub 三端一致）
// 【面试点】跨技术栈（Vue/React）通信的前提是「协议先行」：
// 事件名、payload 结构、权限码在基座统一定义，子应用各自复制一份
// 同构实现（真实项目可抽成 npm 私有包共享，这里为演示独立性各自内置）
// ============================================================

// ---------- Storage Keys（localStorage 共享键名） ----------
export const STORAGE_KEY_USER = 'mf_main_user'
export const STORAGE_KEY_PRODUCTS = 'mf_db_products'
export const STORAGE_KEY_ORDERS = 'mf_db_orders'
export const STORAGE_KEY_DB_VERSION = 'mf_db_version'
export const DB_VERSION = 'v1'

// ---------- 事件名 ----------
export const EVENT_USER_CHANGE = 'micro:user-change' // 基座->子应用：用户/权限变更 payload: UserChangePayload
export const EVENT_PRODUCT_OFFLINE = 'micro:product-offline' // vue-sub->react-sub：商品下架 payload: ProductShelfPayload
export const EVENT_PRODUCT_ONLINE = 'micro:product-online' // vue-sub->react-sub：商品上架 payload: ProductShelfPayload
export const EVENT_ORDER_SETTLED = 'micro:order-settled' // react-sub->vue-sub：订单完成/退款 payload: OrderSettPayload
export const EVENT_ALARM_REPORT = 'micro:alarm-report' // 子应用->基座：业务告警上报 payload: AlarmPayload

// ---------- 用户与权限 ----------
export const ROLE_ADMIN = 'admin'
export const ROLE_OPERATOR = 'operator'
export const ROLE_VIEWER = 'viewer'
export type Role = typeof ROLE_ADMIN | typeof ROLE_OPERATOR | typeof ROLE_VIEWER

export const ROLE_OPTIONS = [
  { value: ROLE_ADMIN, label: 'admin（全部权限）' },
  { value: ROLE_OPERATOR, label: 'operator（无删除权限）' },
  { value: ROLE_VIEWER, label: 'viewer（只读）' },
] as const

export interface UserInfo {
  id: string
  username: string
  nickname: string
  role: Role
}

// ---------- 权限码 ----------
export const PERM = {
  PRODUCT_VIEW: 'product:view',
  PRODUCT_CREATE: 'product:create',
  PRODUCT_EDIT: 'product:edit',
  PRODUCT_DELETE: 'product:delete',
  PRODUCT_SHELF: 'product:shelf',
  ORDER_VIEW: 'order:view',
  ORDER_CREATE: 'order:create',
  ORDER_EDIT: 'order:edit',
  ORDER_REFUND: 'order:refund',
} as const

export type PermCode = (typeof PERM)[keyof typeof PERM]

/** RBAC：角色 -> 权限码映射（演示用，真实项目由后端下发） */
export const ROLE_PERMS: Record<Role, PermCode[]> = {
  [ROLE_ADMIN]: [
    PERM.PRODUCT_VIEW, PERM.PRODUCT_CREATE, PERM.PRODUCT_EDIT, PERM.PRODUCT_DELETE, PERM.PRODUCT_SHELF,
    PERM.ORDER_VIEW, PERM.ORDER_CREATE, PERM.ORDER_EDIT, PERM.ORDER_REFUND,
  ],
  [ROLE_OPERATOR]: [
    PERM.PRODUCT_VIEW, PERM.PRODUCT_CREATE, PERM.PRODUCT_EDIT, PERM.PRODUCT_SHELF,
    PERM.ORDER_VIEW, PERM.ORDER_CREATE, PERM.ORDER_EDIT, PERM.ORDER_REFUND,
  ],
  [ROLE_VIEWER]: [PERM.PRODUCT_VIEW, PERM.ORDER_VIEW],
}

export const ROLE_LABELS: Record<Role, string> = {
  [ROLE_ADMIN]: '管理员（全部权限）',
  [ROLE_OPERATOR]: '运营（无删除权限）',
  [ROLE_VIEWER]: '访客（只读）',
}

// ---------- 商品状态 ----------
export const PRODUCT_ON = 'on'
export const PRODUCT_OFF = 'off'
export type ProductStatus = typeof PRODUCT_ON | typeof PRODUCT_OFF

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  [PRODUCT_ON]: '上架',
  [PRODUCT_OFF]: '下架',
}

// ---------- 订单状态 ----------
export const ORDER_PENDING = 'pending'
export const ORDER_PAID = 'paid'
export const ORDER_SHIPPED = 'shipped'
export const ORDER_COMPLETED = 'completed'
export const ORDER_REFUNDED = 'refunded'
export type OrderStatus = typeof ORDER_PENDING | typeof ORDER_PAID | typeof ORDER_SHIPPED | typeof ORDER_COMPLETED | typeof ORDER_REFUNDED

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: '待支付',
  paid: '已支付',
  shipped: '已发货',
  completed: '已完成',
  refunded: '已退款',
}

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'default',
  paid: 'blue',
  shipped: 'orange',
  completed: 'green',
  refunded: 'red',
}

// ---------- 事件 payload ----------
export interface UserChangePayload {
  user: UserInfo | null
  permissions: PermCode[]
}

export interface ProductShelfPayload {
  productId: string
  productName: string
  operator: string
  time: number
}

export interface OrderSettledPayload {
  orderId: string
  productId: string
  productName: string
  quantity: number
  type: 'complete' | 'refund'
  time: number
}

export interface AlarmPayload {
  level: 'warn' | 'error'
  source: 'vue-sub' | 'react-sub' | 'main-vue'
  title: string
  message: string
  time: number
}

// ---------- qiankun props（基座 -> 子应用） ----------
export interface EventBus {
  /** 订阅事件，返回解绑函数（便于 unmount 统一清理防泄漏） */
  on(event: string, handler: (payload: unknown) => void): () => void
  off(event: string, handler: (payload: unknown) => void): void
  emit(event: string, payload?: unknown): void
}

export interface MicroAppSnapshot {
  user: UserInfo | null
  permissions: PermCode[]
}

export interface MicroAppProps {
  bus?: EventBus
  /** 子应用 mount 时主动拉取最新用户/权限快照（props 注册时是静态的，快照必须是函数） */
  getSnapshot?: () => MicroAppSnapshot
  container?: HTMLElement
  name?: string
}
