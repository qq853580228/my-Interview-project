# 微前端统一运营管控平台 —— 面试问答

> 配合 `README.md` 与基座「演示说明」页使用。

---

## 1. 为什么选 qiankun？和 Module Federation、iframe 比呢？

| 方案 | 优势 | 劣势 | 适用场景 |
|---|---|---|---|
| **qiankun** | 路由/JS 沙箱/样式隔离一体化；对 vite 子应用有插件支持；社区成熟 | 子应用 JS 跑在基座页面上下文，沙箱可穿透；css 重写与 cssinjs 有冲突 | 中大型存量系统微前端改造 |
| **Module Federation** | 原生 Webpack/Rolldown 模块级共享；类型安全 | 跨技术栈（Vue/React）共享状态需额外设计；无内置沙箱 | 同技术栈多团队协作 |
| **iframe** | 天然进程级隔离，样式零冲突 | 性能开销大；父子通信繁琐；弹窗/浮层体验差 | 嵌入式第三方插件 |

本项目同时包含 Vue + React，跨技术栈联动是核心诉求，qiankun 的 EventBus 中继模式天然适合。

## 2. 跨应用通信为什么不用 qiankun 的 `initGlobalState`？

`initGlobalState` 是「共享状态」模型——依赖 `setState` 浅比较触发监听。但本项目的事件语义是**一次性的业务事件**（告警、下架通知、订单结算），用状态表达会：

- **丢事件**：短时间内连续下发同 payload，浅比较无变化，监听不会触发；
- **语义别扭**：告警是「发生了一次」，不是「状态变成 X」。

自定义 EventBus 挂在 `props` 注入：
- 事件即发即达（pub/sub）；
- 订阅解绑函数返回给子应用收集进 disposers，unmount 统一清理；
- 还能叠 `BroadcastChannel` 实现跨窗口中继，零额外成本。

## 3. 数据为什么放 localStorage？

演示项目无后端；qiankun 内子应用 JS 运行在基座页面上下文，localStorage 按基座同源共享（`:5173`），天然充当「共享 mock 后端」，且刷新不丢。

- **事件负责「实时通知」**：跨应用的即时联动（下架禁下单、结算回补库存）；
- **库负责「最终一致」**：即使订阅方当时未挂载，重新挂载后读库也能拿到最新状态；
- 两层互补，避免了「事件丢了状态就错了」的脆弱性。

## 4. 子应用反复挂载会不会重复触发事件 / 内存泄漏？

**不会。** 清理分三层：

1. **组件级**：Vue 的 `onBeforeUnmount`、React 的 `useEffect cleanup`——组件树销毁时自动触发；
2. **全局 store 级**：`bus.on` 的解绑函数收集进 `disposers` 数组，由 `main.ts` 的 qiankun `unmount` 生命周期统一执行（store 级订阅不挂在组件树上，卸载钩子碰不到）；
3. **基座级**：基座 `MainLayout` 的 `document.click` 监听也在 `onBeforeUnmount` 里移除（改用 antd Popover 后已消除）。

反复切菜单 N 次再触发事件，订阅数始终为 1，事件日志只出现一条。

## 5. 子应用独立运行（不挂在基座）怎么做到的？

```ts
// main.tsx
if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  render({})  // 降级：本地 bus + 默认管理员全量权限
}
```

- `bus`：从 `props.bus`（基座中继）降级为 `LocalEventBus`（仅本应用内广播，无跨应用能力）；
- `user/permissions`：给默认管理员全量权限，方便单应用调试；
- 顶部展示独立运行横幅，提醒跨应用联动需在基座中演示。

直接访问 `:5174/vue-sub/`、`:5175/react-sub/` 功能完整，可作为独立微前端演示「单跑 vs 接入」两种形态。

## 6. RBAC 权限是怎么设计的？

- **单一可信源**：权限只在基座 `store/user.ts` 维护（`ROLE_PERMS` 映射表）；
- **注入方式**：qiankun `props.getSnapshot()` 在 mount 时拉取快照（`permissions: PermCode[]`）；
- **实时同步**：基座 `switchRole` → `bus.emit('micro:user-change')` → 两子应用订阅后更新本地 permissions；
- **按钮级控制**：子应用用 `hasPerm('product:create')` 条件渲染；
- 子应用**不维护**权限码映射，避免各应用各自一份导致不一致。

## 7. 为什么关掉 `experimentalStyleIsolation` 改用 antd 自带隔离？

