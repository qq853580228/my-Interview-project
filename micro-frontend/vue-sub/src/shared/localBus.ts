import type { EventBus } from './contract'

type Handler = (payload: any) => void

/**
 * 本地事件总线：子应用独立运行时降级使用
 * 【面试点】基座内子应用使用基座注入的 bus（基座中继/中心辐射模式），
 * 独立运行时用本地 bus，事件联动仅在基座内跨应用生效；
 * 独立运行时功能完整，但跨应用联动（如商品下架通知订单应用）不生效，
 * 这正是 qiankun 的价值所在——把「散装微前端」串成「协同微前端」。
 */
export class LocalEventBus implements EventBus {
  private handlers = new Map<string, Set<Handler>>()

  on(event: string, handler: Handler): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set())
    this.handlers.get(event)!.add(handler)
    return () => this.off(event, handler)
  }

  off(event: string, handler: Handler): void {
    this.handlers.get(event)?.delete(handler)
  }

  emit(event: string, payload?: any): void {
    const set = this.handlers.get(event)
    if (set) {
      set.forEach((h) => {
        try {
          h(payload)
        } catch (err) {
          console.error(`[LocalEventBus] handler error on "${event}":`, err)
        }
      })
    }
  }
}
