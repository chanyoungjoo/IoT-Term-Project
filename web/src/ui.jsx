// 공용 컴포넌트: 카드, 상태 배지, 스위치, 세그먼트 탭, 수치 카드, 스파크라인
import { COLORS } from './format.js'

export function Card({ title, extra, className = '', children }) {
  return (
    <section className={`card ${className}`}>
      {(title || extra) && (
        <header className="card-head">
          {title && <h2>{title}</h2>}
          {extra}
        </header>
      )}
      {children}
    </section>
  )
}

// level: 'ok' | 'warn' | 'bad'
export function StatusBadge({ level, children }) {
  return <span className={`badge lv-${level}`}><i aria-hidden />{children}</span>
}

export function Switch({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked} aria-label={label}
      className="switch" disabled={disabled} onClick={() => onChange(!checked)}
    />
  )
}

// options: [{ value, label }]
export function Segmented({ options, value, onChange, label, dark }) {
  return (
    <div className={`seg ${dark ? 'seg-dark' : ''}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Stat({ label, value, unit, sub, tone }) {
  return (
    <div className={`stat ${tone ? `tone-${tone}` : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value pop" key={String(value)}>{value}{unit && <small>{unit}</small>}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

// 작은 추이선. limit이 있으면 점선 기준선을 그린다.
export function Sparkline({ data, limit, color = COLORS.primary, w = 120, h = 28 }) {
  const max = Math.max(...data, limit ?? 0) * 1.05
  const min = Math.min(...data) * 0.9
  const y = (v) => h - ((v - min) / (max - min)) * h
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${y(v)}`).join(' ')
  return (
    <svg width={w} height={h} aria-hidden>
      {limit && <line x1="0" x2={w} y1={y(limit)} y2={y(limit)} stroke={COLORS.warn} strokeDasharray="3 3" strokeWidth="1" />}
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// 기준 대비 막대 (표, 상세 패널)
export function Meter({ value, max, level }) {
  return (
    <span className="meter" aria-hidden>
      <span className={`meter-fill lv-${level}`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </span>
  )
}
