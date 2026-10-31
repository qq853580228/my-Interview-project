<template>
  <div class="demo-page">
    <a-typography-title :level="3">演示说明</a-typography-title>
    <a-typography-paragraph type="secondary">
      本平台为 qiankun 微前端架构：<b>main-vue 基座</b>（Vue3，负责登录/RBAC/菜单/消息中心/EventBus 中继）、
      <b>vue-sub 商品管理</b>（Vue3）、<b>react-sub 订单管理</b>（React19+TSX）。
      所有跨应用联动都经过基座 EventBus 中继（hub-and-spoke），子应用之间零耦合。
      UI 统一采用 Ant Design 体系：Vue 侧 ant-design-vue 4、React 侧 antd 5（两者均 CSS-in-JS）。
    </a-typography-paragraph>

    <a-card title="0. 启动方式" size="small" class="section">
      <a-typography-paragraph>
        <a-typography-text code>cd main-vue && npm install && npm run dev</a-typography-text>
        基座 http://localhost:5173<br />
        <a-typography-text code>cd vue-sub && npm install && npm run dev</a-typography-text>
        商品 http://localhost:5174/vue-sub/（可独立访问）<br />
        <a-typography-text code>cd react-sub && npm install && npm run dev</a-typography-text>
        订单 http://localhost:5175/react-sub/（可独立访问）
      </a-typography-paragraph>
      <p>
        演示账号：任意用户名 + 任意非空密码，角色可选 admin / operator / viewer。
        登录基座后通过左侧菜单进入子应用；子应用 dev server 未启动时会展示<b>加载错误降级 UI</b>（这本身也是演示点）。
      </p>
    </a-card>

    <a-card title="场景 1：用户/权限变更，基座实时下发两个子应用" size="small" class="section">
      <ol>
        <li>以 <b>admin</b> 登录，进入「商品管理」：可见 新增/编辑/删除/上下架 全部按钮。</li>
        <li>不退出登录，直接在<b>顶栏把角色切换为 viewer</b>。</li>
        <li>预期：商品页所有操作按钮立即消失（只剩查看）；切到「订单管理」，新建/退款按钮同样消失。</li>
        <li>再切回 operator：按钮恢复，但「删除商品」仍不可见（operator 无 product:delete）。</li>
      </ol>
      <a-alert
        type="info"
        show-icon
        message="原理"
        description="基座 switchRole → bus.emit('micro:user-change') → 两个子应用订阅后更新本地 permissions，按钮用 hasPerm() 条件渲染。子应用挂载时还会通过 props.getSnapshot() 拉取初始快照，保证后挂载的应用权限也正确。"
      />
    </a-card>

    <a-card title="场景 2：商品下架 → 订单应用禁止该商品生成新订单" size="small" class="section">
      <ol>
        <li>「商品管理」列表中选择 <b>机械键盘</b>，点击<b>下架</b>。</li>
        <li>页面出现提示「已通过基座EventBus通知订单应用」；基座右上角<b>铃铛红点 +1</b>（中继流水）。</li>
        <li>切到「订单管理」→ 事件日志区显示「收到商品下架事件：机械键盘已禁止生成新订单」。</li>
        <li>
          点「新建订单」：商品下拉中 <b>机械键盘显示「(已下架-禁止下单)」且不可选</b>；
          即使绕过前端（提交时二次校验读库），也会被拦截并提示。
        </li>
        <li>回到商品管理重新<b>上架</b>，订单应用即刻恢复可下单。</li>
      </ol>
      <a-alert
        type="info"
        show-icon
        message="原理"
        description="vue-sub 下架时写 mock 库（localStorage）+ emit('micro:product-offline')；react-sub 维护事件驱动的 offProducts 实时集合，且提交订单时再读库双重校验（防事件丢失/时序问题）。"
      />
    </a-card>

    <a-card title="场景 3：订单完成/退款 → 商品应用自动回补库存" size="small" class="section">
      <ol>
        <li>「订单管理」列表记下某订单（如 O1001 机械键盘 x1）。</li>
        <li>进入订单详情，按状态机操作：待支付→支付→发货→<b>确认完成</b>（或直接对未完成单点<b>退款</b>）。</li>
        <li>详情页提示「已通过基座EventBus通知商品应用回补库存 +n」。</li>
        <li>切到「商品管理」：事件日志区显示「收到订单事件…库存 +n」，对应商品<b>库存数字已增加</b>。</li>
      </ol>
      <a-alert
        type="info"
        show-icon
        message="原理"
        description="react-sub emit('micro:order-settled', { productId, quantity, type })；vue-sub 订阅后调用 restoreStock() 更新 mock 库并刷新列表。"
      />
    </a-card>

    <a-card title="场景 4：子应用业务告警上报 → 基座右上角红点" size="small" class="section">
      <ol>
        <li>「商品管理」列表点击<b>「上报低库存告警」</b>（对库存 &lt; 10 的商品，如无线鼠标）。</li>
        <li>「订单管理」列表点击<b>「模拟退款异常告警」</b>（error 级）。</li>
        <li>预期：基座右上角铃铛出现<b>红点角标</b>，点开可见告警明细（级别/来源/时间），支持全部已读、清空。</li>
      </ol>
      <a-alert
        type="info"
        show-icon
        message="原理"
        description="子应用 emit('micro:alarm-report')，基座订阅后写入通知中心 store；通知面板同时展示基座中继过的业务事件流水（下架/上架/订单结算），可以看到「中继」全过程。"
      />
    </a-card>

    <a-card title="进阶演示：双窗口并排联动" size="small" class="section">
      <p>
        开两个浏览器窗口都访问基座（同源 localhost:5173），一个进商品管理、一个进订单管理。
        窗口 A 下架商品 → 窗口 B 的订单页事件日志实时刷新（EventBus 内部用 <b>BroadcastChannel</b> 跨标签页中继，
        数据层用 localStorage 的 <b>storage 事件</b>跨标签页同步）。这说明该方案天然可扩展到多运营端场景。
      </p>
    </a-card>

    <a-card title="qiankun 能力核对清单（代码位置见 README）" size="small" class="section">
      <a-table size="small" :columns="capColumns" :data-source="capRows" :pagination="false" row-key="cap" />
    </a-card>

    <a-card title="常见追问速答" size="small" class="section">
      <a-collapse>
        <a-collapse-panel key="q1" header="为什么不用 qiankun 的 initGlobalState？">
          它面向「共享状态」（依赖 setState 浅比较触发），一次性业务事件（告警、下架通知）用状态表达会丢事件、语义别扭；
          自定义 EventBus 挂在 props 注入，事件即发即达，还能加 BroadcastChannel 跨页中继。
        </a-collapse-panel>
        <a-collapse-panel key="q2" header="数据为什么放 localStorage？">
          演示项目没有后端；qiankun 内子应用 JS 运行在基座页面上下文，localStorage 按基座同源共享，
          天然充当「共享 mock 后端」，且刷新不丢。事件负责「实时通知」，库负责「最终一致」，两层互补。
        </a-collapse-panel>
        <a-collapse-panel key="q3" header="子应用反复挂载会不会重复触发事件？">
          不会。所有 bus.on 的解绑函数收集在 disposers，unmount 生命周期统一执行
          （React 端还叠加 useEffect cleanup 双保险）。
        </a-collapse-panel>
        <a-collapse-panel key="q4" header="引入 antd 后为什么关掉 experimentalStyleIsolation？">
          antd v5 / ant-design-vue v4 用 CSS-in-JS 运行时注入样式，且 Modal/Select 等弹层默认渲染到 document.body；
          qiankun 的 css 重写（div[data-qiankun] 前缀）既难以稳定拦截运行时注入的 style，
          也会让 body 上的弹层选择器失配。因此保留 JS Proxy 沙箱，样式隔离交给 antd 自带的组件级
          hashed 类名；代价是子应用全局 reset 与基座共享，需统一用 reset.css 控制。
        </a-collapse-panel>
      </a-collapse>
      <p class="more">更多问答见仓库根目录 <code>micro-frontend/interview.md</code>。</p>
    </a-card>
  </div>
