<template>
  <div class="login-page">
    <a-card class="login-card" :bordered="false">
      <h2 class="title">微前端统一运营管控平台</h2>
      <p class="sub-title">基座统一登录 · RBAC 权限 · 消息中心 · EventBus 中继</p>
      <a-form :model="form" :rules="rules" layout="vertical" @finish="onSubmit">
        <a-form-item label="用户名" name="username">
          <a-input v-model:value="form.username" placeholder="任意用户名，如 zhangsan" />
        </a-form-item>
        <a-form-item label="密码" name="password">
          <a-input-password v-model:value="form.password" placeholder="演示项目：任意非空密码" />
        </a-form-item>
        <a-form-item label="角色（RBAC 演示）" name="role">
          <a-select v-model:value="form.role" :options="roleOptions" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="submit" size="large" block>登 录</a-button>
        </a-form-item>
      </a-form>
      <a-typography-paragraph type="secondary" class="tips">
        登录后基座通过 qiankun props 把 user/permissions 快照注入子应用；
        顶栏「切换角色」会实时 emit user-change 事件，子应用按钮权限随之变化（联动场景1）。
      </a-typography-paragraph>
    </a-card>
  </div>
</template>

<script setup lang="ts">
  import { reactive } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { ROLE_ADMIN, ROLE_OPTIONS, type Role } from '../shared/contract'
  import { login } from '../store/user'

  const route = useRoute()
  const router = useRouter()

  const form = reactive({
    username: '',
    password: '',
    role: ROLE_ADMIN as Role,
  })

  const roleOptions = ROLE_OPTIONS

  // a-form 自带必填校验（@finish 校验通过才触发），无需手写 errMsg
  const rules = {
    username: [{ required: true, message: '请输入用户名' }],
    password: [{ required: true, message: '请输入密码（任意非空即可）' }],
  }

  function onSubmit(): void {
    try {
      login(form.username, form.role)
      // 支持登录后跳回被守卫拦截的原目标地址（如直接输入的子应用 URL）
      const redirect = (route.query.redirect as string) || '/demo'
      router.replace(redirect)
    } catch (err) {
      console.error('[LoginPage] onSubmit error:', err)
    }
  }
</script>

<style scoped>
  .login-page {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f0f2f5;
  }
  .login-card {
    width: 420px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  }
  .title {
    margin: 0 0 4px;
    font-size: 20px;
    text-align: center;
  }
  .sub-title {
    margin: 0 0 24px;
    text-align: center;
    color: #888;
    font-size: 12px;
  }
  .tips {
    margin-top: 8px;
    font-size: 12px;
    line-height: 1.6;
  }
</style>
