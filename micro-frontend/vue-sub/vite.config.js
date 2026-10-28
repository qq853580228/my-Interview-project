import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import qiankun from 'vite-plugin-qiankun'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    qiankun('vue-sub', {
      useDevMode: true
    })
  ],
  server: {
    port: 5174,
    cors: true,
    origin: 'http://localhost:5174',
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  },
  base: '/vue-sub'
})
