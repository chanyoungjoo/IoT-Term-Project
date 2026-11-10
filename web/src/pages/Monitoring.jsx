import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { Search, Download, ArrowDown, ArrowUp } from 'lucide-react'
import { judgeRoom, decide, THRESHOLDS } from '@shared/rules.js'
import { school, FLOORS, historyFor } from '../api.js'
import { Card, StatusBadge, Segmented, Sparkline, Meter } from '../ui.jsx'
import { COLORS, fmt, stamp } from '../format.js'

const RANK = { bad: 2, warn: 1, ok: 0 }
const floorLabel = (id) => FLOORS.find((f) => f.id === id).label

// 확인 필요 카드에 보여 줄 "지금 무엇이 되고 있는지" 문장
function actionText(room, purifier, d) {
  const parts = []
  if (purifier.power) parts.push(`공기청정기 ${purifier.mode === 'auto' ? '자동 ' : ''}가동 중`)
  if (d.notify === 'ventilate') parts.push(room.teacher ? '담임 선생님께 환기 알림 보냄' : '환기 권장')
  if (d.notify === 'keepClosed') parts.push('환기 제한 알림 보냄')
  return parts.join(', ') || '자동 제어 대기 중'
}

const COLS = [
  { key: 'status', label: '상태', get: (r) => RANK[r.j.level] * 1e5 + r.sensor.co2 },
  { key: 'pm25', label: 'PM2.5', get: (r) => r.sensor.pm25 },
  { key: 'co2', label: 'CO₂', get: (r) => r.sensor.co2 },
  { key: 'temperature', label: '온도', get: (r) => r.sensor.temperature },
  { key: 'humidity', label: '습도', get: (r) => r.sensor.humidity },
]

