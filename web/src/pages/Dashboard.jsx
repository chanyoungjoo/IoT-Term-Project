import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceArea, ReferenceLine } from 'recharts'
import { judgeRoom, decide, summarize, THRESHOLDS } from '@shared/rules.js'
import { school, FLOORS } from '../api.js'
import { Card, StatusBadge, Switch, Segmented, Stat, Meter } from '../ui.jsx'
import { COLORS, REDUCED, fmt, stamp } from '../format.js'

const RULE_TONE = { 1: 'bad', 2: 'warn', 3: 'navy', 5: 'ok' }
const inRange = (v, [lo, hi]) => v >= lo && v <= hi

// 수치 4개의 상태 (기준을 넘으면 그 값만 상태색으로 보여 준다)
const levelsOf = (s) => ({
  pm25: s.pm25 >= THRESHOLDS.indoorPm25Bad ? 'bad' : 'ok',
  co2: s.co2 >= THRESHOLDS.co2High ? 'warn' : 'ok',
  temp: inRange(s.temperature, THRESHOLDS.comfortTemp) ? 'ok' : 'warn',
  hum: inRange(s.humidity, THRESHOLDS.comfortHumidity) ? 'ok' : 'warn',
})
const TAG_LEVEL = { 경고: 'bad', 주의: 'warn', 제어: 'neutral', 예측: 'info' }

