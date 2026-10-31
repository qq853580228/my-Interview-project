<script setup lang="ts">
  import { useRouter } from 'vue-router'

  const router = useRouter()
</script>

<template>
  <a-result status="404" title="404" sub-title="页面不存在，请检查地址栏路径是否正确。">
    <template #extra>
      <a-button type="primary" @click="router.push('/products')">返回商品列表</a-button>
    </template>
  </a-result>
</template>
