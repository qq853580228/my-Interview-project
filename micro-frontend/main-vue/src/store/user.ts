import { computed, reactive } from 'vue'
import type { PermCode, Role, UserInfo } from '../shared/contract'
import { EVENT_USER_CHANGE, ROLE_PERMS, STORAGE_KEY_USER } from '../shared/contract'
import { bus } from '../shared/EventBus'
import { pushSystem } from './notification'

/**
 * 基座用户/权限中心（单一可信源）
 * 【面试点】权限状态只存在基座，子应用通过 props 快照 + user-change 事件同步，
 * 避免各子应用各自维护一份权限导致不一致；变更走事件下发，子应用无需感知来源。
 */
export const userStore = reactive({
  user: readStoredUser(),
})

export const permissions = computed<PermCode[]>(() =>
  userStore.user ? ROLE_PERMS[userStore.user.role] : []
)

export function hasPerm(code: PermCode): boolean {
  return permissions.value.includes(code)
}

function readStoredUser(): UserInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER)
    return raw ? (JSON.parse(raw) as UserInfo) : null
  } catch {
    return null
  }
}

function persist(): void {
  if (userStore.user) {
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userStore.user))
  } else {
    localStorage.removeItem(STORAGE_KEY_USER)
  }
}

/** 变更后统一下发：所有已挂载子应用收到事件刷新按钮权限（联动场景1） */
function broadcastUserChange(): void {
  bus.emit(EVENT_USER_CHANGE, {
    user: userStore.user,
    permissions: permissions.value,
  })
}

export function login(username: string, role: Role): void {
  userStore.user = {
    id: `U_${role}`,
    username,
    nickname: username,
    role,
  }
  persist()
  broadcastUserChange()
  pushSystem('登录成功', `用户「${username}」以角色 ${role} 登录，权限已下发子应用`)
}

/** 演示场景1：不退出登录直接切换角色，触发权限变更事件 */
export function switchRole(role: Role): void {
  if (!userStore.user || userStore.user.role === role) return
  userStore.user = { ...userStore.user, role }
  persist()
  broadcastUserChange()
  pushSystem('权限变更', `角色切换为 ${role}，已通过 EventBus 下发 user-change 事件`)
}

export function logout(): void {
  const name = userStore.user?.nickname
  userStore.user = null
  persist()
  broadcastUserChange()
  pushSystem('退出登录', `用户「${name}」已退出`)
}

/** 通过 qiankun props 注入子应用：mount 时拉取最新快照 */
export function getSnapshot() {
  return { user: userStore.user, permissions: permissions.value }
}
