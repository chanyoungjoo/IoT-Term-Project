import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Monitoring from './pages/Monitoring.jsx'
import Devices from './pages/Devices.jsx'
import RoomDetail from './pages/RoomDetail.jsx'

// 미세먼지 예측·알림 이력·설정은 이번 범위 밖이라 빈 페이지로 둔다.
function Placeholder({ title }) {
  return (
    <>
      <h1 className="page-title">{title}</h1>
      <p className="page-sub">이 화면은 아직 준비 중이에요.</p>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/monitoring" element={<Monitoring />} />
          <Route path="/monitoring/:id" element={<RoomDetail />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/forecast" element={<Placeholder title="미세먼지 예측" />} />
          <Route path="/alerts" element={<Placeholder title="알림 이력" />} />
          <Route path="/settings" element={<Placeholder title="설정" />} />
          <Route path="*" element={<Placeholder title="페이지를 찾을 수 없어요" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
