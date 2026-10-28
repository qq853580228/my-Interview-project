import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import qiankun from 'vite-plugin-qiankun'

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development'
  return {
    plugins: [
      qiankun("react-sub", {
        useDevMode: true,
      }),
      ...(!isDev ? [react()] : []),
    ],
    server: {
      port: 5175,
      cors: true,
      origin: 'http://localhost:5175',
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    },
    base: '/react-sub'
  }
})
