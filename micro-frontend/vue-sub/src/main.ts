import { createApp, type App as VueApp } from 'vue'
import { renderWithQiankun, qiankunWindow } from 'vite-plugin-qiankun/dist/helper'
// UI 框架：ant-design-vue 4.x（CSS-in-JS，组件样式运行时注入，只需引全局 reset）
// 【面试点】reset.css 在模块顶层引入：无论 qiankun 内反复 mount 还是独立运行，样式只注入一次
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import App from './App.vue'
import router, { history } from './router'
import { setupFromProps, disposeGlobal } from './store/global'
import type { MicroAppProps } from './shared/contract'
import './style.css'


let app: VueApp | null = null
// 统一收集的清理函数（EventBus 订阅、storage 监听、定时器等），unmount 时全部执行
const disposers: Array<() => void> = []

function render(props: MicroAppProps) {
  console.log('[vue-sub] render', props)
  // 必须在 render 前根据 props 初始化全局态（bus / user / permissions）
  setupFromProps(props)
  // 把 global store 里收集的订阅解绑也归入 disposers
  disposers.push(disposeGlobal)

  app = createApp(App)
  app.use(Antd)
  app.use(router)
  // 【面试点】qiankun 内必须挂载到 props.container 里的 #app 节点，
  // 而不是 document 上的 #app —— 因为子应用 DOM 被限制在基座分配的容器内（沙箱隔离的一部分）；
  // 独立运行时 container 为空，降级挂载到本页面的 '#app'
  app.mount(props.container ? props.container.querySelector('#app')! : '#app')
}

renderWithQiankun({
  bootstrap() {
    console.log('[vue-sub] bootstrap')
  },
  mount(props) {
    console.log('[vue-sub] mount', props)
    render(props as MicroAppProps)
  },
  unmount() {
    // 【面试点】unmount 必须彻底清理：执行所有 disposer（解绑 EventBus 订阅、storage 监听、定时器），
    // 再卸载 Vue 实例并置空。否则子应用被基座反复切换挂载时，旧订阅仍在触发（事件重复处理）、
    // 旧 DOM/闭包无法回收（内存泄漏）
    while (disposers.length) {
      disposers.pop()?.()
    }
    app?.unmount()
    app = null
    history.destroy();
    // vue-router 4 没有公开销毁 API；这里复用模块级单例 router，
    // 重复 mount 不会叠加 history 监听，切走时由基座接管 URL
  },
  update() {
    // 基座调用 update 时的空实现（本项目通信走 EventBus，不依赖 props 更新）
  }
})

// 【面试点】非 qiankun 环境（直接访问 :5174）：走独立运行降级渲染，vue-router 正常工作
if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  render({})
}
