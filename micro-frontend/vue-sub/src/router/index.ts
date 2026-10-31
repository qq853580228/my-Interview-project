import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import ProductList from '../views/ProductList.vue'
import ProductEdit from '../views/ProductEdit.vue'
import NotFound from '../views/NotFound.vue'
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper'

/**
 * 【面试点】子应用路由 base 必须与基座 activeRule 前缀一致（'/vue-sub'），
 * 这样基座 URL 与子应用 URL 才能同步：
 * - 基座内：http://localhost:5173/vue-sub/products
 * - 独立运行：http://localhost:5174/vue-sub/products
 * 两者共享同一 base，路由跳转逻辑无需区分环境。
 */
const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/products' },
  { path: '/products', name: 'product-list', component: ProductList },
  { path: '/products/create', name: 'product-create', component: ProductEdit },
  { path: '/products/:id/edit', name: 'product-edit', component: ProductEdit },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFound },
]

export const history = createWebHistory(!qiankunWindow.__POWERED_BY_QIANKUN__ ? '/' : '/vue-sub')

export const router = createRouter({
  history,
  routes,
})

// 同时提供默认导出，兼容 main.ts 的 import router from './router'
export default router
