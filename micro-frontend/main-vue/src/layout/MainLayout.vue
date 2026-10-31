<template>
  <a-layout class="layout">
    <!-- 移动端遮罩层 -->
    <div v-if="isMobile" class="sider-overlay" :class="{ 'overlay-show': !isCollapsed }" @click="toggleSider"></div>
    <a-layout-sider
      theme="dark"
      :width="siderWidth"
      :collapsed="isCollapsed && !isMobile"
      :trigger="null"
      :class="{ 'sider-mobile': isMobile }"
      v-show="!isMobile || !isCollapsed"
    >
      <div class="logo">
        <img v-if="isCollapsed && !isMobile" :src="logoIcon" class="logo-icon" />
        <span v-if="!isCollapsed || isMobile">微前端运营管控平台</span>
      </div>
      <a-menu
        theme="dark"
        mode="inline"
        :selected-keys="selectedKeys"
        @click="onMenuClick"
      >
        <a-menu-item key="/demo">
          <ReadOutlined />
          <span v-show="!(isCollapsed && !isMobile)">演示说明</span>
        </a-menu-item>
        <a-menu-item v-if="hasPerm(PERM.PRODUCT_VIEW)" :key="SUB_APP_NAME_VUE_PATH + '/products'">
          <ShoppingOutlined />
          <span v-show="!(isCollapsed && !isMobile)">商品管理 <a-tag color="blue">vue-sub</a-tag></span>
        </a-menu-item>
        <a-menu-item v-if="hasPerm(PERM.ORDER_VIEW)" :key="SUB_APP_NAME_REACT_PATH + '/orders'">
          <FileTextOutlined />
          <span v-show="!(isCollapsed && !isMobile)">订单管理 <a-tag color="cyan">react-sub</a-tag></span>
        </a-menu-item>
      </a-menu>
      <div class="sider-footer" v-show="!isCollapsed && !isMobile">
        <div>当前角色：{{ user ? ROLE_LABELS[user.role] : '-' }}</div>
        <div class="perm-list">权限码：{{ permissions.join(', ') || '无' }}</div>
      </div>
    </a-layout-sider>

    <a-layout>
      <!-- 顶栏：用户信息 / 角色切换 / 消息通知中心 -->
      <a-layout-header class="header">
        <div class="header-left">
          <MenuUnfoldOutlined
            v-if="!isMobile"
            class="menu-trigger-desktop"
            :class="{ rotated: isCollapsed }"
            @click="toggleSider"
          />
          <span class="header-title">统一运营管控平台</span>
          <span class="header-title-mobile">运营管控</span>
          <MenuFoldOutlined
            v-if="isMobile"
            class="menu-trigger-mobile"
            @click="toggleSider"
          />
        </div>
        <a-space size="small" class="header-actions">
          <span class="role-label">切换角色：</span>
          <a-select
            size="small"
            style="width: 180px"
            :value="user?.role"
            :options="ROLE_OPTIONS"
            @change="onSwitchRole"
          />
          <a-tag v-if="user">{{ user.nickname }}（{{ user.role }}）</a-tag>

          <!-- 消息通知中心：联动场景 4 的红点在这里（Badge 数字 + Popover 面板） -->
          <a-popover trigger="click" placement="bottomRight">
            <template #content>
              <div style="width: 360px">
                <a-flex justify="space-between" align="center" style="margin-bottom: 8px">
                  <b>消息通知（{{ unreadCount }} 条未读）</b>
                  <a-space size="small">
                    <a-button type="link" size="small" @click="markAllRead">全部已读</a-button>
                    <a-button type="link" size="small" danger @click="clearAll">清空</a-button>
                  </a-space>
                </a-flex>
                <a-list
                  size="small"
                  :data-source="notificationStore.items"
                  style="max-height: 360px; overflow-y: auto"
                >
                  <template #renderItem="{ item }">
                    <a-list-item class="notice-item" :class="{ unread: !item.read }" @click="item.read = true">
                      <div>
                        <div>
                          <a-tag :color="item.level === 'error' ? 'red' : item.level === 'warn' ? 'orange' : 'blue'">
                            {{ item.type === 'alarm' ? '告警' : '系统' }}
                          </a-tag>
                          <b>[{{ item.source }}] {{ item.title }}</b>
                        </div>
                        <div class="notice-msg">{{ item.message }}</div>
                        <div class="notice-time">{{ formatTime(item.time) }}</div>
                      </div>
                    </a-list-item>
                  </template>
                  <template #header>
                    <div v-if="notificationStore.items.length === 0" class="notice-empty">暂无消息</div>
                  </template>
                </a-list>
              </div>
            </template>
            <a-badge :count="unreadCount" :overflow-count="99">
              <a-button type="text"><BellOutlined style="font-size: 18px" /></a-button>
            </a-badge>
          </a-popover>

          <a-button size="small" @click="onLogout">退出</a-button>
        </a-space>
      </a-layout-header>

      <a-layout-content class="content">
        <!-- 基座自有页面用 v-show 而非 v-if/销毁式渲染 -->
        <router-view v-show="!isSubRoute" />
        <!--
          子应用挂载容器：常驻 DOM，用 v-show 控制显隐
          【面试点】容器绝不能放进 router-view 或加 v-if——
          主应用路由在子应用内部跳转时也会 re-resolve（catch-all 参数变化），
          若容器随之销毁重建，qiankun 已挂载的子应用 DOM 会直接丢失
        -->
        <div :id="containerId" v-show="isSubRoute"></div>
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
  import { computed, ref, onMounted, onUnmounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import {
    BellOutlined,
    FileTextOutlined,
    ReadOutlined,
    ShoppingOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
  } from '@ant-design/icons-vue'
  import { userStore, permissions, hasPerm, switchRole, logout } from '../store/user'
  import { notificationStore, unreadCount, markAllRead, clearAll } from '../store/notification'
  import { PERM, ROLE_LABELS, ROLE_OPTIONS, type Role } from '../shared/contract'
  import { MICRO_APP_CONTAINER, SUB_APP_NAME_VUE_PATH, SUB_APP_NAME_REACT_PATH } from '../constant'
  import logoIcon from '../assets/vue.svg'

  const route = useRoute()
  const router = useRouter()
  const user = computed(() => userStore.user)

  // MICRO_APP_CONTAINER 是 CSS 选择器 '#micro-container'，模板 id 属性只需去掉 '#'
  const containerId = MICRO_APP_CONTAINER.replace(/^#/, '')

  // 侧边栏状态
  const isCollapsed = ref(false)
  const isMobile = ref(false)
  const SIDER_WIDTH = 220
  const COLLAPSED_WIDTH = 80

  // 桌面端：展开 220px，收起 80px
  // 移动端：完全由 v-show 控制显示/隐藏
  const siderWidth = computed(() => {
    if (isCollapsed.value && !isMobile.value) return COLLAPSED_WIDTH
    return SIDER_WIDTH
  })

  // 检测屏幕尺寸并控制侧边栏行为（仅在初始化或断点跨越时生效）
  const checkMobile = () => {
    const prevIsMobile = isMobile.value
    isMobile.value = window.innerWidth <= 768

    // 只在跨断点时改变折叠状态
    if (prevIsMobile && !isMobile.value) {
      // 从移动端切换到桌面端：展开侧边栏
      isCollapsed.value = false
    } else if (!prevIsMobile && isMobile.value) {
      // 从桌面端切换到移动端：收起侧边栏
      isCollapsed.value = true
    }
    // 同一断点内不改变折叠状态
  }

  const handleResize = () => {
    checkMobile()
  }

  // 切换侧边栏
  function toggleSider(): void {
    isCollapsed.value = !isCollapsed.value
  }

  // 菜单高亮与基座路由联动：子应用内部跳转时保持对应菜单项选中
  const selectedKeys = computed(() => {
    if (route.path.startsWith(SUB_APP_NAME_VUE_PATH)) return [SUB_APP_NAME_VUE_PATH + '/products']
    if (route.path.startsWith(SUB_APP_NAME_REACT_PATH)) return [SUB_APP_NAME_REACT_PATH + '/orders']
    return ['/demo']
  })

  const isSubRoute = computed(
    () =>
      route.path.startsWith(SUB_APP_NAME_VUE_PATH) ||
      route.path.startsWith(SUB_APP_NAME_REACT_PATH)
  )

  function onMenuClick(info: { key: string }): void {
    // 【修复】qiankun 沙箱内 location 可能被 React 子应用的 useNavigate 污染，
    // 直接用 router.push 可能触发 "undefined/" URL 错误，
    history.pushState(null, info.key, info.key)
    // 移动端点击菜单后自动收起侧边栏
    if (isMobile.value) {
      isCollapsed.value = true
    }
  }

  function onSwitchRole(role: Role): void {
    switchRole(role)
  }

  function onLogout(): void {
    logout()
    router.push('/login')
  }

  function formatTime(t: number): string {
    return new Date(t).toLocaleTimeString('zh-CN', { hour12: false })
  }

  // 生命周期
  onMounted(() => {
    checkMobile()
    window.addEventListener('resize', handleResize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })
</script>

<style scoped>
  .layout {
    height: 100vh;
  }

  /* Logo 区域 */
  .logo {
    padding: 16px;
    color: #fff;
    font-weight: bold;
    font-size: 15px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    height: 52px;
    gap: 8px;
  }

  .logo span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Vue Logo 图标 */
  .logo-icon {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
  }

  /* 收起状态下的 logo - 只显示图标 */
  :deep(.ant-layout-sider-collapsed) .logo {
    justify-content: center;
    padding: 16px 0;
  }

  :deep(.ant-layout-sider-collapsed) .logo span {
    display: none;
  }

  :deep(.ant-layout-sider-collapsed) .logo-icon {
    display: block;
  }

  /* 顶栏左侧布局（菜单按钮 + 标题） */
  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    min-width: 0;
  }

  .menu-trigger-desktop,
  .menu-trigger-mobile {
    cursor: pointer;
    font-size: 18px;
    color: #666;
  }

  .menu-trigger-desktop:hover,
  .menu-trigger-mobile:hover {
    color: #1890ff;
  }

  .menu-trigger-desktop.rotated {
    transform: rotate(180deg);
  }

  /* 移动端遮罩层 - z-index 低于侧边栏但高于内容 */
  .sider-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 99;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s;
  }

  .sider-overlay.overlay-show {
    opacity: 1;
    pointer-events: auto;
  }

  /* 移动端侧边栏样式 */
  .sider-mobile {
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
  }

  /* 移动端布局：侧边栏完全脱离文档流 */
  @media screen and (max-width: 768px) {
    :deep(.ant-layout-sider:not(.ant-layout-sider-collapsed)) {
      position: fixed !important;
      left: 0;
      top: 0;
      bottom: 0;
      width: 220px !important;
      z-index: 100;
      margin: 0 !important;
      box-shadow: 2px 0 16px rgba(0, 0, 0, 0.3);
    }

    /* 移动端收起状态 - 完全隐藏 */
    :deep(.ant-layout-sider.sider-mobile.collapsed) {
      display: none !important;
    }

    :deep(.ant-layout-sider) {
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                  opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                  visibility 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
  }

  /* 桌面端侧边栏收起动画 */
  @media screen and (min-width: 769px) {
    :deep(.ant-layout-sider-collapsed) {
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                  min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
  }

  .sider-footer {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 12px 16px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.55);
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
  .perm-list {
    margin-top: 4px;
    word-break: break-all;
  }
  .header {
    height: 52px;
    line-height: 52px;
    padding: 0 16px;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #f0f0f0;
    overflow: visible;
  }

  .header-title {
    font-size: 14px;
    font-weight: 600;
    /* 长标题省略 */
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    order: 1;
    flex-shrink: 0;
    min-width: 0;
  }

  .header-title-mobile {
    font-size: 14px;
    font-weight: 600;
    display: none;
  }

  .header-actions {
    justify-content: flex-end;
  }

  .header-actions :deep(.ant-space) {
    flex-wrap: wrap;
  }

  :deep(.ant-badge) {
    flex-shrink: 0;
    margin-left: 4px;
    order: 3;
  }

  :deep(.ant-space-item) {
    flex-shrink: 0;
    order: 2;
  }
  .role-label {
    font-size: 13px;
    color: #555;
  }
  .content {
    overflow-y: auto;
    background: #f7f8fa;
  }
  .notice-item {
    cursor: pointer;
  }
  .notice-item.unread {
    background: #f0f7ff;
  }
  .notice-msg {
    color: #666;
    font-size: 12px;
    margin-top: 2px;
  }
  .notice-time {
    color: #aaa;
    font-size: 12px;
    margin-top: 2px;
  }
  .notice-empty {
    padding: 24px;
    text-align: center;
    color: #999;
  }

  /* ========== 移动端适配 ========= */

  /* 平板及以下设备（768px）*/
  @media screen and (max-width: 768px) {
    .header {
      padding: 0 8px;
      height: 48px;
      line-height: 48px;
      overflow: hidden;
    }

    .header-left {
      gap: 4px;
      flex-shrink: 0;
      min-width: 0;
    }

    .menu-trigger-desktop {
      display: none;
    }

    .menu-trigger-mobile {
      display: inline-block;
      font-size: 18px;
      margin-right: 2px;
      flex-shrink: 0;
    }

    .header-title {
      font-size: 13px;
      max-width: 80px;
      order: 1;
      display: none !important;
      flex-shrink: 0;
      min-width: 0;
    }

    .header-title-mobile {
      font-size: 14px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      order: 1;
      display: block !important;
      flex-shrink: 0;
      max-width: 80px;
      min-width: 0;
    }

    .header-actions {
      order: 2;
      flex: 1;
      justify-content: flex-end;
      gap: 4px !important;
      min-width: 0;
    }

    .header-actions :deep(.ant-space-item) {
      flex-shrink: 0;
    }

    .role-label {
      display: none;
    }

    :deep(.ant-select) {
      max-width: 120px;
    }

    :deep(.ant-select-selector) {
      min-width: unset !important;
      padding: 2px 6px !important;
      font-size: 12px;
      height: 28px !important;
    }

    :deep(.ant-tag) {
      margin-left: 0;
      padding: 1px 4px;
      font-size: 11px;
      height: 20px;
      line-height: 18px;
    }

    :deep(.ant-btn) {
      padding: 2px 6px !important;
      font-size: 11px;
      min-height: 28px !important;
      height: 28px !important;
    }

    :deep(.ant-badge) {
      margin-left: 0;
    }

    :deep(.ant-badge-count) {
      font-size: 10px;
      min-width: 16px;
      height: 16px;
      line-height: 16px;
    }

    :deep(.ant-popover-inner) {
      max-width: 85vw;
    }

    :deep(.ant-popover-inner-content) {
      padding: 8px;
    }

    :deep(.ant-list-item) {
      padding: 8px 4px;
    }

    .notice-msg,
    .notice-time {
      font-size: 11px;
    }
  }

  /* 手机设备（480px 及以下）*/
  @media screen and (max-width: 480px) {
    .header {
      padding: 0 4px;
    }

    .header-title-mobile {
      font-size: 13px;
      max-width: 60px;
    }

    :deep(.ant-select) {
      max-width: 80px;
    }
  }
</style>