qiankun 的 `experimentalStyleIsolation` 是 css 选择器重写（给子应用样式加 `div[data-qiankun="xxx"]` 前缀）。但本项目引入 antd / ant-design-vue（两者均 CSS-in-JS）后，存在两个不兼容：

1. **cssinjs 运行时注入**：antd 通过 JS 动态注入 `<style>`，qiankun 的重写器对运行时注入的样式拦截不稳定；
2. **弹层 body portal**：Modal / Select / DatePicker / message 默认渲染到 `document.body`，被重写的选择器（`div[data-qiankun] .ant-modal`）匹配不到 body 上的弹层，导致样式丢失。

因此选择：

- **保留 JS Proxy 沙箱**（`sandbox: true`），子应用 window 修改被隔离；
- **关闭 css 重写**，样式隔离交给 antd 自带的组件级 hashed 类名 + 三端统一 `reset.css`；
- 代价：三端共享 `.ant-*` 类前缀与全局 reset（可接受，antd 的 `.ant-*` 自带作用域，reset 三端统一）；
- 生产环境可借 `ConfigProvider` 的 `prefixCls` 给 React 侧改前缀（如 `ra-`），或用 Shadow DOM 严格隔离。

## 8. qiankun 的 JS 沙箱原理？

qiankun 默认开启 Proxy 沙箱：

1. **快照**：子应用 mount 前，对当前 `window` 做 Proxy 代理，所有写操作记录到快照 Map；
2. **读操作**：先查快照，快照没有再读真实 window；
3. **unmount 清理**：丢弃快照，子应用对 window 的修改全部失效。

限制：Proxy 沙箱可被 `window.eval` 等绕过（不在面试点范围内，知道即可）。

## 9. prefetch 原理？为什么用数组形式？

```ts
start({ prefetch: ['vue-sub', 'react-sub'] })
```

- **时机**：`requestIdleCallback` 在浏览器空闲时触发；
- **行为**：预拉取指定子应用的 entry HTML + 静态资源到浏览器缓存；
- **效果**：用户首次切换子应用时秒开，无需等待网络；
- **数组 vs `true`**：数组只对指定应用预加载（可控）；`true` 全量预加载（资源浪费）。本项目只有两个子应用，数组已足够。

## 10. 加载错误降级怎么做？

```ts
addGlobalUncaughtErrorHandler((event) => {
  // 从错误信息里提取子应用 entry 地址，判断是哪个应用挂了
  const appName = msg.includes('5175') ? SUB_APP_NAME_REACT : SUB_APP_NAME_VUE
  renderFallback(appName, msg)  // 容器内渲染降级 UI
  pushAlarm(...)                 // 告警上报到基座通知中心
})
```

- **降级 UI**：容器内 `createElement` 插入提示，含刷新按钮；
- **告警上报**：走同一套 `micro:alarm-report` 通道，右上角铃铛红点 +1；
- **演示点**：关掉某个子应用 dev server 再进对应菜单，即可看到降级 UI 而非白屏。

## 11. 为什么没加 Tailwind / 原子 CSS？

- antd 本身是 CSS-in-JS，组件样式自带、按需注入；布局/间距有 `Space` / `Flex` / `Grid` / `Layout` 现成方案，原子 CSS 的主战场基本被覆盖；
- Tailwind 的 Preflight（reset）会与 antd 的 `reset.css` 冲突，在 qiankun 多应用共享 document 的环境里排错成本更高；
- 本项目定位是「qiankun + 跨应用联动」演示，UI 层引入一个组件库已足够，再加原子框架是负复杂度；
- 真实项目若需原子 CSS，建议仅在基座侧引入（避免与子应用 reset 打架），或选用 Tailwind 4 的 `@theme` 机制做作用域隔离。

## 12. 生产化改进方向

| 改进点 | 说明 |
|---|---|
| UI 库按需加载 | antd v5 默认支持 tree-shaking；ant-design-vue 需配 `unplugin-vue-components` 实现按需 |
| 通信契约抽包 | 把 `shared/contract.ts` 抽成 `@scope/micro-contract` npm 私有包，三端共享单一可信源 |
| 样式隔离强化 | ConfigProvider `prefixCls` 改名 / Shadow DOM 严格隔离 / CSS Modules |
| 数据层换后端 | localStorage mock 替换为真实 API；EventBus 升级为 WebSocket 实时通道 |
| 监控与埋点 | 子应用加载耗时、跨应用事件链路追踪、错误上报接入 APM |
| 子应用版本管控 | 子应用发布独立版本，基座通过 entry URL 切换版本（灰度/回滚） |
