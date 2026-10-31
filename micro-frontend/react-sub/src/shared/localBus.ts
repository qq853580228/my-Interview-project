import type { EventBus } from './contract'

type Handler = (payload: any) => void

/**
 * 本地事件总线（Map<string, Set<handler>> 实现），满足 EventBus 接口
 * 【面试点】基座内运行时使用 qiankun props 注入的 bus（由基座中继跨应用事件），
 * 独立运行时降级为本地 bus —— 因此跨应用联动（商品上下架通知等）仅在基座内生效，
 * 独立运行只能在本应用内部自发自收
 */
export class LocalEventBus implements EventBus {
  private map = new Map<string, Set<Handler>>()

  on(event: string, handler: Handler): () => void {
    if (!this.map.has(event)) this.map.set(event, new Set())
    this.map.get(event)!.add(handler)
    // 返回解绑函数，方便 React useEffect cleanup 直接调用
    return () => this.off(event, handler)
  }

  off(event: string, handler: Handler): void {
    this.map.get(event)?.delete(handler)
  }

  emit(event: string, payload?: any): void {
    // 遍历副本，避免 handler 内部解绑导致迭代异常
    const handlers = Array.from(this.map.get(event) ?? [])
    handlers.forEach((h) => h(payload))
  }
}
