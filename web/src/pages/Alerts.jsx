import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { Download } from 'lucide-react'
import { THRESHOLDS } from '@shared/rules.js'
import { alertHistory, school } from '../api.js'
import { Card, StatusBadge, Segmented, Stat, Sparkline } from '../ui.jsx'
import { COLORS } from '../format.js'

const TAG_LEVEL = { 경고: 'bad', 주의: 'warn', 제어: 'neutral' }
const STATUS = {
  auto: { level: 'info', label: '자동 처리' },
  done: { level: 'ok', label: '대응 완료' },
  open: { level: 'bad', label: '미확인' },
}
const PERIODS = [{ value: 'today', label: '오늘' }, { value: 'week', label: '최근 7일' }]

function StatusTag({ status }) {
  const s = STATUS[status]
  return <StatusBadge level={s.level}>{s.label}</StatusBadge>
}

// 공기 상태 사건(경고·주의)과 그 뒤의 조치를 보여 준다. 장치 동작 자체는 '장치 제어'의 제어 기록에서 본다.
export default function Alerts() {
  const { snap, addLog } = useOutletContext()
  const [period, setPeriod] = useState('today')
  const [selectedId, setSelectedId] = useState('h2')
  // 화면에서 바꾼 처리 상태 (재알림·확인 완료), 새로고침하면 처음으로 돌아간다
  const [patch, setPatch] = useState({})

  const roomOf = (id) => snap.rooms.find((r) => r.id === id)
  const events = alertHistory.map((e) => ({ ...e, ...patch[e.id], room: e.roomId ? roomOf(e.roomId) : null }))
  const shown = events.filter((e) => period === 'week' || e.day === '오늘')
  const today = events.filter((e) => e.day === '오늘')
  const count = (f) => today.filter(f).length
  const cur = shown.find((e) => e.id === selectedId) ?? shown[0]

  const resend = (e) => {
    setPatch((p) => ({ ...p, [e.id]: { ...p[e.id], resent: true } }))
    addLog({ roomId: e.roomId, device: '환기 알림', action: '담임 선생님께 다시 알림 발송' })
  }
  const markDone = (e) =>
    setPatch((p) => ({ ...p, [e.id]: { ...p[e.id], status: 'done', action: '행정실에서 확인 완료' } }))

  const downloadCsv = () => {
    const head = ['날짜', '시간', '교실', '종류', '내용', '조치', '처리 상태']
    const body = shown.map((e) => [e.day, e.time, e.room?.name ?? '전체', e.tag, e.text, e.action, STATUS[e.status].label])
    // 엑셀에서 한글이 깨지지 않게 BOM을 붙인다. 쉼표가 든 칸은 따옴표로 감싼다.
    const cell = (v) => (/[",]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v)
    const csv = '﻿' + [head, ...body].map((l) => l.map(cell).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `알림_이력_${school.updatedAt.slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">알림 이력</h1>
        </div>
        <div className="head-actions">
          <button type="button" className="btn" onClick={downloadCsv}><Download size={16} aria-hidden /> CSV로 내려받기</button>
        </div>
      </div>

      <div className="stats-row stats-4">
        <Stat label="오늘 경고" value={count((e) => e.tag === '경고')} unit="건" tone="bad" sub={`PM2.5 ${THRESHOLDS.indoorPm25Bad}㎍/㎥ 이상`} />
        <Stat label="오늘 주의" value={count((e) => e.tag === '주의')} unit="건" sub={`CO₂ ${THRESHOLDS.co2High.toLocaleString('ko-KR')}ppm 이상`} />
        <Stat label="자동 처리" value={count((e) => e.status === 'auto')} unit="건" />
        <Stat label="미확인" value={count((e) => e.status === 'open')} unit="건" tone="warn" />
      </div>

      <div className="dash-grid">
        <Card title="기록" extra={<Segmented label="기간" value={period} dark onChange={setPeriod} options={PERIODS} />}>
          {['오늘', '어제'].map((day) => {
            const list = shown.filter((e) => e.day === day)
            if (!list.length) return null
            return (
              <div key={day} className="ev-group">
                <h3 className="ev-day">{day}</h3>
                {list.map((e) => (
                  <button key={e.id} type="button" className={`ev-row st-${e.status}`} aria-pressed={e.id === cur.id} onClick={() => setSelectedId(e.id)}>
                    <time>{e.time}</time>
                    <span className={`tag lv-${TAG_LEVEL[e.tag]}`}>{e.tag}</span>
                    <span className="ev-main"><b>{e.room?.name ?? '전체 교실'}</b> {e.text}<small>{e.action}</small></span>
                    <StatusTag status={e.status} />
                  </button>
                ))}
              </div>
            )
          })}
        </Card>

        {cur && <EventPanel key={cur.id} e={cur} onResend={resend} onDone={markDone} />}
      </div>
    </>
  )
}

function EventPanel({ e, onResend, onDone }) {
  const limit = e.metric === 'co2' ? THRESHOLDS.co2High : THRESHOLDS.indoorPm25Bad
  return (
    <Card className="room-panel swap">
      <div className="panel-head">
        <div>
          <span className="muted">{e.day} {e.time}</span>
          <h2>{e.room?.name ?? '전체 교실'}</h2>
        </div>
        <StatusTag status={e.status} />
      </div>
      <p className="ev-text"><span className={`tag lv-${TAG_LEVEL[e.tag]}`}>{e.tag}</span> {e.text}</p>

      {e.trend && (
        <div className="ev-spark">
          <small>알림 전후 {e.metric === 'co2' ? 'CO₂' : 'PM2.5'} 추이 (점선: 기준 {limit.toLocaleString('ko-KR')})</small>
          <Sparkline data={e.trend} limit={limit} color={e.tag === '경고' ? COLORS.bad : COLORS.warn} w={290} h={70} />
        </div>
      )}

      <ol className="ev-timeline">
        {e.steps.map((s, i) => (
          <li key={i} className={s.pending && e.status === 'open' ? 'pending' : ''}>
            <time>{s.time}</time><span>{s.pending && e.status !== 'open' ? '행정실에서 확인했어요' : s.text}</span>
          </li>
        ))}
      </ol>

      <div className="panel-actions">
        {e.status === 'open' && e.room?.teacher && (
          <button type="button" className="btn btn-primary" disabled={e.resent} onClick={() => onResend(e)}>
            {e.resent ? '다시 알림을 보냈어요' : '다시 알림 보내기'}
          </button>
        )}
        {e.status === 'open' && !e.room?.teacher && (
          <button type="button" className="btn btn-primary" onClick={() => onDone(e)}>확인 완료로 표시</button>
        )}
        {e.room && <Link to={`/monitoring/${e.room.id}`} className="btn">교실 상세</Link>}
      </div>
    </Card>
  )
}
