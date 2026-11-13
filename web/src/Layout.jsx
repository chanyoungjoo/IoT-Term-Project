import { useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Wind, LayoutGrid, House, Sun, ChartLine, Bell, SlidersHorizontal } from 'lucide-react'
import { currentAdmin, controlLog, scenarios, getSnapshot } from './api.js'

const NAV = [
  { to: '/', label: '대시보드', icon: LayoutGrid },
  { to: '/monitoring', label: '교실별 모니터링', icon: House },
  { to: '/devices', label: '장치 제어', icon: Sun },
  { to: '/forecast', label: '미세먼지 예측', icon: ChartLine },
  { to: '/alerts', label: '알림 이력', icon: Bell },
  { to: '/settings', label: '설정', icon: SlidersHorizontal },
]

const hhmm = () => new Date().toTimeString().slice(0, 5)

// 시나리오·장치 설정·제어 기록을 여기서 들고 있어 모든 화면이 같은 상태를 본다.
export default function Layout() {
  const { pathname } = useLocation()
  const [scenario, setScenario] = useState('base')
  const [edits, setEdits] = useState({})
  const [log, setLog] = useState(controlLog)
  const snap = useMemo(() => getSnapshot(scenario, edits), [scenario, edits])

  const ctx = {
    snap, log,
    // 장치 id(공기청정기 AP-…, 창문 WD-…)로 설정을 덮어쓴다
    editDevices: (ids, patch) =>
      setEdits((e) => ({ ...e, ...Object.fromEntries(ids.map((id) => [id, { ...e[id], ...patch }])) })),
    editPurifiers: (ids, patch) =>
      setEdits((e) => ({ ...e, ...Object.fromEntries(ids.map((id) => [id, { ...e[id], ...patch }])) })),
    resetEdits: () => setEdits({}),
    addLog: (entry) =>
      setLog((l) => [{ id: `u${l.length}`, time: hhmm(), by: 'manual', who: `${currentAdmin.name} ${currentAdmin.role}`, ...entry }, ...l]),
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="logo">
          <span className="logo-mark"><Wind size={20} aria-hidden /></span>
          AirClass
        </div>
        <nav className="nav" aria-label="주 메뉴">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'}>
              <Icon size={20} aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        {pathname === '/' && (
          <div className="scenario">
            <strong>시연용 시나리오</strong>
            <p>버튼을 누르면 교실 카드, 요약 수치, 알림이 바뀌어요.</p>
            {['pm', 'co2', 'outdoorBad'].map((k) => (
              <button key={k} type="button" className="btn" aria-pressed={scenario === k} onClick={() => setScenario(k)}>
                {scenarios[k].label}
              </button>
            ))}
            <button type="button" className="link" onClick={() => setScenario('base')}>처음 상태로 되돌리기</button>
          </div>
        )}
        <div className="profile">
          <span className="avatar" aria-hidden>{currentAdmin.name[0]}</span>
          <div>
            <strong>{currentAdmin.name} {currentAdmin.role}</strong>
            <span>{currentAdmin.org}</span>
          </div>
        </div>
      </aside>
      <main className="main">
        {/* 경로가 바뀔 때마다 다시 마운트해 진입 애니메이션을 재생 */}
        <div className="page" key={pathname}>
          <Outlet context={ctx} />
        </div>
      </main>
    </div>
  )
}
