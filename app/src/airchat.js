// AirChat 응답 엔진
// - remoteReply(): 라즈베리파이 서버의 /api/chat (Claude Haiku + 도구 호출)에 묻는다. (기본)
// - reply(): 서버에 닿지 않을 때 쓰는 모의 엔진. 간단한 문장 규칙으로 LLM 응답을 흉내 낸다.
//   둘 다 출력 모양이 같다: { text, card?, note?, chips }
// - 원칙: AirChat은 장치를 직접 켜고 끄지 않는다. "예약·규칙 제안 카드"만 만들고,
//   사람이 카드의 버튼을 눌러야 등록된다. 지금 바로 켜고 끄는 건 제어 탭의 일이다.

const pad = (n) => String(n).padStart(2, '0');
export const hhmm = (ms) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const DEVICE_NAME = { purifier: '공기청정기', window: '창문' };
export const DEVICE_OBJ = { purifier: '공기청정기를', window: '창문을' }; // 목적격 조사
export const ACTION_NAME = { on: '켜기', off: '끄기', open: '열기', close: '닫기' };
export const RESULT_NAME = { on: '켜짐', off: '꺼짐', open: '열림', close: '닫힘' };
export const PAST = { on: '켰어요', off: '껐어요', open: '열었어요', close: '닫았어요' };
const ADJ = { on: '켜진', off: '꺼진', open: '열린', close: '닫힌' }; // "~ 건 아니에요"
const OPPOSITE = { on: 'off', off: 'on', open: 'close', close: 'open' };
const PM_BAD = 35; // 실내 PM2.5 기준 (shared/rules.js와 같은 값)

// 숫자 뒤 조사: 끝자리 발음에 받침이 있으면 '으로/이라/이에요' (단, ㄹ받침 1·7·8은 '로')
const LAST = (n) => String(n).slice(-1);
const ro = (n) => `${n}${'036'.includes(LAST(n)) ? '으로' : '로'}`;
const ira = (n) => `${n}${'013678'.includes(LAST(n)) ? '이라' : '라'}`;
const ieyo = (n) => `${n}${'013678'.includes(LAST(n)) ? '이에요' : '예요'}`;

export const DEFAULT_CHIPS = ['1분 뒤에 청정기 켜줘', '시험 시간엔 청정기 꺼줘', '청정기 왜 켜졌어?'];

// 첫 인사 (스트리밍 없이 바로 보임)
export const GREETING = {
  id: 'greeting',
  role: 'ai',
  text: '안녕하세요, 선생님. **언제·어떤 조건에서** 장치를 켜고 끌지 말씀해 주세요. 지금 바로 켜고 끄는 건 제어 탭이 더 빨라요.',
  chips: DEFAULT_CHIPS,
};

// ── 문장 해석 도우미 ─────────────────────────────

const parseDevice = (t) => (/창문/.test(t) ? 'window' : 'purifier');

function parseAction(t, device) {
  if (device === 'window') {
    if (/닫/.test(t)) return 'close';
    if (/열/.test(t)) return 'open';
    return null;
  }
  if (/꺼|끄|끈|끔|off/i.test(t)) return 'off';
  if (/켜|켠|킴|틀어|가동|\bon\b/i.test(t)) return 'on';
  return null;
}

// "1분 뒤", "30초 후", "2시간 뒤" → 밀리초
function parseDelay(t) {
  const m = t.match(/(\d+)\s*(초|분|시간)\s*(?:뒤|후|있다가|이따)/);
  if (!m) return null;
  return Number(m[1]) * { 초: 1000, 분: 60000, 시간: 3600000 }[m[2]];
}

