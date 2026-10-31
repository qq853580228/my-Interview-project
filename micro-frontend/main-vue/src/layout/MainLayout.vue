<template>
  <a-layout class="layout">
    <!-- 侧边菜单导航 -->
    <a-layout-sider theme="dark" width="220">
      <div class="logo">微前端运营管控平台</div>
      <a-menu
        theme="dark"
        mode="inline"
        :selected-keys="selectedKeys"
        @click="onMenuClick"
      >
        <a-menu-item key="/demo">
          <ReadOutlined />
          <span>演示说明</span>
        </a-menu-item>
        <a-menu-item v-if="hasPerm(PERM.PRODUCT_VIEW)" :key="SUB_APP_NAME_VUE_PATH + '/products'">
          <ShoppingOutlined />
          <span>商品管理 <a-tag color="blue">vue-sub</a-tag></span>
        </a-menu-item>
        <a-menu-item v-if="hasPerm(PERM.ORDER_VIEW)" :key="SUB_APP_NAME_REACT_PATH + '/orders'">
          <FileTextOutlined />
          <span>订单管理 <a-tag color="cyan">react-sub</a-tag></span>
        </a-menu-item>
      </a-menu>
      <div class="sider-footer">
        <div>当前角色：{{ user ? ROLE_LABELS[user.role] : '-' }}</div>
        <div class="perm-list">权限码：{{ permissions.join(', ') || '无' }}</div>
      </div>
    </a-layout-sider>

    <a-layout>
      <!-- 顶栏：用户信息 / 角色切换 / 消息通知中心 -->
      <a-layout-header class="header">
        <div class="header-title">统一运营管控平台（基座 main-vue）</div>
        <a-space size="middle">
          <!-- 演示场景1：直接切换角色触发权限变更事件下发 -->
          <a-space size="small">
            <span class="role-label">切换角色：</span>
            <a-select
              size="small"
              style="width: 230px"
              :value="user?.role"
              :options="ROLE_OPTIONS"
              @change="onSwitchRole"
            />
          </a-space>
          <a-tag v-if="user">{{ user.nickname }}（{{ user.role }}）</a-tag>

          <!-- 消息通知中心：联动场景4 的红点在这里（Badge 数字 + Popover 面板） -->
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
  import { computed } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import {
    BellOutlined,
    FileTextOutlined,
    ReadOutlined,
    ShoppingOutlined,
  } from '@ant-design/icons-vue'
  import { userStore, permissions, hasPerm, switchRole, logout } from '../store/user'
  import { notificationStore, unreadCount, markAllRead, clearAll } from '../store/notification'
  import { PERM, ROLE_LABELS, ROLE_OPTIONS, type Role } from '../shared/contract'
  import { MICRO_APP_CONTAINER, SUB_APP_NAME_VUE_PATH, SUB_APP_NAME_REACT_PATH } from '../constant'

  const route = useRoute()
  const router = useRouter()
  const user = computed(() => userStore.user)

  // MICRO_APP_CONTAINER 是 CSS 选择器 '#micro-container'，模板 id 属性只需去掉 '#'
  const containerId = MICRO_APP_CONTAINER.replace(/^#/, '')

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
</script>

<style scoped>
  .layout {
    height: 100vh;
  }
  .logo {
    padding: 16px;
    color: #fff;
    font-weight: bold;
    font-size: 15px;
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
  }
  .header-title {
    font-size: 15px;
    font-weight: 600;
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
    :deep(.ant-layout-sider) {
      width: 60px !important;
      min-width: 60px !important;
    }

    .logo {
      font-size: 0;
      overflow: hidden;
    }

    :deep(.ant-menu-inline) {
      --antd-menu-item-height: 52px;
    }

    :deep(.ant-menu-item),
    :deep(.ant-menu-submenu-title) {
      justify-content: center;
      padding: 0 !important;
    }

    :deep(.ant-menu-item span),
    :deep(.ant-menu-item .ant-tag),
    :deep(.ant-menu-submenu-title span) {
      display: none;
    }

    :deep(.ant-menu-item .anticon),
    :deep(.ant-menu-submenu-title .anticon) {
      margin-right: 0 !important;
      font-size: 18px;
    }

    .sider-footer {
      display: none;
    }

    .header {
      padding: 0 12px;
      height: 48px;
      line-height: 48px;
    }

    .header-title {
      font-size: 14px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 50%;
    }

    :deep(.ant-select-selector) {
      min-width: unset;
    }

    .role-label {
      display: none;
    }

    :deep(.ant-btn) {
      padding: 4px 8px;
      font-size: 12px;
    }

    :deep(.ant-popover-inner) {
      max-width: 90vw;
    }
  }

  /* 手机设备（480px 及以下）*/
  @media screen and (max-width: 480px) {
    :deep(.ant-layout-header) {
      padding: 0 8px;
    }

    .header-title {
      font-size: 13px;
    }

    :deep(.ant-badge-count) {
      font-size: 10px;
      min-width: 16px;
      height: 16px;
      line-height: 16px;
    }

    :deep(.ant-list-item) {
      padding: 12px 8px;
    }

    .notice-msg,
    .notice-time {
      font-size: 11px;
    }
  }
</style>
