import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { RotateCcw } from 'lucide-react'
import { FLOORS, SPEEDS, RULES } from '../api.js'
import { Card, Switch, Segmented, Stat, Meter } from '../ui.jsx'

const ACTIONS = {
  on: { label: '전원 켜기', verb: '켜요', patch: { mode: 'manual', power: true } },
  off: { label: '전원 끄기', verb: '꺼요', patch: { mode: 'manual', power: false } },
  auto: { label: '자동 모드로', verb: '자동 모드로 바꿔요', patch: { mode: 'auto' } },
  strong: { label: '풍량 강으로', verb: '풍량 강으로 바꿔요', patch: { speed: 2 } },
  // 창문은 공기청정기가 아니라 창문 장치(WD-…)에 적용
  wclose: { label: '창문 모두 닫기', verb: '모두 닫아요', patch: { open: false }, device: 'window' },
}

export default function Devices() {
  const { snap, log, editPurifiers, editDevices, addLog } = useOutletContext()
  const { rooms, purifiers, windows } = snap
  const [target, setTarget] = useState('all')
  const [action, setAction] = useState('on')
  // shortcut: 규칙 토글은 화면 표시만 바뀌고 판정(decide)에는 반영 안 됨, FastAPI 연결 시 서버 규칙 설정으로 교체
  const [rulesOn, setRulesOn] = useState({ 1: true, 2: true, 3: true, 5: true })

  const roomOf = (id) => rooms.find((r) => r.id === id)
  const targetLabel = target === 'all' ? '전체' : FLOORS.find((f) => f.id === target).label
  const list = purifiers.filter((p) => target === 'all' || roomOf(p.roomId).floor === target)
  const reachable = list.filter((p) => p.online)
  const offline = purifiers.filter((p) => !p.online)
  const windowOf = (roomId) => windows.find((w) => w.roomId === roomId)
  const isWindowAction = ACTIONS[action].device === 'window'
  const openRecs = windows.filter((w) => w.rec?.action === 'open').length
  const closeRecs = windows.filter((w) => w.rec?.action === 'close').length

  const edit = (p, patch, action) => {
    editPurifiers([p.id], patch)
    addLog({ roomId: p.roomId, device: '공기청정기', action })
  }
  const apply = () => {
    if (isWindowAction) {
      const ids = reachable.map((p) => windowOf(p.roomId)).filter((w) => w?.online).map((w) => w.id)
      editDevices(ids, ACTIONS[action].patch)
      addLog({ roomId: null, device: '창문', action: `${targetLabel} 창문 ${ids.length}개 모두 닫기` })
      return
    }
    editPurifiers(reachable.map((p) => p.id), ACTIONS[action].patch)
    addLog({ roomId: null, device: '공기청정기', action: `${targetLabel} ${reachable.length}대 ${ACTIONS[action].label}` })
  }
  // 창문 열기·닫기 (추천이 있으면 추천 실행으로 기록)
  const toggleWindow = (w) => {
    const next = !w.open
    editDevices([w.id], { open: next })
    const followed = w.rec && (w.rec.action === 'open') === next
    addLog({ roomId: w.roomId, device: '창문', action: `창문 ${next ? '열기' : '닫기'}${followed ? ' (추천 실행)' : ''}` })
  }
  const resetAll = () => {
    editPurifiers(purifiers.map((p) => p.id), { mode: 'auto' })
    addLog({ roomId: null, device: '공기청정기', action: '모든 장치를 자동 모드로 되돌림' })
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">장치 제어</h1>
          <p className="page-sub">공기청정기 {purifiers.length}대, 창문 {windows.length}개, 공기질 센서 {rooms.length}대</p>
        </div>
        <button type="button" className="btn" onClick={resetAll}><RotateCcw size={16} aria-hidden />모든 장치를 자동 모드로 되돌리기</button>
      </div>

      <div className="stats-row">
        <Stat label="가동 중" value={purifiers.filter((p) => p.online && p.power).length} unit="대" tone="primary" />
        <Stat label="대기" value={purifiers.filter((p) => p.online && !p.power).length} unit="대" />
        <Stat label="수동 모드" value={purifiers.filter((p) => p.mode === 'manual').length} unit="대" tone="warn" />
        <Stat label="창문 열림" value={windows.filter((w) => w.online && w.open).length} unit="개" tone="ok"
          sub={openRecs || closeRecs ? [openRecs && `열기 추천 ${openRecs}곳`, closeRecs && `닫기 추천 ${closeRecs}곳`].filter(Boolean).join(' · ') : '추천 없음'} />
        <Stat label="연결 끊김" value={offline.length} unit="대" tone={offline.length ? 'bad' : undefined}
          sub={offline.map((p) => `${roomOf(p.roomId).name} 제어 노드, ${p.lastAction}`).join(' · ')} />
      </div>

      <div className="dash-grid">
        <div className="col">
          <Card title="일괄 제어">
            <div className="bulk">
              <div>
                <h3 className="step">1. 대상 고르기</h3>
                <Segmented label="일괄 제어 대상" dark value={target} onChange={setTarget}
                  options={[{ value: 'all', label: '전체' }, ...FLOORS.map((f) => ({ value: f.id, label: f.label }))]} />
              </div>
              <div>
                <h3 className="step">2. 동작 고르기</h3>
                <div className="btn-group" role="group" aria-label="일괄 제어 동작">
                  {Object.entries(ACTIONS).map(([k, a]) => (
                    <button key={k} type="button" className="btn" aria-pressed={action === k} onClick={() => setAction(k)}>{a.label}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="confirm">
              <p><strong>3. 확인</strong> {targetLabel} {isWindowAction ? `창문 ${reachable.length}개를` : `공기청정기 ${reachable.length}대를`} {ACTIONS[action].verb}.
                {list.length > reachable.length && ` 연결이 끊긴 ${list.length - reachable.length}대는 빠져요.`}</p>
              <button type="button" className="btn btn-primary" disabled={!reachable.length} onClick={apply}>적용하기</button>
            </div>
          </Card>

          <Card title="교실 장치 목록" extra={<span className="muted">{targetLabel} {list.length}개 교실, 일괄 제어 대상과 같아요</span>}>
            <div className="table-wrap">
              <table className="table table-devices">
                <thead>
                  <tr><th>장치</th><th>연결</th><th>모드</th><th>풍량</th><th>전원</th><th>창문</th><th>필터 수명</th><th>마지막 동작</th></tr>
                </thead>
                <tbody>
                  {list.map((p) => {
                    const name = roomOf(p.roomId).name
                    const w = windowOf(p.roomId)
                    return (
                      <tr key={p.id}>
                        <td><strong>{name}</strong><small className="muted block">{p.id}</small></td>
                        <td><span className={`dot-text ${p.online ? 'ok' : 'bad'}`}>{p.online ? '온라인' : '끊김'}</span></td>
                        <td>
                          <button type="button" className={`mode-pill ${p.mode}`} disabled={!p.online}
                            aria-label={`${name} 모드: ${p.mode === 'auto' ? '자동' : '수동'}, 눌러서 바꾸기`}
                            onClick={() => edit(p, { mode: p.mode === 'auto' ? 'manual' : 'auto' }, p.mode === 'auto' ? '수동 모드로 전환' : '자동 모드로 전환')}>
                            {p.mode === 'auto' ? '자동' : '수동'}
                          </button>
                        </td>
                        <td>
                          <Segmented label={`${name} 풍량`} value={p.power ? p.speed : -1}
                            onChange={(v) => edit(p, { speed: v, power: true, mode: 'manual' }, `풍량을 ${SPEEDS[v]}으로 변경`)}
                            options={SPEEDS.map((s, i) => ({ value: i, label: s }))} />
                        </td>
                        <td><Switch label={`${name} 공기청정기 전원`} checked={p.online && p.power} disabled={!p.online}
                          onChange={(v) => edit(p, { power: v, mode: 'manual' }, v ? '전원 켜기' : '전원 끄기')} /></td>
                        <td>
                          <div className="win-cell">
                            <div className="win-row">
                              <span className={`win-pill ${!w.online ? 'na' : w.open ? 'open' : 'closed'}`}>
                                {!w.online ? '알 수 없음' : w.open ? '열림' : '닫힘'}
                              </span>
                              <button type="button" className={`btn btn-sm ${w.rec ? 'rec' : ''}`} disabled={!w.online}
                                aria-label={`${name} 창문 ${w.open ? '닫기' : '열기'}`} onClick={() => toggleWindow(w)}>
                                {w.open ? '닫기' : '열기'}
                              </button>
                            </div>
                            {w.rec && <span className={`win-rec ${w.rec.action}`}>{w.rec.title}</span>}
                          </div>
                        </td>
                        <td><span className="num-meter">{p.filterLife}%<Meter value={p.filterLife} max={100} level={p.filterLife < 40 ? 'warn' : 'info'} /></span></td>
                        <td className="muted nowrap">{p.lastAction}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="col">
          <Card title="자동 제어 규칙">
            <p className="muted">자동 모드인 장치에 적용돼요. 1분마다 수치를 확인해요.</p>
            <ul className="rule-list">
              {RULES.map((r) => (
                <li key={r.id} className={r.future ? 'future' : ''}>
                  <span className="rule-no">{r.id}</span>
                  <div>
                    <strong>{r.title}</strong>
                    <span className="muted block">{r.desc}</span>
                    {r.future && <span className="tag-future">향후 확장</span>}
                  </div>
                  <Switch label={`규칙 ${r.id} ${r.title}`} checked={!r.future && rulesOn[r.id]} disabled={r.future}
                    onChange={(v) => setRulesOn((s) => ({ ...s, [r.id]: v }))} />
                </li>
              ))}
            </ul>
          </Card>
          <Card title="최근 제어 기록">
            <ul className="log-list">
              {log.slice(0, 6).map((l) => (
                <li key={l.id}>
                  <time>{l.time}</time>
                  <p>{l.rule ? `규칙 ${l.rule}` : l.who}: {l.roomId ? `${roomOf(l.roomId).name} ` : ''}{l.action}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  )
}
