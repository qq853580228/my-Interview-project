import {
  DB_VERSION,
  PRODUCT_OFF,
  PRODUCT_ON,
  STORAGE_KEY_DB_VERSION,
  STORAGE_KEY_PRODUCTS,
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

/**
 * Mock 共享「后端」（localStorage）
 * 【面试点】qiankun 内子应用 JS 运行在主应用页面上下文，localStorage 按主应用同源(:5173)共享；
 * 独立运行时各子应用源不同（:5174 vs :5175），数据不互通。
 * 因此跨应用联动的「最终一致」依赖事件通知，而非依赖库同步。
 */
function seed(): void {
  const now = Date.now()
  const products: Product[] = [
    { id: 'P001', name: '机械键盘', price: 299, stock: 50, status: PRODUCT_ON, updatedAt: now },
    { id: 'P002', name: '无线鼠标', price: 99, stock: 8, status: PRODUCT_ON, updatedAt: now }, // 低库存，演示告警
    { id: 'P003', name: '4K显示器', price: 1299, stock: 20, status: PRODUCT_ON, updatedAt: now },
    { id: 'P004', name: 'USB-C扩展坞', price: 159, stock: 0, status: PRODUCT_OFF, updatedAt: now },
  ]
  localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products))
  localStorage.setItem(STORAGE_KEY_DB_VERSION, DB_VERSION)
}

function ensureSeed(): void {
  const v = localStorage.getItem(STORAGE_KEY_DB_VERSION)
  if (v !== DB_VERSION) seed()
}

export function loadProducts(): Product[] {
  ensureSeed()
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRODUCTS)
    return raw ? (JSON.parse(raw) as Product[]) : []
  } catch {
    return []
  }
}

export function saveProducts(list: Product[]): void {
  localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(list))
}

export function addProduct(p: Product): void {
  const list = loadProducts()
  list.unshift(p)
  saveProducts(list)
}

export function updateProduct(p: Product): void {
  const list = loadProducts()
  const idx = list.findIndex((x) => x.id === p.id)
  if (idx >= 0) {
    list[idx] = p
    saveProducts(list)
  }
}

export function removeProduct(id: string): void {
  const list = loadProducts().filter((p) => p.id !== id)
  saveProducts(list)
}

/**
 * 回补库存（联动场景3：订单完成/退款时调用）
 * @param productId 商品ID
 * @param quantity 回补数量
 */
export function restoreStock(productId: string, quantity: number): void {
  const list = loadProducts()
  const p = list.find((x) => x.id === productId)
  if (p) {
    p.stock += quantity
    p.updatedAt = Date.now()
    saveProducts(list)
  }
}

/**
 * 监听 localStorage 的 storage 事件（同 key 时触发）
 * 【面试点】多窗口演示时，窗口A写库，窗口B收到 storage 事件自动刷新数据
 */
export function onDbChange(cb: () => void): () => void {
  const handler = (e: StorageEvent): void => {
    if (e.key === STORAGE_KEY_PRODUCTS) cb()
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}
