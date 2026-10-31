import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
// antd 5：ConfigProvider 提供中文语言包；App 组件提供 message/modal/notification 的上下文
// （页面内通过 App.useApp() 消费，qiankun 内弹层样式也走同一份 CSS-in-JS 注入）
import { Alert, App as AntApp, ConfigProvider, Layout, Result, Space, Tag, Typography } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import OrderCreate from './pages/OrderCreate'
import OrderDetail from './pages/OrderDetail'
import OrderList from './pages/OrderList'
import type { Role } from './shared/contract'
import { useGlobal } from './shared/globalStore'
import { qiankunWindow } from "vite-plugin-qiankun/dist/helper";

const ROLE_TEXT: Record<Role, string> = {
  admin: '管理员',
  operator: '操作员',
  viewer: '访客',
}

export default function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <AntApp>
        <InnerApp />
      </AntApp>
    </ConfigProvider>
  )
}

function InnerApp() {
  const { user, standalone } = useGlobal()
  console.log('qiankunWindow.__POWERED_BY_QIANKUN__', qiankunWindow.__POWERED_BY_QIANKUN__)
  return (
    // 【面试点】子应用路由 base 必须与基座 activeRule 前缀（/react-sub）一致，
    // 独立运行(:5175/react-sub)和基座内(:5173/react-sub) URL 表现相同，刷新/直达不 404
    <BrowserRouter basename={qiankunWindow.__POWERED_BY_QIANKUN__ ? "/react-sub" : "/"} future={{ v7_startTransition: true }}>
      <Layout className="app">
        <Layout.Header className="topbar">
          <Typography.Text strong className="topbar-title">
            订单管理(react-sub)
          </Typography.Text>
          <Space>
            {user ? (
              <Tag color="blue">
                {user.nickname} / {ROLE_TEXT[user.role]}
              </Tag>
            ) : (
              <Tag>未登录</Tag>
            )}
          </Space>
        </Layout.Header>
        {standalone && (
          <Alert banner type="warning" message="独立运行模式：跨应用事件联动需在基座中演示" />
        )}
        <Layout.Content className="main">
          <Routes>
            <Route path="/" element={<Navigate to="/orders" replace />} />
            <Route path="/orders" element={<OrderList />} />
            <Route path="/orders/create" element={<OrderCreate />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            <Route
              path="*"
              element={<Result status="404" title="404" subTitle="页面不存在" />}
            />
          </Routes>
        </Layout.Content>
      </Layout>
    </BrowserRouter>
  )
}
