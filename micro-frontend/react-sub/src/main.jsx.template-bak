import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

let root = null
const rootId = 'root'

function render(props) {
  const container = props?.container || document.getElementById(rootId)
  root = createRoot(container)
  root.render(<App />)
}

// 独立运行
if (!window.__POWERED_BY_QIANKUN__) {
  render({})
}

export async function bootstrap() {
  console.log('react子应用 bootstrap')
}
export async function mount(props) {
  render(props)
}
export async function unmount(props) {
  root?.unmount()
}
