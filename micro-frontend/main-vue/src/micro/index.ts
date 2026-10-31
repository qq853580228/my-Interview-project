import {
  registerMicroApps,
  start,
  addGlobalUncaughtErrorHandler,
  type RegistrableApp,
} from 'qiankun'
import {
  MICRO_APP_CONTAINER,
  SUB_APP_NAME_VUE,
  SUB_APP_NAME_REACT,
  SUB_APP_NAME_VUE_PATH,
  SUB_APP_NAME_REACT_PATH,
} from '../constant'
import { bus } from '../shared/EventBus'
import type { MicroAppProps } from '../shared/contract'
import {
  EVENT_ALARM_REPORT,
  EVENT_PRODUCT_OFFLINE,
  EVENT_PRODUCT_ONLINE,
  EVENT_ORDER_SETTLED,
} from '../shared/contract'
import type { AlarmPayload, ProductShelfPayload, OrderSettledPayload } from '../shared/contract'
import { getSnapshot } from '../store/user'
import { pushAlarm, pushSystem } from '../store/notification'

/** 基座注入给每个子应用的 props（通信契约的「依赖注入」入口） */
const sharedProps: MicroAppProps = {
  bus,
  getSnapshot,
}

/** 子应用注册配置（开发环境从 .env 读取 entry，生产环境使用线上地址） */
function getApps(): RegistrableApp<Record<string, any>>[] {
  console.log('[qiankun] Sub-app entries:')
  console.log(`  vue-sub:     ${import.meta.env.VITE_SUB_APP_NAME_VUE_ENTRY}`)
  console.log(`  react-sub:   ${import.meta.env.VITE_SUB_APP_NAME_REACT_ENTRY}`)
  return [
    {
      name: SUB_APP_NAME_VUE,
      entry: import.meta.env.VITE_SUB_APP_NAME_VUE_ENTRY!,
      activeRule: SUB_APP_NAME_VUE_PATH,
      container: MICRO_APP_CONTAINER,
      props: {...sharedProps, basename: SUB_APP_NAME_VUE_PATH},
    },
    {
      name: SUB_APP_NAME_REACT,
      entry: import.meta.env.VITE_SUB_APP_NAME_REACT_ENTRY!,
      activeRule: SUB_APP_NAME_REACT_PATH,
      container: MICRO_APP_CONTAINER,
      props: {...sharedProps, basename: SUB_APP_NAME_REACT_PATH},
    },
  ]
}

/** 子应用加载失败降级 UI（联动 qiankun 能力：加载错误降级） */
function renderFallback(appName: string, err: unknown): void {
  const container = document.querySelector<HTMLElement>(MICRO_APP_CONTAINER)
  if (!container) return
  // 避免重复渲染
  if (container.querySelector('.micro-fallback')) return
  const div = document.createElement('div')
  div.className = 'micro-fallback'
  div.innerHTML = `
    <div style="padding:40px;text-align:center;border:1px dashed #d9d9d9;border-radius:6px;margin:16px;">
      <p style="font-size:16px;color:#c0392b;">子应用「${appName}」加载失败</p>
      <p style="color:#888;font-size:13px;">请确认对应 dev server 已启动（vue-sub:5174 / react-sub:5175）</p>
      <p style="color:#aaa;font-size:12px;word-break:break-all;">${String(err ?? '')}</p>
      <button onclick="location.reload()" style="margin-top:12px;padding:6px 16px;cursor:pointer;">刷新重试</button>
    </div>`
  container.appendChild(div)
}

/**
 * 基座作为「事件总线中继」的接线处：
 * 基座监听所有跨应用事件，一方面驱动自身 UI（消息红点），
 * 另一方面记录中继流水（事件本身已由同一 bus 实例直达订阅方）
 */
