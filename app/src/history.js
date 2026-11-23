// 추세·알림 탭 데이터
// - 지금은 시연용 하루치 기록(09:00~14:30)을 만들어 쓴다. 나중에 서버(InfluxDB 등) 조회 API로 바꿀 때
//   getTrend()가 같은 모양({ start, end, co2, pmIn, pm, events })만 돌려주면 화면은 그대로 쓸 수 있다.
// - 기간(창문 열림·청정기 가동)과 사건 묶기는 이벤트 목록에서 코드로 계산한다.
import { THRESHOLDS } from '../../shared/rules';

// 'HH:MM' ↔ 분
export const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
export const hm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

// 몇 개의 기준점 사이를 직선으로 이어 10분 간격 값을 만든다
function series(points, start, end, step = 10) {
  const at = (m) => {
    for (let i = 0; i < points.length - 1; i++) {
      const [a, va] = points[i];
      const [b, vb] = points[i + 1];
      if (m >= a && m <= b) return Math.round(va + ((vb - va) * (m - a)) / (b - a));
    }
    return points[points.length - 1][1];
  };
  const out = [];
  for (let m = start; m <= end; m += step) out.push({ m, v: at(m) });
  return { list: out, at };
}

// 시연용 하루
// - 09:50 CO₂ 높음 → 환기로 해결
// - 10:40 체육 수업 뒤 실내 미세먼지 높음 → 공기청정기로 해결
// - 11:40 CO₂ 높음 + 실외 나쁨 → 청정기로 버티다 실외 회복 후 환기
const DEMO = (() => {
  const start = toMin('09:00');
  const end = toMin('14:30');
  const co2 = series([[540, 560], [590, 1060], [600, 980], [620, 640], [660, 1020], [700, 1130], [710, 1150],
    [730, 1210], [760, 1240], [780, 900], [800, 700], [840, 980], [870, 1050]], start, end);
  // 실내 PM2.5: 체육 뒤 상승 → 청정기로 하강, 창문 열 때 살짝 오름
  const pmIn = series([[540, 12], [620, 16], [640, 38], [650, 42], [660, 30], [680, 18], [700, 22], [720, 17],
    [760, 15], [780, 22], [800, 20], [840, 14], [870, 13]], start, end);
  const pm = series([[540, 18], [600, 22], [660, 30], [700, 41], [730, 50], [745, 52], [765, 35], [780, 33],
    [800, 31], [840, 26], [870, 24]], start, end);
  // kind: alert(환기 알림) | dust(실내 미세먼지 높음) | open(창문 열림) | close(창문 닫힘)
  //       purOn(공기청정기 켬) | purOff(공기청정기 끔)
  const events = [
    { id: 'e1', m: toMin('09:50'), kind: 'alert', title: '환기 알림', desc: 'CO₂ 1,060 ppm 기준 초과' },
    { id: 'e2', m: toMin('09:52'), kind: 'open', title: '창문 열림', desc: '실외 PM2.5 22 보통' },
    { id: 'e3', m: toMin('10:20'), kind: 'close', title: '창문 닫힘', desc: 'CO₂ 640 ppm 정상' },
    { id: 'd1', m: toMin('10:40'), kind: 'dust', title: '실내 미세먼지 높음', desc: '실내 PM2.5 38 기준 초과 (체육 수업 뒤)' },
    { id: 'd2', m: toMin('10:42'), kind: 'purOn', title: '공기청정기 켬', desc: '규칙 R1 · 풍량 강' },
    { id: 'd3', m: toMin('11:20'), kind: 'purOff', title: '공기청정기 끔', desc: '실내 PM2.5 18 정상' },
    { id: 'e4', m: toMin('11:40'), kind: 'alert', title: '환기 알림', desc: 'CO₂ 1,130 ppm 기준 초과' },
    { id: 'e5', m: toMin('11:42'), kind: 'purOn', title: '공기청정기 켬', desc: '실외 PM2.5 41 나쁨 → 창문 대신' },
    { id: 'e6', m: toMin('12:45'), kind: 'open', title: '창문 열림', desc: '실외 PM2.5 35로 회복' },
    { id: 'e7', m: toMin('13:20'), kind: 'close', title: '창문 닫힘', desc: 'CO₂ 700 ppm 정상' },
  ];
  return { start, end, co2: co2.list, pmIn: pmIn.list, pm: pm.list, co2At: co2.at, pmInAt: pmIn.at, events, demo: true };
})();

