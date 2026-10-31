<template>
  <a-layout class="app">
    <a-layout-header class="header">
      <a-typography-title :level="4" class="header-title">商品管理（vue-sub）</a-typography-title>
      <a-tag v-if="globalStore.user" color="blue">
        {{ globalStore.user.nickname }}（{{ globalStore.user.role }}）
      </a-tag>
    </a-layout-header>

    <a-alert
      v-if="globalStore.standalone"
      banner
      type="warning"
      message="独立运行模式：跨应用事件联动（如商品下架通知订单应用）需在基座中演示"
    />

    <a-layout-content class="content">
      <router-view />
    </a-layout-content>
  </a-layout>
</template>

<script setup lang="ts">
  import { globalStore } from './store/global'
</script>

<style scoped>
  .app {
    min-height: 100vh;
    background: #f5f7fa;
  }
  .header {
    background: #fff;
    padding: 0 24px;
    height: 56px;
    line-height: 56px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #f0f0f0;
  }
  .header-title {
    margin: 0;
  }
  .content {
    padding: 24px;
  }
</style>
