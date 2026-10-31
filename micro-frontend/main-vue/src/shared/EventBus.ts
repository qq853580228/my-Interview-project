import type { EventBus } from '../shared/contract'

type Handler = (payload: any) => void

interface BusMessage {
  event: string
  payload: unknown
}

/**
 * 基座事件总线（中继枢纽）
 *
 * 【面试点】为什么用「基座 EventBus 中继」而不是子应用互相直连？
 * 1. 子应用之间不应感知彼此存在（解耦），所有跨应用事件都经过基座枢纽转发，
 *    形成中心辐射（hub-and-spoke）结构，基座可统一做鉴权、日志、告警聚合；
 * 2. 基座把 bus 实例通过 qiankun props 注入子应用，子应用独立运行时
 *    降级为本地 bus，代码无需区分环境；
 * 3. 相比 qiankun 自带 initGlobalState（更适合「状态」而非「事件流」，
 *    且 action 触发依赖 setState 浅比较），自定义 EventBus 语义更清晰、
 *    支持一次性事件（如告警上报）不丢失。
 *
 * 【面试点】BroadcastChannel 跨标签页中继：
 * 演示时可以开两个浏览器窗口（一个商品页、一个订单页），
 * 一个窗口 emit 的事件通过 BroadcastChannel 广播到另一个窗口的基座 bus，
 * 让「双窗口并排演示联动」成为可能（同源限制下有效）。
 */
export class MainEventBus implements EventBus {
  private handlers = new Map<string, Set<Handler>>()
  private channel: BroadcastChannel | null = null

  constructor(channelName = 'mf-event-bus') {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(channelName)
      // 收到其他标签页广播的事件 -> 只做本地分发，不再回广播（防环路）
      this.channel.onmessage = (e: MessageEvent<BusMessage>) => {
        this.dispatch(e.data.event, e.data.payload, false)
      }
    }
  }

  on(event: string, handler: Handler): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set())
    this.handlers.get(event)!.add(handler)
    // 返回解绑函数：子应用 unmount 时统一调用，防止内存泄漏与重复触发
    return () => this.off(event, handler)
  }

  off(event: string, handler: Handler): void {
    this.handlers.get(event)?.delete(handler)
  }

  emit(event: string, payload?: unknown): void {
    this.dispatch(event, payload, true)
  }

  private dispatch(event: string, payload: unknown, broadcast: boolean): void {
    const set = this.handlers.get(event)
    if (set) {
      set.forEach((h) => {
        try {
          h(payload)
        } catch (err) {
          // 【面试点】单个订阅者抛错不能影响其他订阅者（事件总线要隔离异常）
          console.error(`[EventBus] handler error on "${event}":`, err)
        }
      })
    }
    if (broadcast && this.channel) {
      // payload 必须可结构化克隆（纯 JSON 数据），这也是事件契约要求 payload 为 plain object 的原因
      // Vue 响应式对象（Proxy）无法被 structured clone，需要先转换为纯对象
      let cloneablePayload: unknown
      try {
        cloneablePayload = payload
        // 测试是否可以被克隆
        structuredClone(cloneablePayload)
      } catch {
        // 如果无法克隆，使用 JSON 序列化/反序列化转换为纯对象
        try {
          cloneablePayload = JSON.parse(JSON.stringify(payload))
        } catch {
          console.warn('[EventBus] payload cannot be cloned, skipping broadcast')
          return
        }
      }
      this.channel.postMessage({ event, payload: cloneablePayload } satisfies BusMessage)
    }
  }
}

/** 全局唯一 bus 实例，通过 qiankun props 下发给子应用 */
export const bus = new MainEventBus()
