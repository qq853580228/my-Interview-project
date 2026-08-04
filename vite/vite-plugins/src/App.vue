<script setup>
import HelloWorld from '@components/HelloWorld.vue'

console.log('ENV', import.meta.env);

fetch('/api/user/list').then(res => res.json()).then(console.log)

</script>

<template>
  <HelloWorld />
</template>
