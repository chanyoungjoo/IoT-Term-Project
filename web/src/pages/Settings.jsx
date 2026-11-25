import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Gauge, Bell, House, CloudSun, User } from 'lucide-react'
import { THRESHOLDS } from '@shared/rules.js'
import { FLOORS } from '../api.js'
import { useAuth } from '../auth/useAuth.js'
import { changePassword, pwOk } from '../auth/authApi.js'
import { Card, StatusBadge, Switch, Segmented } from '../ui.jsx'

const MENU = [
  { id: 'threshold', label: '기준값', icon: Gauge },
  { id: 'notify', label: '알림', icon: Bell },
  { id: 'rooms', label: '교실·담임', icon: House },
  { id: 'outdoor', label: '실외 데이터', icon: CloudSun },
  { id: 'account', label: '계정', icon: User },
]

const INITIAL = {
  teachers: {}, // 바꾼 담임만 { roomId: '이름' }
  co2High: THRESHOLDS.co2High,
  indoorPm25Bad: THRESHOLDS.indoorPm25Bad,
  outdoorPm25Bad: THRESHOLDS.outdoorPm25Bad,
  notifyTeacher: true,
  classHoursOnly: true,
  repeat: '30',
  escalate: false,
  source: 'sensor',
  humidSwitch: true,
}

// 설정은 지금은 화면 안에서만 바뀐다. 판정 규칙(THRESHOLDS)은 서버 연결 후 이 값을 받아 쓰도록 바꾼다.
export default function Settings() {
  const { snap } = useOutletContext()
  const [menu, setMenu] = useState('threshold')
  const [form, setForm] = useState(INITIAL)
  const [saved, setSaved] = useState(INITIAL)
  const dirty = JSON.stringify(form) !== JSON.stringify(saved)
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">설정</h1>
        </div>
        <div className="head-actions">
          {!dirty && saved !== INITIAL && <span className="muted">저장했어요</span>}
          <button type="button" className="btn" disabled={!dirty} onClick={() => setForm(saved)}>되돌리기</button>
          <button type="button" className="btn btn-primary" disabled={!dirty} onClick={() => setSaved(form)}>변경 사항 저장</button>
        </div>
      </div>

      <div className="set-split">
        <nav className="set-nav" aria-label="설정 메뉴">
          {MENU.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" aria-pressed={menu === id} onClick={() => setMenu(id)}>
              <Icon size={18} aria-hidden />{label}
            </button>
          ))}
        </nav>
        <div className="col swap" key={menu}>
          {menu === 'threshold' && <ThresholdSection form={form} set={set} rooms={snap.rooms} />}
          {menu === 'notify' && <NotifySection form={form} set={set} />}
          {menu === 'rooms' && <RoomsSection rooms={snap.rooms} teachers={form.teachers} setTeachers={set('teachers')} />}
          {menu === 'outdoor' && <OutdoorSection form={form} set={set} snap={snap} />}
          {menu === 'account' && <AccountSection />}
        </div>
      </div>
    </>
  )
}

function NumField({ label, value, unit, onChange }) {
  return (
    <div className="setting-row">
      <div><strong>{label}</strong></div>
      <label className="num-field">
        <span className="sr-only">{label}</span>
        <input inputMode="numeric" value={value}
          onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '')) || 0)} />
        <em>{unit}</em>
      </label>
    </div>
  )
}

function ThresholdSection({ form, set, rooms }) {
  // 입력한 기준으로 지금 교실을 다시 판정해 미리 보여 준다 (judgeRoom과 같은 순서: PM2.5 → CO₂)
  const count = { bad: 0, warn: 0, ok: 0 }
  rooms.forEach((r) => {
    const lv = r.sensor.pm25 >= form.indoorPm25Bad ? 'bad' : r.sensor.co2 >= form.co2High ? 'warn' : 'ok'
    count[lv] += 1
  })
  return (
    <Card title="판단 기준값">
      <NumField label="CO₂ 환기 기준" value={form.co2High.toLocaleString('ko-KR')} unit="ppm" onChange={set('co2High')} />
      <NumField label="실내 PM2.5 경고 기준" value={form.indoorPm25Bad} unit="㎍/㎥" onChange={set('indoorPm25Bad')} />
      <NumField label="실외 PM2.5 나쁨 기준" value={form.outdoorPm25Bad} unit="㎍/㎥" onChange={set('outdoorPm25Bad')} />
      <div className="preview">
        <strong>이 기준으로 지금 교실을 보면</strong>
        <span className="dots-row">
          <StatusBadge level="bad">경고 {count.bad}</StatusBadge>
          <StatusBadge level="warn">주의 {count.warn}</StatusBadge>
          <StatusBadge level="ok">정상 {count.ok}</StatusBadge>
        </span>
      </div>
    </Card>
  )
}