// "3시에", "3시 30분에", "3시 반", "3시까지" → 오늘(지났으면 내일) 그 시각
// 학교 시간 기준이라 1~7시는 오후로 본다.
function parseClock(t, now) {
  const m = t.match(/(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분|\s*(반))?/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[3] ? 30 : Number(m[2] || 0);
  if (h >= 1 && h <= 7) h += 12;
  const d = new Date(now);
  d.setHours(h, min, 0, 0);
  if (d.getTime() <= now) d.setDate(d.getDate() + 1);
  return { at: d.getTime(), until: /까지/.test(t) };
}

const lastNumber = (t) => {
  const nums = [...t.matchAll(/(\d+)/g)].map((x) => Number(x[1]));
  return nums.length ? nums[nums.length - 1] : null;
};

// ── 규칙 카드 ───────────────────────────────────

function examRule(threshold, ctx, quote) {
  const pm = ctx.sensor.pm25;
  return {
    type: 'rule',
    id: 'exam-quiet',
    name: '시험 시간 저소음',
    quote,
    when: '시간표가 ‘시험’인 교시',
    action: `${ctx.roomName} 공기청정기 끄기`,
    except: `PM2.5가 ${threshold} 이상이면 다시 켜기`,
    summary: `시험 교시 → 청정기 끄기 · PM2.5 ${threshold}↑이면 켜기`,
    threshold,
    preview: pm < threshold
      ? `지금 상태라면 PM2.5가 ${ira(pm)} 시험 시간에 꺼져요.`
      : `지금은 PM2.5가 ${ira(pm)} 시험 시간이어도 켜 둬요.`,
  };
}

function afterSchoolRule(ctx, quote) {
  return {
    type: 'rule',
    id: 'after-school',
    name: '하교 후 절전',
    quote,
    when: '평일 16:30 (하교 시간)',
    action: `${ctx.roomName} 공기청정기 끄기`,
    except: `PM2.5가 ${PM_BAD} 이상이면 켜 두기`,
    summary: '평일 16:30 → 청정기 끄기',
    preview: '오늘 16:30부터 적용돼요.',
  };
}

// ── "왜?" 설명 ──────────────────────────────────

// 예약 실행 근거 기록 카드 (모의 엔진·서버 응답 공통)
export function evidenceCard(ev, ctx) {
  return {
    type: 'evidence',
    items: [
      { time: hhmm(ev.createdAt), tone: 'primary', text: `${ctx.teacher} 선생님이 AirChat으로 “${ev.quote}” 예약` },
      { time: hhmm(ev.ranAt), tone: 'ok', text: `실행 전 확인: 연결 정상, PM2.5 ${ev.pmAtRun} → ${ACTION_NAME[ev.action]} 실행` },
      { time: hhmm(ev.ranAt), tone: 'ok', text: `장치 응답: ${RESULT_NAME[ev.action]} ✅` },
    ],
  };
}

function explain(ctx) {
  const ev = ctx.lastEvent; // 이 교실 공기청정기의 가장 최근 예약 실행
  if (ev) {
    return {
      text: `**선생님이 ${hhmm(ev.createdAt)}에 예약한 동작**이에요. 자동 규칙 때문에 ${ADJ[ev.action]} 건 아니에요.`,
      card: evidenceCard(ev, ctx),
      note: ctx.purifierOn && ctx.sensor.pm25 < PM_BAD
        ? `지금 교실 PM2.5는 ${ro(ctx.sensor.pm25)} 깨끗해서, 오래 켜 둘 필요는 없어요.`
        : null,
      chips: ['30분 뒤에 꺼줘', '예약 뭐 있어?', '시험 시간엔 청정기 꺼줘'],
    };
  }
  const pm = ctx.sensor.pm25;
  const chips = ['1분 뒤에 청정기 켜줘', '시험 시간엔 청정기 꺼줘'];
  if (ctx.purifierOn && ctx.purifierMode === 'manual') {
    return { text: '지금 공기청정기는 **수동으로 켜 둔 상태**예요. 자동 규칙은 수동 모드인 장치를 건드리지 않아요.', chips };
  }
  if (ctx.purifierOn && ctx.decision.rule === 1) {
    return { text: `실내 PM2.5가 **${ro(pm)}** 기준(${PM_BAD})을 넘어서 **규칙 1**이 자동으로 켰어요. ${PM_BAD} 아래로 내려가면 자동으로 꺼져요.`, chips };
  }
  if (ctx.purifierOn && ctx.decision.rule === 3) {
    return { text: '교실 CO₂가 높은데 바깥 공기가 나빠서, **규칙 3**이 환기 대신 공기청정기를 켰어요.', chips };
  }
  if (!ctx.purifierOn) {
    return { text: `지금 공기청정기는 꺼져 있어요. 실내 PM2.5가 ${ro(pm)} 기준 안이라 **절전 대기(규칙 5)** 중이에요.`, chips };
  }
  return { text: '지금 공기청정기는 켜져 있어요. 최근 예약이나 자동 규칙 기록은 없어요.', chips };
}

function listReply(ctx) {
  const pending = ctx.schedules.filter((s) => s.status === 'pending');
  const on = ctx.rules.filter((r) => r.on);
  if (!pending.length && !on.length) {
    return { text: '아직 만든 예약이나 규칙이 없어요. 시간이나 조건을 말씀해 주시면 만들어 드릴게요.', chips: DEFAULT_CHIPS };
  }
  return {
    text: `대기 중인 예약 **${pending.length}개**, 켜져 있는 규칙 **${on.length}개**가 있어요.`,
    card: {
      type: 'list',
      items: [
        ...pending.map((s) => ({ icon: 'clock', text: `${hhmm(s.at)} ${DEVICE_NAME[s.device]} ${ACTION_NAME[s.action]}` })),
        ...on.map((r) => ({ icon: 'rule', text: r.name })),
      ],
    },
    chips: ['청정기 왜 켜졌어?', '1분 뒤에 청정기 켜줘'],
  };
}

// ── 메인: 문장 → 응답 ────────────────────────────
// ctx: { now, roomId, roomName, teacher, sensor, purifierOn, purifierMode, decision,
//        lastEvent, schedules, rules, draftRule }
export function reply(raw, ctx) {
  const t = raw.replace(/\s+/g, ' ').trim();
  const now = ctx.now;

  // 1) 방금 만든 규칙 고치기: "50 말고 40으로 해줘", "기준을 40으로 바꿔줘"
  if (ctx.draftRule?.id === 'exam-quiet' && /\d/.test(t) && /말고|(으로|로).*(해|바꿔|변경|수정)/.test(t)) {
    const th = lastNumber(t);
    return {
      text: `기준을 **PM2.5 ${ro(th)}** 바꿨어요. 이렇게 할까요?`,
      card: examRule(th, ctx, ctx.draftRule.quote),
      chips: ['규칙 뭐 있어?', '1분 뒤에 청정기 켜줘'],
    };
  }

  // 2) 이유 묻기
  if (/왜|이유/.test(t)) return explain(ctx);

  // 3) 예약·규칙 목록
  if (/예약|규칙|자동화/.test(t) && /뭐|무슨|목록|보여|있어|확인|알려/.test(t)) return listReply(ctx);

  // 4) 반복 규칙 만들기
  if (/시험/.test(t)) {
    const given = /\d+\s*(?:넘|이상|초과)/.test(t);
    return {
      text: given ? '이렇게 규칙을 만들었어요.' : '이렇게 규칙을 만들었어요. ‘먼지 심하면’은 **PM2.5 50 이상**으로 정했어요.',
      card: examRule(given ? lastNumber(t) : 50, ctx, raw),
      chips: ['50 말고 40으로 해줘', '규칙 뭐 있어?', '1분 뒤에 청정기 켜줘'],
    };
  }
  if (/하교|집에 가|방과\s*후/.test(t)) {
    return {
      text: '하교 후에는 교실이 비니까, 이렇게 절전 규칙을 만들었어요.',
      card: afterSchoolRule(ctx, raw),
      chips: ['규칙 뭐 있어?', '시험 시간엔 청정기 꺼줘'],
    };
  }

  // 5) 시간 예약
  const device = parseDevice(t);
  const action = parseAction(t, device);
  const delay = parseDelay(t);
  const clock = delay == null ? parseClock(t, now) : null;
  if (action && (delay != null || clock)) {
    const at = delay != null ? now + delay : clock.at;
    let act = action;
    let text = '이렇게 예약할까요?';
    if (clock?.until) {
      // "3시까지만 꺼둬" → 3시에 반대 동작(켜기)을 예약
      act = OPPOSITE[action];
      text = `**${hhmm(at)}에 다시 ${ACTION_NAME[act]}**를 예약할게요. 지금 ${ACTION_NAME[action]}는 제어 탭에서 바로 할 수 있어요.`;
    }
    const warn = device === 'purifier' && act === 'off' && ctx.sensor.pm25 >= PM_BAD
      ? `지금 PM2.5가 ${ieyo(ctx.sensor.pm25)}. 실행할 때도 ${PM_BAD} 이상이면 끄지 않고 알려 드려요.`
      : null;
    return {
      text,
      card: { type: 'schedule', roomId: ctx.roomId, roomName: ctx.roomName, device, action: act, at, quote: raw, warn },
      chips: ['예약 뭐 있어?', '청정기 왜 켜졌어?', '시험 시간엔 청정기 꺼줘'],
    };
  }

  // 6) 시간 없이 "켜줘/꺼줘" → 제어 탭 안내 (버튼이 더 빠른 일은 AirChat이 하지 않음)
  if (action) {
    const verb = device === 'window'
      ? (action === 'open' ? '창문 열어줘' : '창문 닫아줘')
      : (action === 'on' ? '청정기 켜줘' : '청정기 꺼줘');
    return {
      text: `지금 바로 ${DEVICE_NAME[device]} ${ACTION_NAME[action]}는 **제어 탭**에서 한 번에 할 수 있어요. “10분 뒤에”처럼 시간이나 조건을 붙여 주시면 예약·규칙으로 만들어 드릴게요.`,
      card: { type: 'control' },
      chips: [`10분 뒤에 ${verb}`, '시험 시간엔 청정기 꺼줘'],
    };
  }

  // 7) 아직 모르는 말
  return {
    text: '아직 그건 잘 모르겠어요. 이런 걸 할 수 있어요.\n· 시간 예약: “1분 뒤에 청정기 켜줘”\n· 자동 규칙: “시험 시간엔 청정기 꺼줘”\n· 이유 설명: “청정기 왜 켜졌어?”',
    chips: DEFAULT_CHIPS,
  };
}

// ── 서버(LLM) 연결 ───────────────────────────────
// 웹 빌드(라파 nginx)에서는 같은 주소의 /api/chat 을 쓴다.
// 맥에서 expo start로 개발할 때는 app/.env 에 EXPO_PUBLIC_API_URL=https://<라파 Funnel 주소> 를 넣으면
// 라파 서버에 바로 붙는다. 없거나 연결이 안 되면 호출한 쪽에서 모의 엔진 reply()로 대신한다.
const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');
const API_TIMEOUT = 30000; // 서버 쪽 제한(25초)보다 조금 길게

// 시연용 시간표 ("시험 시간" 규칙 해석용, 나중에 서버의 학교 시간표로 교체)
export const DEMO_TIMETABLE = '오늘 5교시(13:40~14:25) 수학 시험';

const CHIPS = {
  schedule: ['예약 뭐 있어?', '청정기 왜 켜졌어?', '시험 시간엔 청정기 꺼줘'],
  rule: ['기준을 40으로 바꿔줘', '규칙 뭐 있어?', '1분 뒤에 청정기 켜줘'],
  why: ['30분 뒤에 꺼줘', '예약 뭐 있어?', '시험 시간엔 청정기 꺼줘'],
};
const VALID_ACTIONS = { purifier: ['on', 'off'], window: ['open', 'close'] };

// 서버 상태 확인: API 키까지 설정돼 있으면 true
export async function checkServer() {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    if (!res.ok) return false;
    const data = await res.json();
    return data?.keySet === true;
  } catch {
    return false;
  }
}

