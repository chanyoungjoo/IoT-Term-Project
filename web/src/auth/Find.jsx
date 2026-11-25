import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CircleCheck } from 'lucide-react'
import { findId, maskId, pwOk, resetPassword, verifyForReset } from './authApi.js'
import { AuthLayout, CardHead, EmailCode, Field, PwRules } from './parts.jsx'

// 아이디 찾기 / 비밀번호 찾기 (탭으로 전환, 주소 ?tab=pw 로 바로 열 수 있음)
export default function Find() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'pw' ? 'pw' : 'id'
  return (
    <AuthLayout>
      <CardHead title="계정 찾기" back="/login" />
      <div className="auth-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'id'} onClick={() => setParams({})}>아이디 찾기</button>
        <button type="button" role="tab" aria-selected={tab === 'pw'} onClick={() => setParams({ tab: 'pw' })}>비밀번호 찾기</button>
      </div>
      <div className="swap" key={tab}>{tab === 'id' ? <FindId /> : <FindPw />}</div>
    </AuthLayout>
  )
}

function FindId() {
  const nav = useNavigate()
  const [, setParams] = useSearchParams()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const submit = async () => {
    setBusy(true)
    const r = await findId(name, email, code)
    setBusy(false)
    if (r.ok) setResult(r)
    else setError(r.message)
  }

  if (result) {
    return (
      <div className="find-result">
        <p>{name.trim()}님의 아이디예요</p>
        <strong>{maskId(result.id)}</strong>
        <small>{result.school} · {result.joinedAt} 가입</small>
        <div className="auth-actions">
          <button type="button" className="btn" onClick={() => setParams({ tab: 'pw' })}>비밀번호 찾기</button>
          <button type="button" className="btn btn-primary" onClick={() => nav('/login', { state: { id: result.id } })}>로그인하기</button>
        </div>
      </div>
    )
  }
  return (
    <>
      <Field label="이름" placeholder="가입할 때 쓴 이름" value={name} autoComplete="name" onChange={(e) => { setName(e.target.value); setError(null) }} />
      <EmailCode email={email} setEmail={(v) => { setEmail(v); setError(null) }} code={code} setCode={(v) => { setCode(v); setError(null) }} codeError={error} />
      <div className="auth-actions">
        <button type="button" className="btn btn-primary btn-block" disabled={!name.trim() || code.length !== 6 || busy} onClick={submit}>
          {busy ? '찾는 중' : '아이디 찾기'}
        </button>
      </div>
    </>
  )
}

function FindPw() {
  const nav = useNavigate()
  const [id, setId] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [verified, setVerified] = useState(null) // 인증된 아이디
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const verify = async () => {
    setBusy(true)
    const r = await verifyForReset(id, email, code)
    setBusy(false)
    if (r.ok) setVerified(r.id)
    else setError(r.message)
  }
  const save = async () => {
    setBusy(true)
    const r = await resetPassword(verified, pw)
    setBusy(false)
    if (r.ok) nav('/login', { state: { id: verified, notice: '비밀번호를 바꿨어요. 새 비밀번호로 로그인해 주세요.' } })
    else setError(r.message)
  }

  if (verified) {
    const match = pw2 && pw === pw2
    return (
      <>
        <p className="auth-notice"><CircleCheck size={16} aria-hidden /> {verified} 계정을 확인했어요. 새 비밀번호를 정해 주세요.</p>
        <Field label="새 비밀번호" type="password" placeholder="새 비밀번호" value={pw} autoComplete="new-password" onChange={(e) => setPw(e.target.value)} />
        <PwRules pw={pw} />
        <Field label="새 비밀번호 확인" type="password" placeholder="한 번 더 입력" value={pw2} autoComplete="new-password"
          onChange={(e) => setPw2(e.target.value)} state={pw2 ? (match ? 'ok' : 'err') : null}
          help={pw2 ? (match ? '비밀번호가 같아요' : '비밀번호가 서로 달라요') : null} />
        <div className="auth-actions">
          <button type="button" className="btn btn-primary btn-block" disabled={!pwOk(pw) || !match || busy} onClick={save}>{busy ? '바꾸는 중' : '비밀번호 바꾸기'}</button>
        </div>
      </>
    )
  }
  return (
    <>
      <Field label="아이디" placeholder="아이디" value={id} autoComplete="username" onChange={(e) => { setId(e.target.value); setError(null) }} />
      <EmailCode email={email} setEmail={(v) => { setEmail(v); setError(null) }} code={code} setCode={(v) => { setCode(v); setError(null) }} codeError={error} />
      <div className="auth-actions">
        <button type="button" className="btn btn-primary btn-block" disabled={!id.trim() || code.length !== 6 || busy} onClick={verify}>
          {busy ? '확인하는 중' : '다음'}
        </button>
      </div>
    </>
  )
}
