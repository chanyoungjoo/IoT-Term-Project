import { createContext, useContext } from 'react'

// 로그인 정보 컨텍스트와 읽는 훅 (AuthProvider는 AuthContext.jsx)
export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)
