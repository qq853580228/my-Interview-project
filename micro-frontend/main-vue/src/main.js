import { createApp } from 'vue'
import { registerMicroApps, start } from 'qiankun'
import './style.css'
import App from './App.vue'
import { SUB_APP_NAME_VUE, SUB_APP_NAME_REACT, SUB_APP_NAME_VUE_PATH, SUB_APP_NAME_REACT_PATH, MICRO_APP_CONTAINER } from './constant'

createApp(App).mount('#app')

registerMicroApps([
  {
    name: SUB_APP_NAME_VUE,
    entry: import.meta.env.VITE_SUB_APP_NAME_VUE_ENTRY,
    activeRule: SUB_APP_NAME_VUE_PATH,
    container: MICRO_APP_CONTAINER,
  },
  {
    name: SUB_APP_NAME_REACT,
    entry: import.meta.env.VITE_SUB_APP_NAME_REACT_ENTRY,
    activeRule: SUB_APP_NAME_REACT_PATH,
    container: MICRO_APP_CONTAINER,
  },
])

// 启动qiankun
start({
  // 可选：开启样式隔离
  experimentalStyleIsolation: true
})
