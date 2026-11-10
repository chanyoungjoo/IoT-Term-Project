// 데이터 접근은 이 파일만 거친다. 지금은 더미 데이터, 나중에 FastAPI 호출로 교체.
import * as d from '../../shared/dummyData.js'
import { applyScenario, pickOutdoorPm, outdoorStatus, decide } from '../../shared/rules.js'

export const { school, currentAdmin, FLOORS, SPEEDS, scenarios, controlLog, RULES, historyFor } = d

// 시나리오 + 화면에서 바꾼 장치 설정(edits)을 반영한 현재 상태.
// 자동 모드·온라인 장치는 규칙(decide)대로 전원을 다시 계산한다.
export function getSnapshot(scenarioKey = 'base', edits = {}) {
  const sc = d.scenarios[scenarioKey]
  const { rooms, outdoor } = applyScenario(d, sc)
  const outPm = pickOutdoorPm(outdoor)
  const outState = outdoorStatus(outPm.pm25)
  const purifiers = d.purifiers.map((base) => {
    const p = { ...base, ...edits[base.id] }
    if (!p.online || p.mode !== 'auto') return p
    const room = rooms.find((r) => r.id === p.roomId)
    return { ...p, power: decide({ sensor: room.sensor, outdoor: outState }).purifier === 'on' }
  })
  return {
    rooms,
    outdoor,
    outPm,
    outState,
    purifiers,
    alerts: [...sc.newAlerts, ...d.alerts],
  }
}
