import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { School, CircleCheck } from 'lucide-react'
import { ROLES, checkId, codeOk, idProblem, pwOk, searchSchools, signup } from './authApi.js'
import { AuthLayout, CardHead, Checkbox, EmailCode, Field, PwRules, Stepper } from './parts.jsx'

const STEPS = ['학교 선택', '계정 정보', '이메일 인증']
const TERMS = [
  { key: 'service', label: '[필수] 서비스 이용약관', required: true },
  { key: 'privacy', label: '[필수] 개인정보 수집·이용', required: true },
  { key: 'notice', label: '[선택] 공기질 경고를 이메일로 받기', required: false },
]

// 관리자 회원가입 (선생님은 앱에서 가입). 가입 뒤에는 학교 관리자 승인을 기다린다.
export default function Signup() {
  const nav = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    query: '', schoolId: null, name: '', role: ROLES[0], id: '', pw: '', pw2: '', email: '', code: '', terms: {},
  })
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  if (step === 4) {
    return (
      <AuthLayout>
        <div className="auth-done">
          <CircleCheck size={48} aria-hidden />
          <h2>가입 신청을 보냈어요</h2>
          <button type="button" className="btn btn-primary btn-block" onClick={() => nav('/login', { state: { id: form.id.trim().toLowerCase() } })}>로그인 화면으로</button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <CardHead title="관리자 회원가입" back="/login" />
      <Stepper steps={STEPS} current={step} />
      <div className="swap" key={step}>
        {step === 1 && <StepSchool form={form} set={set} next={() => setStep(2)} />}
        {step === 2 && <StepAccount form={form} set={set} prev={() => setStep(1)} next={() => setStep(3)} />}
        {step === 3 && <StepVerify form={form} set={set} prev={() => setStep(2)} done={() => setStep(4)} />}
      </div>
    </AuthLayout>
  )
}

function StepSchool({ form, set, next }) {
  const list = searchSchools(form.query)
  return (
    <>
      <Field label="학교 검색" type="search" placeholder="학교 이름으로 검색 (예: A초)" value={form.query} onChange={(e) => set({ query: e.target.value })} />
      <ul className="school-list" aria-label="학교 검색 결과">
        {list.map((s) => (
          <li key={s.id}>
            <button type="button" className="school" aria-pressed={form.schoolId === s.id} disabled={!s.ready} onClick={() => set({ schoolId: s.id })}>
              <School size={20} aria-hidden />
              <span><b>{s.name}</b><small>{s.ready ? s.addr : 'AirClass가 아직 설치되지 않은 학교예요'}</small></span>
            </button>
          </li>
        ))}
        {!list.length && <li className="empty">검색 결과가 없어요</li>}
      </ul>
      <div className="auth-actions">
        <button type="button" className="btn btn-primary btn-block" disabled={!form.schoolId} onClick={next}>다음</button>
      </div>
    </>
  )
}

function StepAccount({ form, set, prev, next }) {
  const [checked, setChecked] = useState(null) // 중복 확인 결과 { ok, message, id }
  const [checking, setChecking] = useState(false)
  const id = form.id.trim().toLowerCase()
  const local = id ? idProblem(id) : null
  const idOk = checked?.ok && checked.id === id
  const check = async () => {
    setChecking(true)
    const r = await checkId(id)
    setChecking(false)
    setChecked({ ...r, id })
  }
  const pwMatch = form.pw2 && form.pw === form.pw2
  const ok = form.name.trim() && idOk && pwOk(form.pw) && pwMatch
  const idHelp = local ?? (checked?.id === id ? (checked.ok ? '쓸 수 있는 아이디예요' : checked.message) : '영문 소문자로 시작하는 4~16자')
  return (
    <>
      <div className="field-pair">
        <Field label="이름" placeholder="예: 김민수" value={form.name} autoComplete="name" onChange={(e) => set({ name: e.target.value })} />
        <div className="field">
          <label htmlFor="role">직책</label>
          <select id="role" className="select" value={form.role} onChange={(e) => set({ role: e.target.value })}>
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <Field label="아이디" placeholder="아이디" value={form.id} autoComplete="username"
        onChange={(e) => set({ id: e.target.value })}
        state={local || (checked?.id === id && !checked.ok) ? 'err' : idOk ? 'ok' : null} help={idHelp}
        right={<button type="button" className="btn" disabled={!id || !!local || checking || idOk} onClick={check}>{idOk ? '확인 완료' : checking ? '확인 중' : '중복 확인'}</button>} />
      <Field label="비밀번호" type="password" placeholder="비밀번호" value={form.pw} autoComplete="new-password" onChange={(e) => set({ pw: e.target.value })} />
      <PwRules pw={form.pw} />
      <Field label="비밀번호 확인" type="password" placeholder="비밀번호를 한 번 더 입력" value={form.pw2} autoComplete="new-password"
        onChange={(e) => set({ pw2: e.target.value })}
        state={form.pw2 ? (pwMatch ? 'ok' : 'err') : null} help={form.pw2 ? (pwMatch ? '비밀번호가 같아요' : '비밀번호가 서로 달라요') : null} />
      <div className="auth-actions">
        <button type="button" className="btn" onClick={prev}>이전</button>
        <button type="button" className="btn btn-primary" disabled={!ok} onClick={next}>다음</button>
      </div>
    </>
  )
}

function StepVerify({ form, set, prev, done }) {
  const [busy, setBusy] = useState(false)
  const [codeError, setCodeError] = useState(null)
  const allOn = TERMS.every((t) => form.terms[t.key])
  const ok = form.code.length === 6 && TERMS.filter((t) => t.required).every((t) => form.terms[t.key])
  const submit = async () => {
    if (!codeOk(form.code)) { setCodeError('인증 코드가 맞지 않아요.'); return }
    setBusy(true)
    await signup(form)
    setBusy(false)
    done()
  }
  return (
    <>
      <EmailCode label="학교 이메일" email={form.email} setEmail={(v) => set({ email: v })}
        code={form.code} setCode={(v) => { set({ code: v }); setCodeError(null) }} codeError={codeError} />
      <div className="terms">
        <Checkbox bold checked={allOn} onChange={(v) => set({ terms: Object.fromEntries(TERMS.map((t) => [t.key, v])) })}>전체 동의</Checkbox>
        {TERMS.map((t) => (
          <Checkbox key={t.key} checked={!!form.terms[t.key]} onChange={(v) => set({ terms: { ...form.terms, [t.key]: v } })}>{t.label}</Checkbox>
        ))}
      </div>
      <div className="auth-actions">
        <button type="button" className="btn" onClick={prev}>이전</button>
        <button type="button" className="btn btn-primary" disabled={!ok || busy} onClick={submit}>{busy ? '보내는 중' : '가입 신청'}</button>
      </div>
      <p className="auth-small">이미 계정이 있나요? <Link to="/login">로그인</Link></p>
    </>
  )
}
