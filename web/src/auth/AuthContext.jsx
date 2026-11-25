import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AuthContext, useAuth } from './useAuth.js'

// 로그인한 관리자 정보를 앱 전체에 나눠 준다.
// '로그인 상태 유지'를 켜면 localStorage(브라우저를 닫아도 유지), 끄면 sessionStorage(탭을 닫으면 로그아웃)에 둔다.
const KEY = 'airclass.admin'

function readStored() {
  // 저장소를 못 쓰는 환경(사생활 보호 모드 등)에서도 화면은 동작해야 하므로 try/catch
  try {
    const raw = localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function clearStored() {
  try {
    localStorage.removeItem(KEY)
    sessionStorage.removeItem(KEY)
  } catch { /* 저장소를 못 쓰면 메모리 상태만 지운다 */ }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStored)

  const signIn = (u, { keep }) => {
    clearStored()
    try {
      ;(keep ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(u))
    } catch { /* 저장 실패해도 이번 탭에서는 로그인 상태 유지 */ }
    setUser(u)
  }
  const signOut = () => {
    clearStored()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, signIn, signOut }}>{children}</AuthContext.Provider>
}

// 로그인하지 않았으면 로그인 화면으로 보내고, 로그인 뒤 원래 가려던 주소로 돌려보낸다
export function RequireAuth({ children }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return children
}