</template>

<script setup lang="ts">
  // 纯静态演示说明页，无逻辑；能力清单用 antd Table 数据驱动
  const capColumns = [
    { title: '能力', dataIndex: 'cap', width: 220 },
    { title: '实现位置', dataIndex: 'where', width: 320 },
    { title: '如何验证', dataIndex: 'verify' },
  ]

  const capRows = [
    {
      cap: '路由同步（history 模式 + catch-all）',
      where: '基座 router/index.ts + 子应用路由 base',
      verify: '子应用内跳转，浏览器地址栏始终同步为 /vue-sub/... 且可直接刷新、分享',
    },
    {
      cap: 'JS 沙箱',
      where: 'micro/index.ts start({ sandbox })',
      verify: '子应用改 window 全局变量，切走再回来不残留',
    },
    {
      cap: '样式隔离（antd 自带 + JS 沙箱）',
      where: 'start({ sandbox: true })；关闭 css 重写，见「常见追问速答」',
      verify: '子应用 antd 弹层/表格样式正常；三端统一 reset.css',
    },
    {
      cap: 'prefetch 预加载',
      where: "start({ prefetch: ['vue-sub','react-sub'] })",
      verify: '登录后 Network 面板可见空闲时预拉取子应用资源，首次切换秒开',
    },
    {
      cap: '加载错误降级',
      where: 'addGlobalUncaughtErrorHandler + renderFallback',
      verify: '关掉某个子应用 dev server 再进对应菜单，显示降级 UI 而非白屏',
    },
    {
      cap: 'unmount 清理订阅防泄漏',
      where: '两个子应用 main 生命周期 disposers',
      verify: '反复切换菜单 N 次再触发事件，子应用只响应一次（无重复订阅）',
    },
    {
      cap: '子应用独立运行',
      where: 'qiankunWindow.__POWERED_BY_QIANKUN__ 判断 + 本地 bus 降级',
      verify: '直接访问 :5174/vue-sub/、:5175/react-sub/，功能完整，顶部有独立运行横幅',
    },
  ]
</script>

<style scoped>
  .demo-page {
    max-width: 960px;
    margin: 0 auto;
    padding: 24px 32px 64px;
  }
  .section {
    margin-bottom: 16px;
  }
  ol {
    padding-left: 20px;
    margin-bottom: 12px;
  }
  .more {
    color: #888;
    font-size: 12px;
    margin-top: 12px;
  }
</style>
