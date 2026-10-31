import {
  DB_VERSION,
  ORDER_PAID,
  ORDER_PENDING,
  ORDER_SHIPPED,
  PRODUCT_OFF,
  PRODUCT_ON,
  STORAGE_KEY_DB_VERSION,
  STORAGE_KEY_ORDERS,
  STORAGE_KEY_PRODUCTS,
  type OrderStatus,
  type ProductStatus,
} from '../shared/contract'

export interface Product {
  id: string
  name: string
  price: number
  stock: number
  status: ProductStatus
  updatedAt: number
}

export interface Order {
  id: string
  productId: string
  productName: string
  quantity: number
  amount: number
  status: OrderStatus
  createdAt: number
  updatedAt: number
}

// ---------- 商品：只读 API（维护权在 vue-sub，本应用仅下单扣库存时写回） ----------

const SEED_PRODUCTS: Product[] = [
  { id: 'P001', name: '机械键盘', price: 299, stock: 50, status: PRODUCT_ON, updatedAt: Date.now() },
  { id: 'P002', name: '无线鼠标', price: 99, stock: 8, status: PRODUCT_ON, updatedAt: Date.now() },
  { id: 'P003', name: '4K显示器', price: 1299, stock: 20, status: PRODUCT_ON, updatedAt: Date.now() },
  { id: 'P004', name: 'USB-C扩展坞', price: 159, stock: 0, status: PRODUCT_OFF, updatedAt: Date.now() },
]

const SEED_ORDERS: Order[] = [
  { id: 'O1001', productId: 'P001', productName: '机械键盘', quantity: 1, amount: 299, status: ORDER_PENDING, createdAt: Date.now() - 86400000 * 2, updatedAt: Date.now() - 86400000 * 2 },
  { id: 'O1002', productId: 'P003', productName: '4K显示器', quantity: 2, amount: 2598, status: ORDER_PAID, createdAt: Date.now() - 86400000, updatedAt: Date.now() - 86400000 },
  { id: 'O1003', productId: 'P002', productName: '无线鼠标', quantity: 1, amount: 99, status: ORDER_SHIPPED, createdAt: Date.now() - 3600000, updatedAt: Date.now() - 3600000 },
]

function ensureSeed(): void {
  if (localStorage.getItem(STORAGE_KEY_DB_VERSION) !== DB_VERSION) {
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(SEED_PRODUCTS))
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(SEED_ORDERS))
    localStorage.setItem(STORAGE_KEY_DB_VERSION, DB_VERSION)
  }
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export function loadProducts(): Product[] {
  ensureSeed()
  return read<Product[]>(STORAGE_KEY_PRODUCTS, [])
}

export function deductStock(productId: string, quantity: number): void {
  const products = loadProducts()
  const idx = products.findIndex((p) => p.id === productId)
  if (idx === -1) return
  products[idx] = { ...products[idx], stock: Math.max(0, products[idx].stock - quantity), updatedAt: Date.now() }
  write(STORAGE_KEY_PRODUCTS, products)
}

// ---------- 订单 API ----------

export function loadOrders(): Order[] {
  ensureSeed()
  return read<Order[]>(STORAGE_KEY_ORDERS, [])
}

export function saveOrders(orders: Order[]): void {
  write(STORAGE_KEY_ORDERS, orders)
}

export function addOrder(order: Order): void {
  const orders = loadOrders()
  orders.unshift(order)
  saveOrders(orders)
}

export function updateOrder(order: Order): void {
  const orders = loadOrders().map((o) => (o.id === order.id ? order : o))
  saveOrders(orders)
}

export function onDbChange(cb: () => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY_PRODUCTS || e.key === STORAGE_KEY_ORDERS || e.key === null) cb()
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}
