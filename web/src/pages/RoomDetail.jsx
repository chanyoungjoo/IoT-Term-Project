import { useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts'
import { judgeRoom, THRESHOLDS } from '@shared/rules.js'
import { school, historyFor, RULES } from '../api.js'
import { Card, StatusBadge, Segmented, Stat } from '../ui.jsx'
import { COLORS, REDUCED, fmt } from '../format.js'

const METRICS = {
  co2: { label: 'CO₂', unit: 'ppm', limit: THRESHOLDS.co2High, limitLabel: '환기 필요', color: COLORS.warn },
  pm25: { label: 'PM2.5', unit: '㎍/㎥', limit: THRESHOLDS.indoorPm25Bad, limitLabel: '나쁨', color: COLORS.bad },
}
const RULE_TONE = { 1: 'bad', 2: 'warn', 3: 'navy', 4: 'info', 5: 'ok' }

// 24개 값 = 어제 10시 ~ 지금. 4시간마다 눈금.
const hourLabel = (i) => {
  if (i === 23) return '지금'
  const h = (10 + i) % 24
  return i === 0 ? '어제 10시' : `${h}시`
}

export default function RoomDetail() {
  const { id } = useParams()
  const { snap, log } = useOutletContext()
  const [metric, setMetric] = useState('co2')
  const room = snap.rooms.find((r) => r.id === id)

  if (!room) {
    return (
      <>
        <Link to="/monitoring" className="link back"><ChevronLeft size={16} aria-hidden />교실 목록으로 돌아가기</Link>
        <h1 className="page-title">교실을 찾을 수 없어요</h1>
      </>
    )
  }

  const s = room.sensor
  const j = judgeRoom(s)
  const m = METRICS[metric]
  const data = historyFor(room)[metric].map((v, i) => ({ x: hourLabel(i), v }))
  // 눈금이 딱 떨어지게 위쪽 끝을 반올림 (CO₂ 250 단위, PM2.5 10 단위)
  const step = metric === 'co2' ? 250 : 10
  const top = Math.ceil((Math.max(...data.map((d) => d.v), m.limit) * 1.1) / step) * step
  const roomLog = log.filter((l) => l.roomId === room.id)
  const ruleLog = roomLog.filter((l) => l.rule)

  return (
    <>
      <Link to="/monitoring" className="link back"><ChevronLeft size={16} aria-hidden />교실 목록으로 돌아가기</Link>
      <div className="page-head">
        <div>
          <p className="page-sub">
            {room.floor === 's' ? '특별실' : `${school.building} ${room.floor}층`}
            {room.teacher ? `, 담임 ${room.teacher} 선생님` : ', 공용 교실'}
          </p>
          <h1 className="page-title title-row">
            {room.name}
            <StatusBadge level={j.level}>{j.label}{j.reason && `, ${j.reason}`}</StatusBadge>
          </h1>
        </div>
        <div className="head-stats">
          <Stat label="PM2.5" value={s.pm25} unit="㎍/㎥" tone={s.pm25 >= THRESHOLDS.indoorPm25Bad ? 'bad' : undefined} />
          <Stat label="CO₂" value={fmt(s.co2)} unit="ppm" tone={s.co2 >= THRESHOLDS.co2High ? 'warn' : undefined} />
          <Stat label="온도" value={`${s.temperature.toFixed(1)}°C`} />
          <Stat label="습도" value={`${s.humidity}%`} />
        </div>
      </div>

      <Card title="최근 24시간 추이" extra={
        <Segmented label="지표 선택" dark value={metric} onChange={setMetric}
          options={[{ value: 'co2', label: 'CO₂' }, { value: 'pm25', label: 'PM2.5' }]} />
      }>
        <div className="chart" role="img" aria-label={`${m.label} 24시간 추이, 지금 ${data[23].v}${m.unit}, 최고 ${Math.max(...data.map((d) => d.v))}${m.unit}`}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data} margin={{ top: 16, right: 24, bottom: 0, left: -8 }}>
              <CartesianGrid vertical={false} stroke={COLORS.border} />
              <ReferenceLine y={m.limit} stroke={m.color} strokeDasharray="5 4"
                label={{ value: `${m.limitLabel} ${fmt(m.limit)}${m.unit}`, position: 'insideTopRight', fill: m.color, fontSize: 12 }} />
              <XAxis dataKey="x" interval={3} tickLine={false} axisLine={false} tick={{ fill: COLORS.sub, fontSize: 12 }} />
              <YAxis domain={[0, top]} ticks={Array.from({ length: top / step + 1 }, (_, i) => i * step).filter((_, i, a) => a.length < 8 || i % 2 === 0)} tickFormatter={fmt}
                tickLine={false} axisLine={false} tick={{ fill: COLORS.sub, fontSize: 12 }} />
              <Area dataKey="v" stroke={COLORS.primary} strokeWidth={3} fill={COLORS.primary} fillOpacity={0.08} isAnimationActive={!REDUCED} animationDuration={700} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="detail-grid">
        <Card title="장치 제어 이력">
          {roomLog.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>시각</th><th>장치</th><th>동작</th><th>방식</th></tr></thead>
                <tbody>
                  {roomLog.map((l) => (
                    <tr key={l.id}>
                      <td className="nowrap">{l.time}</td><td>{l.device}</td><td>{l.action}</td>
                      <td><span className={`mode-pill ${l.by === 'auto' ? 'auto' : 'manual'}`}>{l.by === 'auto' ? '자동' : '수동'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="empty">아직 제어 기록이 없어요.</p>}
        </Card>
        <Card title="적용된 제어 규칙">
          {ruleLog.length ? (
            <ul className="rule-list">
              {ruleLog.map((l) => (
                <li key={l.id}>
                  <span className={`rule-no tone-${RULE_TONE[l.rule]}`}>{l.rule}</span>
                  <div>
                    <strong>{RULES.find((r) => r.id === l.rule).title}</strong>
                    <span className="muted block">{l.detail ?? l.time}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="empty">아직 적용된 규칙이 없어요.</p>}
        </Card>
      </div>
    </>
  )
}
