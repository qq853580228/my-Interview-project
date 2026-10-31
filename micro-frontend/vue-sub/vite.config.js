import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import qiankun from 'vite-plugin-qiankun'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'
  return {
    plugins: [
      vue(),
      qiankun('vue-sub', {
        useDevMode: true,
      }),
    ],
    // 生产环境用 '/'：每个子应用独立部署为 Vercel 项目，资产从根路径提供
    // qiankun 会以 entry URL 为基准解析子应用 HTML 中的资源路径，所以 '/' 即可
    // 开发环境保留 '/vue-sub' 以兼容基座 activeRule
    // base: isProd ? '/' : '/vue-sub',
    server: {
      port: 5174,
      cors: true,
      origin: 'http://localhost:5174',
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    },
  }
})
