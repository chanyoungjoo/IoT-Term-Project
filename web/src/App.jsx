import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Monitoring from './pages/Monitoring.jsx'
import Devices from './pages/Devices.jsx'
import RoomDetail from './pages/RoomDetail.jsx'
import Alerts from './pages/Alerts.jsx'
import Settings from './pages/Settings.jsx'
import { AuthProvider, RequireAuth } from './auth/AuthContext.jsx'
import Login from './auth/Login.jsx'
import Signup from './auth/Signup.jsx'
import Find from './auth/Find.jsx'

// 없는 주소로 들어오면 보여 줄 빈 페이지 (미세먼지 예측은 이번 범위에서 제외)
function Placeholder({ title }) {
  return (
    <>
      <h1 className="page-title">{title}</h1>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
    <BrowserRouter>
      <Routes>
        {/* 로그인 없이 들어갈 수 있는 화면 */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/find" element={<Find />} />
        {/* 나머지는 로그인해야 볼 수 있다 */}
        <Route element={<RequireAuth><Layout /></RequireAuth>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/monitoring" element={<Monitoring />} />
          <Route path="/monitoring/:id" element={<RoomDetail />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Placeholder title="페이지를 찾을 수 없어요" />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </AuthProvider>
  )
}