export default function Dashboard() {
  const { snap, editPurifiers, addLog } = useOutletContext()
  const { rooms, outdoor, outPm, outState, purifiers, alerts } = snap
  const [floor, setFloor] = useState('2')
  const [selectedId, setSelectedId] = useState('2-2')
  const [sent, setSent] = useState({})
  const sum = summarize(rooms, purifiers)
  const floorRooms = rooms.filter((r) => r.floor === floor)
  const tile = (r) => (
    <RoomTile key={r.id} room={r} purifier={purifiers.find((p) => p.roomId === r.id)}
      selected={r.id === selectedId} onSelect={() => setSelectedId(r.id)} />
  )

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">전체 교실 공기질 현황</h1>
          <p className="page-sub">{stamp(school.updatedAt)} 기준, 1분마다 자동 갱신</p>
        </div>
        <div className="head-actions">
          <label className="select-label">
            건물
            <select defaultValue={school.building}><option>{school.building}</option></select>
          </label>
          <Link to="/devices" className="btn btn-primary">일괄 제어</Link>
        </div>
      </div>

      <div className="stats-row">
        <Stat label="관리 교실" value={sum.total} unit="개" sub={
          <span className="dots">
            <StatusBadge level="ok">정상 {sum.ok}</StatusBadge>
            <StatusBadge level="warn">주의 {sum.warn}</StatusBadge>
            <StatusBadge level="bad">경고 {sum.bad}</StatusBadge>
          </span>
        } />
        <Stat
          label="실외 PM2.5 지금" value={outPm.pm25 ?? '-'} unit="㎍/㎥" tone={outState === 'bad' ? 'bad' : undefined}
          sub={<b className={`txt-${outState === 'bad' ? 'bad' : 'ok'}`}>{outState === 'bad' ? '나쁨' : outState === 'good' ? '보통' : '알 수 없음'}{outPm.source === 'api' && ' · 공공 API 값'}</b>}
        />
        <Stat label={<>2시간 뒤 실외 예측 <span className="tag-future">향후 확장</span></>} value={outdoor.forecast[1]} unit="㎍/㎥" sub="더미 예측값이에요" />
        <Stat label="평균 CO₂" value={fmt(sum.avgCo2)} unit="ppm" sub={`기준 ${fmt(THRESHOLDS.co2High)}ppm 이하`} />
        <Stat label="공기청정기 가동" value={sum.purifiersOn} unit={` / ${purifiers.length}대`} sub={`자동 제어 ${sum.purifiersAuto}대 적용 중`} />
      </div>

      <div className="dash-grid">
        <div className="col">
          <Card title="교실 상태 맵" extra={
            <Segmented label="층 선택" value={floor} dark onChange={setFloor}
              options={FLOORS.map((f) => ({ value: f.id, label: f.label }))} />
          }>
            <div className="room-map">
              {floorRooms.map((r) => tile(r))}
            </div>
          </Card>
          <OutdoorChart outdoor={outdoor} />
        </div>

        <div className="col">
          <RoomPanel
            key={selectedId}
            room={rooms.find((r) => r.id === selectedId)}
            purifier={purifiers.find((p) => p.roomId === selectedId)}
            outState={outState} outPm={outPm.pm25} sent={sent[selectedId]}
            onAuto={(p, on) => {
              editPurifiers([p.id], { mode: on ? 'auto' : 'manual' })
              addLog({ roomId: p.roomId, device: '공기청정기', action: on ? '자동 모드로 전환' : '수동 모드로 전환' })
            }}
            onPower={(p, on) => {
              editPurifiers([p.id], { mode: 'manual', power: on })
              addLog({ roomId: p.roomId, device: '공기청정기', action: on ? '전원 켜기' : '전원 끄기' })
            }}
            onSend={(r) => {
              setSent((s) => ({ ...s, [r.id]: true }))
              addLog({ roomId: r.id, device: '환기 알림', action: '담임 선생님께 알림 발송' })
            }}
          />
          <Card title="실시간 알림" extra={<Link to="/alerts" className="link">전체 보기</Link>}>
            <ul className="alert-list">
              {alerts.map((a) => (
                <li key={a.id}>
                  <span className={`tag lv-${TAG_LEVEL[a.tag]}`}>{a.tag}</span>
                  <p>{a.text}</p>
                  <time>{a.time}</time>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  )
}

function RoomTile({ room, purifier, selected, onSelect }) {
  const j = judgeRoom(room.sensor)
  const s = room.sensor
  const lv = levelsOf(s)
  return (
    <button type="button" className={`room-tile lv-${j.level}`} aria-pressed={selected} onClick={onSelect}>
      <span className="room-tile-head">
        <strong>{room.name}</strong>
        <StatusBadge level={j.level}>{j.label}</StatusBadge>
      </span>
      {/* 2×2 고정 칸: 모든 카드에서 같은 수치가 같은 자리에 온다 */}
      <span className="tile-metrics">
        <TileMetric label="PM2.5" value={s.pm25} unit="㎍/㎥" lv={lv.pm25} big />
        <TileMetric label="CO₂" value={fmt(s.co2)} unit="ppm" lv={lv.co2} big />
        <TileMetric label="온도" value={s.temperature.toFixed(1)} unit="°C" lv={lv.temp} />
        <TileMetric label="습도" value={s.humidity} unit="%" lv={lv.hum} />
      </span>
      <span className={`dot-text ${purifier.power && purifier.online ? 'on' : ''}`}>
        공기청정기 {!purifier.online ? '연결 끊김' : purifier.power ? '가동 중' : '대기'}
      </span>
    </button>
  )
}

function TileMetric({ label, value, unit, lv, big }) {
  return (
    <span className={`tile-metric ${big ? 'big' : ''}`}>
      <small>{label}</small>
      <b className={`pop val-${lv}`} key={value}>{value}<em>{unit}</em></b>
    </span>
  )
}

function PanelMetric({ label, value, unit, lv, ratio }) {
  return (
    <div>
      <small>{label}</small>
      <b className={`val-${lv}`}>{value}<em>{unit}</em></b>
      <Meter value={ratio} max={1} level={lv} />
    </div>
  )
}

function RoomPanel({ room, purifier, outState, outPm, sent, onAuto, onPower, onSend }) {
  const s = room.sensor
  const j = judgeRoom(s)
  const d = decide({ sensor: s, outdoor: outState, purifierMode: purifier.mode })
  const lv = levelsOf(s)
  return (
    <Card className="room-panel swap">
      <div className="panel-head">
        <div>
          <span className="muted">{room.floor === 's' ? '특별실' : `본관 ${room.floor}층`}</span>
          <h2>{room.name}</h2>
        </div>
        <StatusBadge level={j.level}>{j.label}</StatusBadge>
      </div>
      {/* 네 칸 모두 이름 → 값+단위 → 기준 막대 순서로 맞춘다 */}
      <div className="panel-nums">
        <PanelMetric label="PM2.5" value={s.pm25} unit="㎍/㎥" lv={lv.pm25} ratio={s.pm25 / (THRESHOLDS.indoorPm25Bad * 2)} />
        <PanelMetric label="CO₂" value={fmt(s.co2)} unit="ppm" lv={lv.co2} ratio={s.co2 / (THRESHOLDS.co2High * 1.6)} />
        <PanelMetric label="온도" value={s.temperature.toFixed(1)} unit="°C" lv={lv.temp} ratio={s.temperature / 35} />
        <PanelMetric label="습도" value={s.humidity} unit="%" lv={lv.hum} ratio={s.humidity / 100} />
      </div>
      <div className="setting-row">
        <div><strong>자동 제어</strong><span>규칙에 따라 장치를 켜고 꺼요</span></div>
        <Switch label="자동 제어" checked={purifier.mode === 'auto'} disabled={!purifier.online} onChange={(v) => onAuto(purifier, v)} />
      </div>
      <div className="setting-row">
        <div><strong>공기청정기</strong><span>{!purifier.online ? '연결이 끊겼어요' : purifier.power ? '가동 중이에요' : '꺼져 있어요'}</span></div>
        <Switch label="공기청정기 전원" checked={purifier.power} disabled={!purifier.online} onChange={(v) => onPower(purifier, v)} />
      </div>
      <div className={`decision swap tone-${RULE_TONE[d.rule]}`} key={d.rule}>
        <small>환기 판단</small>
        <strong>{d.title}</strong>
        <p>규칙 {d.rule} 적용: {d.message}{outPm != null && ` 실외 PM2.5는 ${outPm}이에요.`}</p>
      </div>
      <div className="panel-actions">
        {room.teacher && d.notify && (
          <button type="button" className="btn btn-primary" disabled={sent} onClick={() => onSend(room)}>
            {sent ? '알림을 보냈어요' : '담임 선생님께 알림 보내기'}
          </button>
        )}
        <Link to={`/monitoring/${room.id}`} className="btn">교실 상세</Link>
      </div>
    </Card>
  )
}

function OutdoorChart({ outdoor }) {
  const past = [...outdoor.history, outdoor.now]
  const data = [
    ...past.map((v, i) => ({ x: i === 5 ? '지금' : `-${5 - i}h`, measured: v, forecast: i === 5 ? v : null })),
    ...outdoor.forecast.map((v, i) => ({ x: `+${i + 1}h`, forecast: v })),
  ]
  const top = Math.ceil(Math.max(...outdoor.forecast, ...past, THRESHOLDS.outdoorPm25Bad) / 10) * 10 + 10
  return (
    <Card title={<>실외 미세먼지 예측 <span className="tag-future">향후 확장</span></>} extra={
      <span className="legend">
        <span><i className="lg-line" />측정값</span>
        <span><i className="lg-dash" />예측값(더미)</span>
        <span><i className="lg-zone" />나쁨 구간 ({THRESHOLDS.outdoorPm25Bad} 이상)</span>
      </span>
    }>
      <div className="chart" role="img" aria-label={`실외 PM2.5 지금 ${outdoor.now}, 5시간 예측 최대 ${Math.max(...outdoor.forecast)}`}>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 16, right: 16, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke={COLORS.border} />
            <ReferenceArea y1={THRESHOLDS.outdoorPm25Bad} y2={top} fill={COLORS.bad} fillOpacity={0.06} />
            <ReferenceLine y={THRESHOLDS.outdoorPm25Bad} stroke={COLORS.bad} strokeDasharray="5 4"
              label={{ value: `나쁨 기준 ${THRESHOLDS.outdoorPm25Bad}`, position: 'insideTopRight', fill: COLORS.bad, fontSize: 12 }} />
            <ReferenceLine x="지금" stroke={COLORS.sub} strokeDasharray="2 3" />
            <XAxis dataKey="x" tickLine={false} axisLine={false} tick={{ fill: COLORS.sub, fontSize: 12 }} />
            <YAxis domain={[0, top]} tickLine={false} axisLine={false} tick={{ fill: COLORS.sub, fontSize: 12 }} />
            <Line dataKey="measured" stroke={COLORS.primary} strokeWidth={3} dot={false} isAnimationActive={!REDUCED} animationDuration={900} />
            <Line dataKey="forecast" stroke={COLORS.warn} strokeWidth={3} strokeDasharray="6 5" dot={false} isAnimationActive={!REDUCED} animationBegin={500} animationDuration={900} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