function NotifySection({ form, set }) {
  return (
    <Card title="알림">
      <div className="setting-row">
        <div><strong>담임 선생님께 앱 알림</strong></div>
        <Switch label="담임 선생님께 앱 알림" checked={form.notifyTeacher} onChange={set('notifyTeacher')} />
      </div>
      <div className="setting-row">
        <div><strong>수업 시간에만 알림</strong><span>평일 08:30 ~ 16:30, 주말·방학 제외</span></div>
        <Switch label="수업 시간에만 알림" checked={form.classHoursOnly} disabled={!form.notifyTeacher} onChange={set('classHoursOnly')} />
      </div>
      <div className="setting-row">
        <div><strong>같은 교실 재알림 간격</strong></div>
        <Segmented label="재알림 간격" value={form.repeat} onChange={set('repeat')}
          options={[{ value: '15', label: '15분' }, { value: '30', label: '30분' }, { value: '60', label: '1시간' }]} />
      </div>
      <div className="setting-row">
        <div><strong>10분 넘게 미확인이면 행정실로 전달</strong></div>
        <Switch label="10분 넘게 미확인이면 행정실로 전달" checked={form.escalate} onChange={set('escalate')} />
      </div>
    </Card>
  )
}

// 교실별 담임 배정. 기기 연결 상태는 '장치 제어' 화면에서 본다.
function RoomsSection({ rooms, teachers, setTeachers }) {
  const floorLabel = (id) => FLOORS.find((f) => f.id === id).label
  return (
    <Card title="교실·담임">
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>교실</th><th>층</th><th>담임 선생님</th></tr></thead>
          <tbody>
            {rooms.map((r) => {
              const v = teachers[r.id] ?? r.teacher ?? ''
              return (
                <tr key={r.id}>
                  <td className="nowrap"><b>{r.name}</b></td>
                  <td className="muted">{floorLabel(r.floor)}</td>
                  <td>
                    <label className="text-field">
                      <span className="sr-only">{r.name} 담임</span>
                      <input value={v} placeholder="공용 교실" onChange={(e) => setTeachers({ ...teachers, [r.id]: e.target.value })} />
                    </label>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function OutdoorSection({ form, set, snap }) {
  const { outdoor, outPm } = snap
  return (
    <Card title="실외 데이터">
      <div className="setting-row">
        <div><strong>실외 PM2.5 기본 출처</strong><span>공공 API: {outdoor.api.station}</span></div>
        <Segmented label="실외 PM2.5 기본 출처" value={form.source} onChange={set('source')}
          options={[{ value: 'sensor', label: '학교 센서' }, { value: 'api', label: '공공 API' }]} />
      </div>
      <div className="setting-row">
        <div><strong>실외 습도 {THRESHOLDS.outdoorHumidityHigh}% 이상이면 API 값 사용</strong></div>
        <Switch label={`실외 습도 ${THRESHOLDS.outdoorHumidityHigh}% 이상이면 API 값 사용`} checked={form.humidSwitch} disabled={form.source === 'api'} onChange={set('humidSwitch')} />
      </div>
      <div className="preview">
        <strong>지금 쓰는 값</strong>
        <span>{outPm.pm25 ?? '-'}㎍/㎥ · {outPm.source === 'api' ? `공공 API (${outdoor.api.ageMinutes}분 전)` : `학교 센서 (습도 ${outdoor.sensor.humidity}%)`}</span>
      </div>
    </Card>
  )
}

function AccountSection() {
  const { user } = useAuth()
  const { logout } = useOutletContext()
  const [open, setOpen] = useState(false)
  const [cur, setCur] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [msg, setMsg] = useState(null) // { ok, text }
  const [busy, setBusy] = useState(false)
  const ok = cur && pwOk(pw) && pw === pw2
  const save = async () => {
    setBusy(true)
    const r = await changePassword(user.id, cur, pw)
    setBusy(false)
    if (r.ok) { setMsg({ ok: true, text: '비밀번호를 바꿨어요.' }); setOpen(false); setCur(''); setPw(''); setPw2('') }
    else setMsg({ ok: false, text: r.message })
  }
  return (
    <Card title="계정">
      <div className="setting-row">
        <div><strong>{user.name} {user.role}</strong><span>{user.school} 행정실 · 아이디 {user.id} · {user.email}</span></div>
      </div>
      <div className="setting-row">
        <div><strong>비밀번호 변경</strong><span>{msg ? msg.text : '8자 이상, 영문+숫자+특수문자'}</span></div>
        <button type="button" className="btn" aria-expanded={open} onClick={() => { setOpen((v) => !v); setMsg(null) }}>{open ? '닫기' : '변경하기'}</button>
      </div>
      {open && (
        <div className="pw-form swap">
          <label className="text-field"><span>현재 비밀번호</span><input type="password" value={cur} autoComplete="current-password" onChange={(e) => setCur(e.target.value)} /></label>
          <label className="text-field"><span>새 비밀번호</span><input type="password" value={pw} autoComplete="new-password" onChange={(e) => setPw(e.target.value)} /></label>
          <label className="text-field"><span>새 비밀번호 확인</span><input type="password" value={pw2} autoComplete="new-password" onChange={(e) => setPw2(e.target.value)} /></label>
          <div className="pw-form-foot">
            <span className={msg && !msg.ok ? 'txt-bad' : 'muted'}>
              {msg && !msg.ok ? msg.text : pw && !pwOk(pw) ? '새 비밀번호 규칙을 확인해 주세요' : pw2 && pw !== pw2 ? '새 비밀번호가 서로 달라요' : ' '}
            </span>
            <button type="button" className="btn btn-primary" disabled={!ok || busy} onClick={save}>{busy ? '바꾸는 중' : '비밀번호 바꾸기'}</button>
          </div>
        </div>
      )}
      <div className="setting-row">
        <div><strong>로그아웃</strong></div>
        <button type="button" className="btn" onClick={logout}>로그아웃</button>
      </div>
    </Card>
  )
}
