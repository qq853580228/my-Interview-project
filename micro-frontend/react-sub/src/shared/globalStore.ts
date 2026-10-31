import { useSyncExternalStore } from 'react'
import {
  EVENT_PRODUCT_OFFLINE,
  EVENT_PRODUCT_ONLINE,
  EVENT_USER_CHANGE,
  PERM,
  PRODUCT_OFF,
  ROLE_ADMIN,
  type EventBus,
  type MicroAppProps,
  type PermCode,
  type ProductShelfPayload,
  type UserChangePayload,
  type UserInfo,
} from './contract'
import { LocalEventBus } from './localBus'
import { loadProducts } from './mockDb'

export interface GlobalState {
  bus: EventBus
  user: UserInfo | null
  permissions: PermCode[]
  standalone: boolean
  offProducts: Set<string>
}

const ALL_PERMS: PermCode[] = [
  PERM.PRODUCT_VIEW, PERM.PRODUCT_CREATE, PERM.PRODUCT_EDIT, PERM.PRODUCT_DELETE, PERM.PRODUCT_SHELF,
  PERM.ORDER_VIEW, PERM.ORDER_CREATE, PERM.ORDER_EDIT, PERM.ORDER_REFUND,
]

const DEFAULT_LOCAL_USER: UserInfo = {
  id: 'local-admin',
  username: ROLE_ADMIN,
  nickname: '独立运行管理员',
  role: ROLE_ADMIN,
}

function initialOffProducts(): Set<string> {
  return new Set(loadProducts().filter((p) => p.status === PRODUCT_OFF).map((p) => p.id))
}

let state: GlobalState = {
  bus: new LocalEventBus(),
  user: DEFAULT_LOCAL_USER,
  permissions: ALL_PERMS,
  standalone: true,
  offProducts: new Set(),
}

const listeners = new Set<() => void>()
let busDisposers: Array<() => void> = []

function setState(patch: Partial<GlobalState>): void {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

export function setupFromProps(props: MicroAppProps): Array<() => void> {
  teardown()

  const standalone = !props.bus
  const bus: EventBus = props.bus ?? new LocalEventBus()

  if (standalone) {
    setState({
      bus,
      standalone: true,
      user: DEFAULT_LOCAL_USER,
      permissions: ALL_PERMS,
      offProducts: initialOffProducts(),
    })
  } else {
    const snapshot = props.getSnapshot?.()
    setState({
      bus,
      standalone: false,
      user: snapshot?.user ?? null,
      permissions: snapshot?.permissions ?? [],
      offProducts: initialOffProducts(),
    })
  }

  busDisposers = [
    bus.on(EVENT_USER_CHANGE, (payload: unknown) => {
      const p = payload as UserChangePayload
      setState({ user: p.user, permissions: p.permissions })
    }),
    bus.on(EVENT_PRODUCT_OFFLINE, (payload: unknown) => {
      const p = payload as ProductShelfPayload
      const next = new Set(state.offProducts)
      next.add(p.productId)
      setState({ offProducts: next })
    }),
    bus.on(EVENT_PRODUCT_ONLINE, (payload: unknown) => {
      const p = payload as ProductShelfPayload
      const next = new Set(state.offProducts)
      next.delete(p.productId)
      setState({ offProducts: next })
    }),
  ]
  return busDisposers
}

export function teardown(): void {
  busDisposers.forEach((d) => d())
  busDisposers = []
}

export function getState(): GlobalState {
  return state
}

export function hasPerm(code: PermCode): boolean {
  return state.permissions.includes(code)
}

export function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function useGlobal(): GlobalState {
  return useSyncExternalStore(subscribe, getState)
}
