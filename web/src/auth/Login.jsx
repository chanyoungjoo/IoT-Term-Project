import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { DEMO_ACCOUNT, login } from './authApi.js'
import { useAuth } from './useAuth.js'
import { AuthLayout, Checkbox, Field } from './parts.jsx'

// 로그인
// - 로고를 두 번 누르면 시연 계정(admin / 1234)이 채워짐 (앱은 길게 누르기)
// - 5번 틀리면 1분 잠금, 승인 대기 계정은 안내 문구
export default function Login() {
  const { user, signIn } = useAuth()
  const { state } = useLocation()
  const [id, setId] = useState(state?.id ?? '')
  const [pw, setPw] = useState('')
  const [keep, setKeep] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // 로그인되면(또는 이미 로그인 상태면) 원래 가려던 주소로 보낸다
  if (user) return <Navigate to={state?.from ?? '/'} replace />

  const submit = async (e) => {
    e.preventDefault()
    if (!id.trim() || !pw) { setError('아이디와 비밀번호를 입력해 주세요.'); return }
    setBusy(true)
    const r = await login(id, pw)
    setBusy(false)
    if (r.ok) { signIn(r.user, { keep }); return }
    if (r.code === 'wrong') setError(`아이디 또는 비밀번호가 맞지 않아요. (${r.max}번 중 ${r.count}번 틀림)`)
    if (r.code === 'locked') setError(`여러 번 틀려서 잠시 잠갔어요. ${r.seconds}초 뒤에 다시 시도해 주세요.`)
    if (r.code === 'pending') setError('가입 승인을 기다리고 있어요. 승인되면 로그인할 수 있어요.')
  }

  const fillDemo = () => { setId(DEMO_ACCOUNT.id); setPw(DEMO_ACCOUNT.pw); setError(null) }

  return (
    <AuthLayout onLogoDoubleClick={fillDemo}>
      <div className="auth-head">
        <h2>관리자 로그인</h2>
      </div>
      {state?.notice && <p className="auth-notice" role="status">{state.notice}</p>}
      <form onSubmit={submit} noValidate>
        <Field label="아이디" placeholder="아이디" value={id} autoComplete="username" autoFocus
          onChange={(e) => { setId(e.target.value); setError(null) }} />
        <Field label="비밀번호" type="password" placeholder="비밀번호" value={pw} autoComplete="current-password"
          onChange={(e) => { setPw(e.target.value); setError(null) }} state={error ? 'err' : null} help={error} />
        <div className="auth-row">
          <Checkbox checked={keep} onChange={setKeep}>로그인 상태 유지</Checkbox>
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? '확인하는 중' : '로그인'}</button>
      </form>
      <nav className="auth-links" aria-label="계정 도움말">
        <Link to="/find">아이디 찾기</Link>
        <span aria-hidden />
        <Link to="/find?tab=pw">비밀번호 찾기</Link>
        <span aria-hidden />
        <Link to="/signup" className="strong">회원가입</Link>
      </nav>
    </AuthLayout>
  )
}
