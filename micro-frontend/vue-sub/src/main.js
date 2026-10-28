import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { renderWithQiankun, qiankunWindow } from 'vite-plugin-qiankun/dist/helper'

let app = null

const render = (props) => {
  app = createApp(App)
  app.mount(props.container ? props.container : '#app')
}

// 判断是否在qiankun环境
if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  render({})
}

renderWithQiankun({
  mount(props) {
    render(props)
  },
  bootstrap() {
    console.log('vue子应用 bootstrap')
  },
  unmount(props) {
    app?.unmount()
  }
})
