import { defineConfig, loadEnv } from 'vite'

import viteProdConfig from './vite.prod.config.js'
import viteDevConfig from './vite.dev.config.js'
import viteBaseConfig from './vite.base.config.js'

const envResolver = {
  'serve': () => {
    console.log('开发环境')
    return {...viteBaseConfig, ...viteDevConfig}
  },
  'build': () => {
    console.log('生产环境')
    return {...viteBaseConfig, ...viteProdConfig}
  }
}

// https://vite.dev/config/
export default defineConfig(({ command }) => {
    // command 是当前的命令，例如 build 或 serve
    console.log('process', envResolver[command]())
    return envResolver[command]()
})
