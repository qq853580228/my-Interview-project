import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [vue()],
    // 基座部署为独立 Vercel 项目，资产从根路径提供
    base: '/',
    server: {
      port: 5173,
      // 【面试点】开发环境代理子应用请求：
      // 由于子应用使用 history 模式且资源路径带前缀（/vue-sub、/react-sub），
      // 基座需要在开发时代理这些路径到对应的子应用 dev server，
      // 否则浏览器在加载子应用资源时会向基座 origin（5173）发请求而 404。
      proxy: {
        '/vue-sub': {
          target: 'http://localhost:5174',
          changeOrigin: true,
        },
        '/react-sub': {
          target: 'http://localhost:5175',
          changeOrigin: true,
        },
      },
    },
  }
})