// 앱이 아는 기록 → 서버(LLM)가 "왜?"에 답할 때 볼 기록
function eventsFor(ctx) {
  const rows = [];
  for (const s of ctx.schedules.filter((x) => x.roomId === ctx.roomId)) {
    rows.push({ time: hhmm(s.createdAt), device: s.device, text: `선생님이 AirChat으로 “${s.quote}” 예약 (실행 예정 ${hhmm(s.at)})` });
    if (s.status === 'done') {
      rows.push({ time: hhmm(s.ranAt), device: s.device, text: `예약 실행: 장치 연결 정상, PM2.5 ${s.pmAtRun} → ${ACTION_NAME[s.action]}, 장치 응답 ${RESULT_NAME[s.action]}` });
    } else if (s.status === 'skipped') {
      rows.push({ time: hhmm(s.ranAt), device: s.device, text: `예약을 실행하지 않음: ${s.reason}` });
    }
  }
  // 예약 말고 지금 상태를 만든 원인 (수동 조작 / 자동 규칙)
  if (ctx.purifierMode === 'manual') {
    rows.push({ time: hhmm(ctx.now), device: 'purifier', text: `공기청정기는 수동 모드 (${ctx.purifierOn ? '켜짐' : '꺼짐'}), 자동 규칙이 건드리지 않음` });
  } else if (ctx.decision?.title) {
    rows.push({ time: hhmm(ctx.now), device: 'purifier', text: `자동 규칙 ${ctx.decision.rule}번 적용 중: ${ctx.decision.title.replace('\n', ' ')}` });
  }
  return rows.slice(-12);
}

