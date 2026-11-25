// 로그인·회원가입·계정 찾기 화면이 함께 쓰는 조각
import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wind, Eye, EyeOff, Check } from 'lucide-react'
import { CODE_SECONDS, DEMO_CODE, emailOk, pwRules, sendCode } from './authApi.js'
import './auth.css'

const TAGLINES = ['AirClass가 챙길게요', '환기할 때를 알려 드려요', '버튼 하나로 창문 열기', '교실마다 한눈에 확인해요']
const TAGLINE_MS = 2800
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// 왼쪽 브랜드 영역 + 오른쪽 입력 카드. 좁은 화면에서는 위아래로 쌓인다.
export function AuthLayout({ children, onLogoDoubleClick }) {
  return (
    <div className="auth">
      <aside className="auth-brand">
        <div className="auth-logo" onDoubleClick={onLogoDoubleClick}>
          <span className="logo-mark"><Wind size={20} aria-hidden /></span>
          AirClass <small>관리자</small>
        </div>
        <div className="auth-hero">
          <AnimatedWindow size={168} />
          <RotatingTitle />
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-card">{children}</div>
      </main>
    </div>
  )
}

function RotatingTitle() {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (reduced()) return undefined
    const id = setInterval(() => setI((n) => (n + 1) % TAGLINES.length), TAGLINE_MS)
    return () => clearInterval(id)
  }, [])
  return (
    // 화면 읽기 기능에는 바뀌는 문구 대신 대표 문장 하나만 읽어 준다
    <h1 className="auth-title" aria-label="교실 공기, AirClass가 챙길게요">
      <span aria-hidden>교실 공기</span>
      <span className="auth-swap" aria-hidden key={i}>{TAGLINES[i]}</span>
    </h1>
  )
}

// 창문이 4초마다 열려 바람이 들어오고 다시 닫힌다 (앱 로그인 화면 W-1과 같은 그림)
const PERIOD = 4000
const W = (a) => `rgba(255,255,255,${a})`
const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - ((-2 * x + 2) ** 2) / 2)

