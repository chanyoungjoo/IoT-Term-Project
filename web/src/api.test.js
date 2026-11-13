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

// 창문 추천 (반자동): 추천만 하고 상태는 바꾸지 않는다
const recs = (snap, action) => snap.windows.filter((w) => w.rec?.action === action).map((w) => w.roomId).sort()
assert.deepEqual(recs(getSnapshot('base'), 'open'), ['1-3', '2-2', 's-3']) // CO₂ 높음 + 실외 양호 + 창문 닫힘
assert.deepEqual(recs(getSnapshot('base'), 'close'), [])
assert.deepEqual(recs(bad, 'close'), ['1-1', '2-5', '3-2']) // 실외 나쁨 + 창문 열림 → 닫기 추천
assert.deepEqual(recs(bad, 'open'), []) // 실외 나쁨이면 열기 추천 없음
assert.deepEqual(recs(getSnapshot('base', { 'WD-2-2': { open: true } }), 'open'), ['1-3', 's-3']) // 열면 추천 사라짐
assert.equal(getSnapshot('base').windows.find((w) => w.roomId === '3-5').rec, null) // 연결 끊긴 창문은 추천 없음
assert.equal(bad.windows.filter((w) => w.open).length, 3) // 추천만, 자동으로 닫지 않음
console.log('api ok')