// 서버로 보낼 교실 상황 (숫자와 사실만, 판단은 서버 코드가 함)
function toContext(ctx) {
  return {
    roomName: ctx.roomName,
    pm25: ctx.sensor.pm25,
    co2: ctx.sensor.co2,
    purifierOn: Boolean(ctx.purifierOn),
    windowOpen: Boolean(ctx.windowOpen),
    timetable: ctx.timetable ?? DEMO_TIMETABLE,
    events: eventsFor(ctx),
    schedules: ctx.schedules
      .filter((s) => s.roomId === ctx.roomId && s.status === 'pending')
      .map((s) => `${hhmm(s.at)} ${DEVICE_NAME[s.device]} ${ACTION_NAME[s.action]} (대기 중)`),
    rules: ctx.rules.map((r) => `${r.name}: ${r.summary}${r.on ? '' : ' (꺼 둠)'}`),
  };
}

// 이전 카드 내용을 대화 기록에 같이 넣어서 "50 말고 40으로" 같은 이어지는 말을 알아듣게 함
function cardSummary(card) {
  if (card?.type === 'schedule') {
    return ` [제안한 예약: ${hhmm(card.at)} ${DEVICE_NAME[card.device]} ${ACTION_NAME[card.action]}${card.status === 'booked' ? ', 예약됨' : ''}]`;
  }
  if (card?.type === 'rule') {
    return ` [제안한 규칙: ${card.name} / 언제: ${card.when} / 예외: ${card.except}${card.status === 'added' ? ', 추가됨' : ''}]`;
  }
  return '';
}

