import { useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Wind, LayoutGrid, House, Sun, Bell, SlidersHorizontal, LogOut } from 'lucide-react'
import { controlLog, scenarios, getSnapshot } from './api.js'
import { useAuth } from './auth/useAuth.js'

const NAV = [
  { to: '/', label: '대시보드', icon: LayoutGrid },
  { to: '/monitoring', label: '교실별 모니터링', icon: House },
  { to: '/devices', label: '장치 제어', icon: Sun },
  { to: '/alerts', label: '알림 이력', icon: Bell },
  { to: '/settings', label: '설정', icon: SlidersHorizontal },
]

const hhmm = () => new Date().toTimeString().slice(0, 5)

// 시나리오·장치 설정·제어 기록을 여기서 들고 있어 모든 화면이 같은 상태를 본다.
export default function Layout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const logout = () => { signOut(); navigate('/login', { replace: true }) }
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
    logout,
    addLog: (entry) =>
      setLog((l) => [{ id: `u${l.length}`, time: hhmm(), by: 'manual', who: `${user.name} ${user.role}`, ...entry }, ...l]),
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
            {['pm', 'co2', 'outdoorBad'].map((k) => (
              <button key={k} type="button" className="btn" aria-pressed={scenario === k} onClick={() => setScenario(k)}>
                {scenarios[k].label}
              </button>
            ))}
            <button type="button" className="link" onClick={() => setScenario('base')}>처음 상태로 되돌리기</button>
          </div>
        )}
        <div className="profile">
          <span className="avatar" aria-hidden>{user.name[0]}</span>
          <div>
            <strong>{user.name} {user.role}</strong>
            <span>{user.school} 행정실</span>
          </div>
          <button type="button" className="icon-btn" aria-label="로그아웃" title="로그아웃" onClick={logout}><LogOut size={18} aria-hidden /></button>
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
