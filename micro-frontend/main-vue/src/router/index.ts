import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { userStore } from '../store/user'
import MainLayout from '../layout/MainLayout.vue'
import LoginPage from '../views/LoginPage.vue'
import DemoPage from '../views/DemoPage.vue'
import { SUB_APP_NAME_VUE_PATH, SUB_APP_NAME_REACT_PATH } from '../constant'

/**
 * 子应用路由占位组件：本身不渲染任何内容，
 * 真正的子应用 DOM 由布局中常驻的 #micro-container 承载
 * 【面试点】容器不能用 router-view 渲染，否则主应用路由切换会销毁重建容器，
 * qiankun 挂载在里面的子应用 DOM 会跟着丢失（常见坑）
 */
const SubAppPlaceholder = { render: () => null }

const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: LoginPage, meta: { public: true } },
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: '', redirect: '/demo' },
      { path: 'demo', name: 'demo', component: DemoPage },
      // catch-all：子应用内部任意层级路由都由基座 URL 承载（路由同步）
      { path: `${SUB_APP_NAME_VUE_PATH.slice(1)}/:pathMatch(.*)*`, component: SubAppPlaceholder },
      { path: `${SUB_APP_NAME_REACT_PATH.slice(1)}/:pathMatch(.*)*`, component: SubAppPlaceholder },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/demo' },
]

export const router = createRouter({
  // 【面试点】基座必须用 history 模式：qiankun activeRule 基于 pathname 匹配，
  // hash 模式下子应用路由同步会带上 '#' 导致匹配/拼接混乱
  history: createWebHistory(),
  routes,
})

// 登录守卫：未登录访问任何页面（包括直接输入的子应用 URL）都重定向到登录页
router.beforeEach((to) => {
  if (to.meta.public) {
    // 已登录还去登录页 -> 回首页
    if (to.name === 'login' && userStore.user) return { path: '/demo' }
    return true
  }
  if (!userStore.user) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  return true
})

// 【修复】qiankun 沙箱内 location 对象被代理，子应用使用 useNavigate 后可能导致
// Vue Router 读取到 location.pathname = undefined，进而拼接出无效 URL
// 此处拦截错误并静默恢复，避免崩溃
router.onError((err) => {
  const urlPattern = /undefined/
  if (err instanceof SyntaxError && urlPattern.test(err.message)) {
    console.warn('[router] 拦截 qiankun 沙箱导致的无效 URL 导航:', err.message)
    // 静默忽略，Vue Router 会自动保持在当前路由
  }
})
