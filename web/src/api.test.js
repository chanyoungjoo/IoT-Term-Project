// 실행: node src/api.test.js — 시나리오별 자동 제어 결과 확인
import assert from 'node:assert/strict'
import { getSnapshot } from './api.js'

const on = (snap) => snap.purifiers.filter((p) => p.online && p.power).map((p) => p.roomId).sort()

assert.deepEqual(on(getSnapshot('base')), ['1-3', '2-4']) // 규칙 1(2-4) + 수동(1-3)
assert.deepEqual(on(getSnapshot('pm')), ['1-3', '2-4', '2-5']) // 2-5 PM2.5 47 → 규칙 1
const bad = getSnapshot('outdoorBad')
assert.equal(bad.outState, 'bad')
assert.deepEqual(on(bad), ['1-3', '2-2', '2-4', 's-3']) // CO₂ 높음 + 실외 나쁨 → 규칙 3
assert.deepEqual(on(getSnapshot('base', { 'AP-2-4': { mode: 'manual', power: false } })), ['1-3']) // 수동은 규칙 건너뜀
assert.equal(getSnapshot('co2').alerts.length, 5)
console.log('api ok')
