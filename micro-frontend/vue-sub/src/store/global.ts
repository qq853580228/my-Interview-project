import { reactive, readonly } from 'vue'
import { EVENT_USER_CHANGE, PERM, ROLE_ADMIN, type MicroAppProps, type EventBus, type PermCode } from '../shared/contract'
import { LocalEventBus } from '../shared/localBus'

/**
 * 【面试点】bus 实例刻意不放进 reactive/readonly：
 * Vue 的 Proxy 会包装嵌套对象，而 EventBus 内部持有 BroadcastChannel 等原生宿主对象，
 * 通过代理调用原生方法会抛 Illegal invocation；且 bus 本身不需要响应式追踪。
 * 所以用模块级变量 + getBus() 暴露原始引用。
 */
let busRef: EventBus = new LocalEventBus()

export function getBus(): EventBus {
  return busRef
}

interface GlobalState {
  user: { id: string; username: string; nickname: string; role: string } | null
  permissions: PermCode[]
  standalone: boolean
}

const state = reactive<GlobalState>({
  user: null,
  permissions: [],
  standalone: true,
})

// 全局级订阅的解绑函数（组件级订阅在各自 onBeforeUnmount 里清理）
let disposeUserSub: (() => void) | null = null

export function setupFromProps(props: MicroAppProps): void {
  // 先清理上一轮的订阅（子应用反复挂载场景）
  disposeGlobal()

  if (props.bus) {
    // qiankun 环境：使用基座注入的 bus（中继枢纽）
    busRef = props.bus
    state.standalone = false
    const snap = props.getSnapshot?.()
    if (snap) {
      state.user = snap.user
      state.permissions = [...snap.permissions]
    }
  } else {
    // 独立运行：本地 bus 降级 + 默认管理员身份
    busRef = new LocalEventBus()
    state.standalone = true
    state.user = {
      id: 'U_standalone',
      username: 'standalone',
      nickname: '独立运行管理员',
      role: ROLE_ADMIN,
    }
    state.permissions = [
      PERM.PRODUCT_VIEW,
      PERM.PRODUCT_CREATE,
      PERM.PRODUCT_EDIT,
      PERM.PRODUCT_DELETE,
      PERM.PRODUCT_SHELF,
    ]
  }

  // 订阅基座下发的权限变更事件（联动场景1：按钮权限实时刷新）
  disposeUserSub = busRef.on(EVENT_USER_CHANGE, (payload: unknown) => {
    const p = payload as { user: GlobalState['user']; permissions: PermCode[] }
    state.user = p.user
    state.permissions = [...p.permissions]
  })
}

export const globalStore = readonly(state)

export function hasPerm(code: PermCode): boolean {
  return state.permissions.includes(code)
}

/**
 * 【面试点】解绑全局级订阅，由 main.ts 的 unmount 生命周期调用。
 * 全局订阅不挂在任何组件上，组件卸载钩子碰不到它，必须在应用级生命周期显式清理，
 * 否则反复挂载会叠加监听导致事件重复处理 + 内存泄漏。
 */
export function disposeGlobal(): void {
  if (disposeUserSub) {
    disposeUserSub()
    disposeUserSub = null
  }
}