// 교실별 하루 기록 (지금은 모든 교실이 같은 시연 데이터)
export function getTrend(_roomId) {
  return DEMO;
}

// 이벤트 → 기간 목록. 창문은 열림~닫힘, 청정기는 켬~(끔 또는 창문 열림 또는 하루 끝)
export function buildPeriods(events, end) {
  const out = [];
  let openAt = null;
  let purAt = null;
  for (const e of events) {
    if (e.kind === 'purOn' && purAt == null) purAt = e.m;
    if (e.kind === 'purOff' && purAt != null) { out.push({ kind: 'purifier', a: purAt, b: e.m }); purAt = null; }
    if (e.kind === 'open') {
      if (purAt != null) { out.push({ kind: 'purifier', a: purAt, b: e.m }); purAt = null; }
      if (openAt == null) openAt = e.m;
    }
    if (e.kind === 'close' && openAt != null) { out.push({ kind: 'window', a: openAt, b: e.m }); openAt = null; }
  }
  if (purAt != null) out.push({ kind: 'purifier', a: purAt, b: end, ongoing: true });
  if (openAt != null) out.push({ kind: 'window', a: openAt, b: end, ongoing: true });
  return out.sort((x, y) => x.a - y.a);
}

// 이벤트 → 사건.
// - 환기 알림(alert)에서 시작 → 창문 닫힘(close)에서 끝: 결과는 CO₂
// - 실내 미세먼지(dust)에서 시작 → 공기청정기 끔(purOff)에서 끝: 결과는 실내 PM2.5
// at: { co2At, pmInAt } 시각별 값을 구하는 함수
export function buildEpisodes(events, at) {
  const END = { alert: 'close', dust: 'purOff' };
  const out = [];
  let cur = null;
  for (const e of events) {
    if (!cur && END[e.kind]) cur = { id: e.id, type: e.kind, start: e.m, steps: [] };
    if (!cur) continue; // 알림 없이 일어난 동작은 사건에 넣지 않음
    cur.steps.push(e);
    if (e.kind === END[cur.type]) { cur.end = e.m; out.push(cur); cur = null; }
  }
  if (cur) out.push(cur); // 아직 진행 중
  return out.map((ep) => {
    const dust = ep.type === 'dust';
    const valueAt = dust ? at.pmInAt : at.co2At;
    const done = ep.end != null;
    let peak = valueAt(ep.start);
    for (let m = ep.start; m <= (ep.end ?? ep.start); m += 5) peak = Math.max(peak, valueAt(m));
    const usedPurifier = ep.steps.some((s) => s.kind === 'purOn');
    let title = '대응 중';
    if (done) title = dust ? '실내 미세먼지를 공기청정기로 해결' : usedPurifier ? '실외가 나빠 공기청정기로 대응' : '환기로 해결';
    return {
      ...ep,
      done,
      title,
      metric: dust ? '실내 PM2.5' : 'CO₂',
      unit: dust ? '㎍/㎥' : 'ppm',
      from: peak,
      to: done ? valueAt(ep.end) : null,
      minutes: done ? ep.end - ep.start : null,
    };
  });
}

// 기준 초과 시간(분): 10분 간격 값 중 기준 이상인 칸 수 × 10
export function minutesOver(list, threshold, step = 10) {
  return list.filter((p) => p.v >= threshold).length * step;
}

// 90 → '1시간 30분', 30 → '30분'
export const duration = (min) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}시간${m ? ` ${m}분` : ''}` : `${m}분`;
};

export const CO2_LIMIT = THRESHOLDS.co2High;
export const PM_LIMIT = THRESHOLDS.outdoorPm25Bad;
export const PM_IN_LIMIT = THRESHOLDS.indoorPm25Bad;
