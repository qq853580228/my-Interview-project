import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import qiankun from 'vite-plugin-qiankun'

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'
  return {
    plugins: [
      qiankun('react-sub', {
        useDevMode: true,
      }),
      ...(isProd ? [react()] : [])
    ],
    // 生产环境用 '/'：每个子应用独立部署为 Vercel 项目，资产从根路径提供
    // qiankun 会以 entry URL 为基准解析子应用 HTML 中的资源路径，所以 '/' 即可
    // 开发环境保留 '/react-sub' 以兼容基座 activeRule
    // base: isProd ? '/' : '/react-sub',
    server: {
      port: 5175,
      cors: true,
      origin: 'http://localhost:5175',
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    },
  }
})
