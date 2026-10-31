import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
// 【面试点】vite 子应用产物是 ESM，没有 UMD 导出，qiankun 无法像 webpack 子应用那样
// 直接从入口脚本拿到 bootstrap/mount/unmount，必须用 vite-plugin-qiankun 的
// renderWithQiankun helper 注册生命周期（与 vue 子应用做法一致）
import { qiankunWindow, renderWithQiankun } from 'vite-plugin-qiankun/dist/helper'
import App from './App'
import type { MicroAppProps } from './shared/contract'
import { setupFromProps, teardown } from './shared/globalStore'
import './index.css'
import './public-path'

let root: Root | null = null
const disposers: Array<() => void> = []

function render(props: MicroAppProps) {
  // 初始化全局 store（bus/用户/权限），并收集 store 级订阅的清理函数
  disposers.push(...setupFromProps(props))
  // 【面试点】基座内必须挂载到 props.container 内的 #root（子应用 DOM 被限定在基座容器里），
  // 独立运行时才用 document 上的 #root
  const container = props.container
    ? props.container.querySelector<HTMLDivElement>('#root')!
    : document.getElementById('root')!
  root = createRoot(container)
  // 【面试点】qiankun 内不包 StrictMode：开发模式 StrictMode 会 double-mount effects，
  // 导致 bus 订阅重复、事件日志出现双条，干扰演示；这里直接不启用并说明原因
  root.render(<App />)
}

renderWithQiankun({
  bootstrap: async () => {
    console.log('react-sub bootstrap')
  },
  mount: async (props) => {
    render(props as MicroAppProps)
  },
  unmount: async () => {
    // 【面试点】先清全局订阅再卸载 React 树：组件内的 bus 订阅会随 useEffect cleanup 解绑，
    // 但 store 级（globalStore 里的）订阅不在组件树上，必须在 unmount 生命周期显式清理，防内存泄漏
    while (disposers.length) disposers.pop()!()
    teardown()
    root?.unmount()
    root = null
  },
  update: async () => {
    // 基座 update 钩子，本应用无需响应 props 更新
  },
})

// 独立运行降级：不在 qiankun 环境时直接渲染
if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  render({})
}
