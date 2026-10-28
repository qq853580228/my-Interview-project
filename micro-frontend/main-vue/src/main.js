import { createApp } from 'vue'
import { registerMicroApps, start } from 'qiankun'
import './style.css'
import App from './App.vue'

createApp(App).mount('#app')

registerMicroApps([
  {
    name: 'vue-sub',
    entry: '//localhost:5174',
    activeRule: '/vue-sub',
    container: '#micro-container',
  },
  {
    name: 'react-sub',
    entry: '//localhost:5175',
    activeRule: '/react-sub',
    container: '#micro-container',
  },
])

// 启动qiankun
start({
  // 可选：开启样式隔离
  experimentalStyleIsolation: true
})