function toHistory(messages) {
  return messages
    .filter((m) => (m.role === 'user' || m.role === 'ai') && m.id !== 'greeting' && m.text)
    .slice(-8)
    .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', text: m.text + cardSummary(m.card) }));
}

// 서버의 예약 제안 → 예약 카드 (시각 계산은 LLM이 아니라 여기서)
function scheduleFromProposal(input, raw, ctx) {
  const { device, action } = input ?? {};
  if (!VALID_ACTIONS[device]?.includes(action)) return null;
  let at = null;
  if (Number.isFinite(input.delay_seconds) && input.delay_seconds > 0) {
    at = ctx.now + input.delay_seconds * 1000;
  } else if (/^\d{1,2}:\d{2}$/.test(input.at ?? '')) {
    const [h, m] = input.at.split(':').map(Number);
    const d = new Date(ctx.now);
    d.setHours(h, m, 0, 0);
    at = d.getTime();
  }
  // 지난 시각이거나 24시간 넘게 남은 예약은 받지 않음
  if (!at || at <= ctx.now || at - ctx.now > 24 * 3600 * 1000) return null;
  const warn = device === 'purifier' && action === 'off' && ctx.sensor.pm25 >= PM_BAD
    ? `지금 PM2.5가 ${ieyo(ctx.sensor.pm25)}. 실행할 때도 ${PM_BAD} 이상이면 끄지 않고 알려 드려요.`
    : null;
  return { type: 'schedule', roomId: ctx.roomId, roomName: ctx.roomName, device, action, at, quote: raw, warn };
}

