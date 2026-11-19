// AirChat 응답 엔진 (모의 버전)
// - 지금은 앱 안에서 간단한 문장 규칙으로 LLM 응답을 흉내 낸다.
// - 나중에 라즈베리파이 서버의 /api/chat (Claude Haiku + 도구 호출)로 바꿀 때 reply()만 교체하면 된다.
//   (입력: 사용자 문장 + ctx / 출력: { text, card?, note?, chips })
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

function explain(ctx) {
  const ev = ctx.lastEvent; // 이 교실 공기청정기의 가장 최근 예약 실행
  if (ev) {
    return {
      text: `**선생님이 ${hhmm(ev.createdAt)}에 예약한 동작**이에요. 자동 규칙 때문에 ${ADJ[ev.action]} 건 아니에요.`,
      card: {
        type: 'evidence',
        items: [
          { time: hhmm(ev.createdAt), tone: 'primary', text: `${ctx.teacher} 선생님이 AirChat으로 “${ev.quote}” 예약` },
          { time: hhmm(ev.ranAt), tone: 'ok', text: `실행 전 확인: 연결 정상, PM2.5 ${ev.pmAtRun} → ${ACTION_NAME[ev.action]} 실행` },
          { time: hhmm(ev.ranAt), tone: 'ok', text: `장치 응답: ${RESULT_NAME[ev.action]} ✅` },
        ],
      },
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