export default function Monitoring() {
  const { snap } = useOutletContext()
  const [q, setQ] = useState('')
  const [floor, setFloor] = useState('all')
  const [level, setLevel] = useState('all')
  const [sort, setSort] = useState({ key: 'status', desc: true })

  const rows = snap.rooms.map((r) => ({
    ...r,
    j: judgeRoom(r.sensor),
    p: snap.purifiers.find((p) => p.roomId === r.id),
    d: decide({ sensor: r.sensor, outdoor: snap.outState }),
  }))
  const count = { all: rows.length, ok: 0, warn: 0, bad: 0 }
  rows.forEach((r) => (count[r.j.level] += 1))
  const attention = rows.filter((r) => r.j.level !== 'ok').sort((a, b) => COLS[0].get(b) - COLS[0].get(a))

  const get = COLS.find((c) => c.key === sort.key).get
  const shown = rows
    .filter((r) => r.name.includes(q.trim()))
    .filter((r) => floor === 'all' || r.floor === floor)
    .filter((r) => level === 'all' || r.j.level === level)
    .sort((a, b) => (sort.desc ? get(b) - get(a) : get(a) - get(b)))

  const downloadCsv = () => {
    const head = ['교실', '층', '상태', 'PM2.5', 'CO2', '온도', '습도', '공기청정기', '담임']
    const body = shown.map((r) => [r.name, floorLabel(r.floor), r.j.label, r.sensor.pm25, r.sensor.co2,
      r.sensor.temperature, r.sensor.humidity, r.p.power ? '가동' : '대기', r.teacher ?? '공용'])
    // 엑셀에서 한글이 깨지지 않게 BOM을 붙인다
    const csv = '﻿' + [head, ...body].map((l) => l.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `교실별_공기질_${school.updatedAt.slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const th = (c) => (
    <th key={c.key} aria-sort={sort.key === c.key ? (sort.desc ? 'descending' : 'ascending') : 'none'}>
      <button type="button" className="th-sort" onClick={() => setSort({ key: c.key, desc: sort.key === c.key ? !sort.desc : true })}>
        {c.label}
        {sort.key === c.key && (sort.desc ? <ArrowDown size={14} aria-hidden /> : <ArrowUp size={14} aria-hidden />)}
      </button>
    </th>
  )

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">교실별 모니터링</h1>
          <p className="page-sub">{school.building} {rows.length}개 교실, {stamp(school.updatedAt)} 기준</p>
        </div>
        <button type="button" className="btn" onClick={downloadCsv}><Download size={16} aria-hidden />CSV로 내려받기</button>
      </div>

      {attention.length > 0 && (
        <>
          <h2 className="section-title">지금 확인이 필요한 교실 {attention.length}곳</h2>
          <div className="attention-row">
            {attention.map((r) => (
              <Link key={r.id} to={`/monitoring/${r.id}`} className="card attention">
                <span className="room-tile-head">
                  <strong>{r.name}</strong>
                  <StatusBadge level={r.j.level}>{r.j.reason}</StatusBadge>
                </span>
                <span className="muted">
                  {r.j.level === 'bad'
                    ? `PM2.5 ${r.sensor.pm25}㎍/㎥, 기준 ${THRESHOLDS.indoorPm25Bad}`
                    : `CO₂ ${fmt(r.sensor.co2)}ppm, 기준 ${fmt(THRESHOLDS.co2High)}`}
                </span>
                <b className="txt-primary">{actionText(r, r.p, r.d)}</b>
              </Link>
            ))}
          </div>
        </>
      )}

      <Card>
        <div className="toolbar">
          <label className="search">
            <Search size={16} aria-hidden />
            <input type="search" placeholder="교실 이름 검색" aria-label="교실 이름 검색" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <Segmented label="층 필터" dark value={floor} onChange={setFloor}
            options={[{ value: 'all', label: '전체' }, ...FLOORS.map((f) => ({ value: f.id, label: f.label }))]} />
          <div className="chips" role="group" aria-label="상태 필터">
            {[['all', '전체'], ['ok', '정상'], ['warn', '주의'], ['bad', '경고']].map(([k, l]) => (
              <button key={k} type="button" className={`chip lv-${k}`} aria-pressed={level === k} onClick={() => setLevel(k)}>
                <i aria-hidden />{l} {count[k]}
              </button>
            ))}
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>교실</th>
                {th(COLS[0])}{th(COLS[1])}{th(COLS[2])}
                <th>최근 6시간 CO₂</th>
                {th(COLS[3])}{th(COLS[4])}
                <th>공기청정기</th><th>담임</th><th><span className="sr-only">상세</span></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className={`row-${r.j.level}`}>
                  <td><strong>{r.name}</strong><small className="muted block">{floorLabel(r.floor)}</small></td>
                  <td><StatusBadge level={r.j.level}>{r.j.label}</StatusBadge></td>
                  <td className="num"><span className="num-meter">{r.sensor.pm25}<Meter value={r.sensor.pm25} max={THRESHOLDS.indoorPm25Bad * 1.5} level={r.sensor.pm25 >= THRESHOLDS.indoorPm25Bad ? 'bad' : 'ok'} /></span></td>
                  <td className="num"><span className="num-meter">{fmt(r.sensor.co2)}<Meter value={r.sensor.co2} max={THRESHOLDS.co2High * 1.6} level={r.sensor.co2 >= THRESHOLDS.co2High ? 'warn' : 'ok'} /></span></td>
                  <td><Sparkline data={historyFor(r).co2.slice(-6)} limit={THRESHOLDS.co2High} color={r.sensor.co2 >= THRESHOLDS.co2High ? COLORS.warn : COLORS.primary} /></td>
                  <td className="num">{r.sensor.temperature.toFixed(1)}°C</td>
                  <td className="num">{r.sensor.humidity}%</td>
                  <td><span className={`dot-text ${r.p.power ? 'on' : ''}`}>{!r.p.online ? '연결 끊김' : r.p.power ? '가동 중' : '대기'}</span></td>
                  <td>{r.teacher ?? '공용'}</td>
                  <td><Link to={`/monitoring/${r.id}`} className="link">상세 보기</Link></td>
                </tr>
              ))}
              {shown.length === 0 && <tr><td colSpan={10} className="empty">조건에 맞는 교실이 없어요.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