// 서버의 규칙 제안 → 규칙 카드
function ruleFromProposal(input, raw, ctx) {
  const { name, when, device, action, exception } = input ?? {};
  if (!name || !when || !VALID_ACTIONS[device]?.includes(action)) return null;
  const threshold = Number((String(exception ?? '').match(/\d+/) ?? [])[0]) || null;
  const pm = ctx.sensor.pm25;
  const preview = device === 'purifier' && action === 'off' && threshold
    ? (pm < threshold
      ? `지금 상태라면 PM2.5가 ${ira(pm)} 조건이 되면 꺼져요.`
      : `지금은 PM2.5가 ${ira(pm)} 조건이 돼도 켜 둬요.`)
    : '서버 규칙 엔진이 연결되면 적용돼요.';
  // 같은 규칙을 고치는 중이면 처음 했던 말을 유지
  const quote = ctx.draftRule?.name === name ? ctx.draftRule.quote : raw;
  return {
    type: 'rule',
    id: `llm-${name}`, // 같은 이름이면 내 자동화에서 덮어씀
    name,
    quote,
    when,
    action: `${ctx.roomName} ${DEVICE_NAME[device]} ${ACTION_NAME[action]}`,
    except: exception || '없음',
    summary: `${when} → ${DEVICE_NAME[device]} ${ACTION_NAME[action]}${threshold ? ` · PM2.5 ${threshold}↑이면 예외` : ''}`,
    threshold,
    preview,
  };
}

// 서버 응답 → 화면 메시지
function fromServer(data, raw, ctx) {
  const text = (data.text ?? '').trim();
  const p = data.proposal;
  if (p?.type === 'schedule') {
    const card = scheduleFromProposal(p.input, raw, ctx);
    if (card) return { text: text || '이렇게 예약할까요?', card, chips: CHIPS.schedule, source: 'llm' };
    return { text: text || '예약 시각을 확인하지 못했어요.', note: '오늘 안의 시각으로 다시 말씀해 주세요.', chips: DEFAULT_CHIPS, source: 'llm' };
  }
  if (p?.type === 'rule') {
    const card = ruleFromProposal(p.input, raw, ctx);
    if (card) return { text: text || '이렇게 규칙을 만들어 볼게요.', card, chips: CHIPS.rule, source: 'llm' };
  }
  if (data.lookedUpLog && ctx.lastEvent) {
    return { text, card: evidenceCard(ctx.lastEvent, ctx), chips: CHIPS.why, source: 'llm' };
  }
  return { text: text || '잘 이해하지 못했어요. 다시 말씀해 주세요.', chips: data.lookedUpLog ? CHIPS.why : DEFAULT_CHIPS, source: 'llm' };
}

// 서버(LLM)에 묻기. 실패하면 예외를 던지고, 호출한 쪽이 모의 엔진으로 대신한다.
export async function remoteReply(raw, ctx, messages) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT);
  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: raw, history: toHistory(messages), context: toContext(ctx) }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`서버 응답 ${res.status}`);
    const data = await res.json(); // 개발 서버가 HTML을 주면 여기서 실패 → 모의 엔진
    if (typeof data?.text !== 'string') throw new Error('응답 형식이 달라요');
    return fromServer(data, raw, ctx);
  } finally {
    clearTimeout(timer);
  }
}