function AnimatedWindow({ size }) {
  const [t, setT] = useState(0)
  useEffect(() => {
    if (reduced()) return undefined
    let raf
    const start = performance.now()
    const tick = (now) => { setT(((now - start) % PERIOD) / PERIOD); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  const open = t < 0.3 ? easeInOut(t / 0.3) : t < 0.7 ? 1 : 1 - easeInOut((t - 0.7) / 0.3)
  const w = 38 * (1 - 0.75 * open)
  const k = 8 * open
  const left = `M32 22 L${32 + w} ${22 + k} L${32 + w} ${106 - k} L32 106 Z`
  const right = `M108 22 L${108 - w} ${22 + k} L${108 - w} ${106 - k} L108 106 Z`
  const gusts = open > 0.2 ? [0, 1, 2].map((i) => {
    const p = (t * 3 + i / 3) % 1
    const x = 40 + p * 60
    return { d: `M${x - 14} ${50 + i * 14} q7 -5 14 0 t14 0`, op: Math.sin(p * Math.PI) * open * 0.9 }
  }) : []
  return (
    <svg width={size} height={size} viewBox="0 0 140 140" aria-hidden>
      <rect x="32" y="22" width="76" height="84" rx="6" stroke={W(0.35)} strokeWidth="4" fill={W(0.06)} />
      <path d="M24 112h92" stroke={W(0.55)} strokeWidth="5" strokeLinecap="round" />
      <path d={left} stroke={W(0.85)} strokeWidth="4.5" fill={W(0.12)} strokeLinejoin="round" />
      <path d={right} stroke={W(0.85)} strokeWidth="4.5" fill={W(0.12)} strokeLinejoin="round" />
      {gusts.map((g, i) => <path key={i} d={g.d} stroke={W(g.op.toFixed(2))} strokeWidth="4" fill="none" strokeLinecap="round" />)}
    </svg>
  )
}

// 카드 위쪽 제목 + 뒤로 가기
export function CardHead({ title, sub, back }) {
  return (
    <div className="auth-head">
      {back && <Link to={back} className="auth-back">← 로그인으로</Link>}
      <h2>{title}</h2>
      {sub && <p>{sub}</p>}
    </div>
  )
}

// 라벨 + 입력칸 + 도움말/오류. right에 버튼(중복 확인, 코드 받기)을 붙일 수 있다.
export function Field({ label, help, state, right, type = 'text', ...input }) {
  const id = useId()
  const [show, setShow] = useState(false)
  const isPw = type === 'password'
  return (
    <div className={`field ${state ? `is-${state}` : ''}`}>
      {label && <label htmlFor={id}>{label}</label>}
      <div className="field-row">
        <div className="field-box">
          <input id={id} type={isPw && !show ? 'password' : isPw ? 'text' : type} aria-invalid={state === 'err' || undefined}
            aria-describedby={help ? `${id}-help` : undefined} {...input} />
          {isPw && (
            <button type="button" className="field-eye" aria-label={show ? '비밀번호 숨기기' : '비밀번호 보기'} onClick={() => setShow((v) => !v)}>
              {show ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
            </button>
          )}
        </div>
        {right}
      </div>
      {help && <p className="field-help" id={`${id}-help`} role={state === 'err' ? 'alert' : undefined}>{help}</p>}
    </div>
  )
}

// 비밀번호 규칙 3개를 칩으로 보여 준다 (맞으면 초록)
export function PwRules({ pw }) {
  return (
    <ul className="pw-rules" aria-label="비밀번호 규칙">
      {pwRules(pw).map((r) => (
        <li key={r.label} className={r.ok ? 'ok' : ''}><Check size={13} aria-hidden />{r.label}</li>
      ))}
    </ul>
  )
}

export function Checkbox({ checked, onChange, children, bold }) {
  return (
    <label className={`check ${bold ? 'bold' : ''}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="check-box" aria-hidden><Check size={14} /></span>
      {children}
    </label>
  )
}

export function Stepper({ steps, current }) {
  return (
    <ol className="stepper" aria-label={`${steps.length}단계 중 ${current}단계`}>
      {steps.map((s, i) => (
        <li key={s} className={i + 1 < current ? 'done' : i + 1 === current ? 'now' : ''} aria-current={i + 1 === current ? 'step' : undefined}>
          <span>{i + 1 < current ? <Check size={14} aria-hidden /> : i + 1}</span>{s}
        </li>
      ))}
    </ol>
  )
}

// 남은 시간(초)을 1초마다 줄인다
function useCountdown() {
  const [left, setLeft] = useState(0)
  useEffect(() => {
    if (left <= 0) return undefined
    const id = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [left])
  return [left, setLeft]
}
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// 이메일 + 코드 받기 + 인증 코드 입력. 시연용 코드를 화면에 알려 준다.
export function EmailCode({ email, setEmail, code, setCode, codeError, label = '이메일' }) {
  const [left, setLeft] = useCountdown()
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const send = async () => {
    setBusy(true)
    const r = await sendCode(email)
    setBusy(false)
    if (!r.ok) { setErr(r.message); return }
    setErr(null); setSent(true); setLeft(r.seconds ?? CODE_SECONDS)
  }
  const expired = sent && left <= 0
  return (
    <>
      <Field label={label} type="email" placeholder="예: name@sen.go.kr" value={email} autoComplete="email"
        onChange={(e) => { setEmail(e.target.value); setErr(null) }} state={err ? 'err' : null} help={err}
        right={<button type="button" className="btn" disabled={!emailOk(email) || busy} onClick={send}>{busy ? '보내는 중' : sent ? '다시 받기' : '코드 받기'}</button>} />
      {sent && (
        <Field label="인증 코드" inputMode="numeric" maxLength={6} placeholder="6자리 숫자" value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          state={codeError || expired ? 'err' : null}
          help={expired ? '인증 시간이 지났어요. 코드를 다시 받아 주세요.' : codeError ?? `남은 시간 ${mmss(left)} · 시연용 코드는 ${DEMO_CODE}예요`} />
      )}
    </>
  )
}
