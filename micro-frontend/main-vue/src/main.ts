import { createApp } from 'vue'
// UI 框架：ant-design-vue 4.x（CSS-in-JS，组件样式运行时注入，只需引全局 reset）
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import './style.css'
import App from './App.vue'
import { router } from './router'
import { setupMicroApps } from './micro'

const app = createApp(App)
app.use(Antd)
app.use(router)
app.mount('#app')

// 【面试点】qiankun 的 start() 必须等 router.isReady() 之后：
// 1. 确保登录守卫的重定向先完成——未登录直接访问 /vue-sub/xxx 时，
//    路由已重定向到 /login，activeRule 不匹配，不会触发子应用挂载
//    （否则会在容器还不存在时 mount 报错）；
// 2. 确保 MainLayout（含 #micro-container）已渲染到 DOM。
router.isReady().then(() => {
  setupMicroApps()
})