function wireRelayListeners(): void {
  bus.on(EVENT_ALARM_REPORT, (payload: AlarmPayload) => {
    // 联动场景4：子应用告警 -> 基座右上角红点
    pushAlarm(payload)
  })
  bus.on(EVENT_PRODUCT_OFFLINE, (p: ProductShelfPayload) => {
    pushSystem('中继：商品下架', `「${p.productName}」已下架，事件已中继至订单应用（操作人：${p.operator}）`)
  })
  bus.on(EVENT_PRODUCT_ONLINE, (p: ProductShelfPayload) => {
    pushSystem('中继：商品上架', `「${p.productName}」已重新上架，事件已中继至订单应用（操作人：${p.operator}）`)
  })
  bus.on(EVENT_ORDER_SETTLED, (p: OrderSettledPayload) => {
    pushSystem(
      '中继：订单结算',
      `订单 ${p.orderId} ${p.type === 'complete' ? '已完成' : '已退款'}，事件已中继至商品应用回补「${p.productName}」库存 +${p.quantity}`
    )
  })
}

export function setupMicroApps(): void {
  wireRelayListeners()

  registerMicroApps(getApps(), {
    async beforeLoad(app) {
      console.log(`[qiankun] beforeLoad: ${app.name}`)
    },
    async beforeMount(app) {
      console.log(`[qiankun] beforeMount: ${app.name}`)
    },
    async afterUnmount(app) {
      console.log(`[qiankun] afterUnmount: ${app.name}`)
      // 子应用卸载后清掉可能残留的降级 UI
      document.querySelector('.micro-fallback')?.remove()
    },
  })

  // 【面试点】全局错误兜底：子应用 entry 拉取失败/运行时异常都会走到这里，
  // 没有它时子应用挂了页面就是白屏一块，用户体验为零
  addGlobalUncaughtErrorHandler((event) => {
    const err = event instanceof ErrorEvent ? event.error ?? event.message : event
    const msg = String((err as Error)?.message ?? err ?? '')
    console.error('[qiankun] uncaught error:', err)
    // entry fetch 失败时 qiankun 报错信息里带子应用 entry 地址，据此判断是哪个应用
    const appName = msg.includes('5175') || msg.includes(SUB_APP_NAME_REACT)
      ? SUB_APP_NAME_REACT
      : SUB_APP_NAME_VUE
    renderFallback(appName, msg)
    pushAlarm({
      level: 'error',
      source: 'main-vue',
      title: '子应用加载异常',
      message: `${appName}: ${msg.slice(0, 120)}`,
      time: Date.now(),
    })
  })

  // 监听 window error 事件（用于捕获 qiankun 内部未抛出的异常）
  window.addEventListener('error', (e) => {
    if (e.message?.includes('fetch') || e.message?.includes('load') || e.message?.includes('entry')) {
      console.error('[main-vue] Window error:', e.message, e.filename, e.lineno)
    }
  })

  // 监听 unhandledrejection 事件（用于捕获异步错误）
  window.addEventListener('unhandledrejection', (e) => {
    const reason = String(e.reason?.message ?? e.reason ?? '')
    if (reason.includes('fetch') || reason.includes('load') || reason.includes('entry') || reason.includes('qiankun')) {
      console.error('[main-vue] Unhandled rejection:', reason)
    }
  })

  // 启动 qiankun
  start({
    // 【面试点】prefetch：空闲时预拉取未激活子应用的静态资源，
    // 首次切换子应用时秒开；数组形式只对指定应用预加载（也可 true 全量）
    prefetch: [SUB_APP_NAME_VUE, SUB_APP_NAME_REACT],
    // 【面试点】沙箱：保留 JS Proxy 快照沙箱，子应用对 window 的修改被隔离、unmount 后还原。
    // 样式隔离刻意不开 experimentalStyleIsolation（css 选择器重写）：
    // - antd v5 / ant-design-vue v4 走 CSS-in-JS，运行时注入 <style>，css 重写对其拦截不稳定；
    // - antd 的 Modal/Select/DatePicker 等弹层默认渲染到 document.body（在子应用容器外），
    //   被重写的选择器匹配不到，弹层会裸奔；
    // 因此样式隔离交给 UI 库自带的组件级 hashed 类名 + 三端统一 reset.css，
    // 代价是子应用全局 reset 与基座共享（可接受，三端都用同一份 reset）
    sandbox: true,
    // 单例模式：同一时间只挂载一个子应用，切换路由时先 unmount 旧的再 mount 新的
    singular: true,
  })
}
