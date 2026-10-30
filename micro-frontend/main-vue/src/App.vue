<template>
  <div class="main">
    <h2>主应用（Vue3）</h2>
    <nav style="margin-bottom:12px">
      <a :href="SUB_APP_NAME_VUE_PATH">打开Vue子应用</a> |
      <a :href="SUB_APP_NAME_REACT_PATH">打开React子应用</a>
    </nav>
    <!-- 子应用挂载容器 -->
    <div :id="MICRO_APP_CONTAINER"></div>
  </div>
</template>

<script setup>
  import { MICRO_APP_CONTAINER, SUB_APP_NAME_VUE_PATH, SUB_APP_NAME_REACT_PATH } from './constant'
</script>
