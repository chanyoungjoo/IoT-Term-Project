// AirChat 대화 처리: 앱이 보낸 교실 상황 + 대화 기록으로 Claude에게 묻고,
// 답변 문장과 "제안"(예약·규칙)을 돌려준다.
// 원칙: LLM은 장치를 직접 켜고 끄지 않는다. 제안만 하고, 사람이 앱 카드에서 확인해야 등록된다.
import Anthropic from '@anthropic-ai/sdk';
import { THRESHOLDS } from '../../shared/rules.js';

export const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';
const MAX_TOKENS = 1024; // 생각(thinking) + 도구 호출이 잘리지 않을 여유
const MAX_ROUNDS = 3; // 도구 왕복 최대 횟수 (무한 루프·비용 폭주 방지)
const HISTORY_TURNS = 8; // 이어지는 말("50 말고 40으로")을 위해 보내는 최근 대화 수

// ANTHROPIC_API_KEY 환경변수를 읽음. 앱이 오래 기다리지 않게 시간 제한·재시도를 짧게.
const client = new Anthropic({ timeout: 25_000, maxRetries: 1 });

// ── 도구 정의 ───────────────────────────────────────────────
// propose_* : 제안만 (앱이 카드로 보여 주고 사람이 확인)
// get_event_log : 조회 (서버가 결과를 돌려주고 LLM이 다시 답함)
const TOOLS = [
  {
    name: 'propose_schedule',
    description: '한 번만 실행되는 예약을 제안한다. 실제 실행은 선생님이 카드에서 확인한 뒤에만 한다.',
    input_schema: {
      type: 'object',
      properties: {
        device: { type: 'string', enum: ['purifier', 'window'], description: 'purifier=공기청정기, window=창문' },
        action: { type: 'string', enum: ['on', 'off', 'open', 'close'] },
        delay_seconds: { type: 'integer', description: '"1분 뒤"처럼 상대 시간일 때만 사용' },
        at: { type: 'string', description: '"3시 반"처럼 시각일 때만 사용. 24시간제 HH:MM (예: 15:30)' },
      },
      required: ['device', 'action'],
    },
  },
  {
    name: 'propose_rule',
    description: '조건이 될 때마다 반복 실행되는 자동화 규칙을 제안한다. 실제 등록은 선생님이 카드에서 확인한 뒤에만 한다.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '짧은 규칙 이름 (예: 시험 시간 저소음)' },
        when: { type: 'string', description: '언제·어떤 조건에서 동작하는지 한 줄 요약 (예: 시간표에 시험이 있는 교시)' },
        device: { type: 'string', enum: ['purifier', 'window'] },
        action: { type: 'string', enum: ['on', 'off', 'open', 'close'] },
        exception: {
          type: 'string',
          description: `안전 예외 조건. 청정기를 끄는 규칙이면 반드시 "PM2.5 ${THRESHOLDS.indoorPm25Bad} 이상이면 다시 켜기"처럼 숫자 기준을 포함`,
        },
      },
      required: ['name', 'when', 'device', 'action', 'exception'],
    },
  },
  {
    name: 'get_event_log',
    description: '이 교실의 최근 장치 동작 기록을 조회한다. "왜 켜졌어/꺼졌어?" 같은 질문에는 답하기 전에 반드시 먼저 호출한다.',
    input_schema: {
      type: 'object',
      properties: { device: { type: 'string', enum: ['purifier', 'window'] } },
      required: ['device'],
    },
  },
];

// ── 앱이 보낸 값 정리 (모양이 이상해도 서버가 죽지 않게, 길이도 제한) ──
const str = (v, max = 200) => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v) => (Number.isFinite(v) ? v : null);
const list = (v, max) => (Array.isArray(v) ? v.slice(-max) : []);
const DEVICES = ['purifier', 'window'];

function cleanContext(c = {}) {
  return {
    roomName: str(c.roomName, 40) || '우리 교실',
    pm25: num(c.pm25),
    co2: num(c.co2),
    purifierOn: c.purifierOn === true,
    windowOpen: c.windowOpen === true,
    timetable: str(c.timetable, 200) || '정보 없음',
    events: list(c.events, 12).map((e) => ({
      time: str(e?.time, 5), device: DEVICES.includes(e?.device) ? e.device : 'purifier', text: str(e?.text, 200),
    })),
    schedules: list(c.schedules, 10).map((s) => str(s, 120)).filter(Boolean),
    rules: list(c.rules, 10).map((r) => str(r, 120)).filter(Boolean),
  };
}

// 등급 판단은 LLM이 아니라 코드가 한다 (PM2.5는 환경부 기준, CO2는 shared/rules.js 기준)
function pmLevel(v) {
  if (v == null) return '알 수 없음';
  if (v <= 15) return '좋음';
  if (v <= THRESHOLDS.indoorPm25Bad) return '보통';
  if (v <= 75) return '나쁨';
  return '매우 나쁨';
}
const co2Level = (v) => (v == null ? '알 수 없음' : v >= THRESHOLDS.co2High ? '환기 필요' : '정상');

// ── 시스템 프롬프트: 매 요청마다 현재 시각·교실 상태를 새로 넣음 ─────
function systemPrompt(ctx) {
  const now = new Date().toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short',
  });
  const show = (v, unit) => (v == null ? '알 수 없음' : `${v} ${unit}`);
  return `너는 교실 공기질 앱의 채팅 도우미 "AirChat"이야. 선생님과 대화해.

[지금 상황]
- 현재 시각: ${now} (한국 시간)
- 교실: ${ctx.roomName}
- 실내 PM2.5: ${show(ctx.pm25, '㎍/㎥')} (${pmLevel(ctx.pm25)}), CO2: ${show(ctx.co2, 'ppm')} (${co2Level(ctx.co2)})
- 공기청정기: ${ctx.purifierOn ? '켜짐' : '꺼짐'}, 창문: ${ctx.windowOpen ? '열림' : '닫힘'}
- 시간표: ${ctx.timetable}
- 등록된 예약: ${ctx.schedules.length ? ctx.schedules.join(' / ') : '없음'}
- 등록된 규칙: ${ctx.rules.length ? ctx.rules.join(' / ') : '없음'}

[할 일]
- "나중에 한 번" 실행 → propose_schedule. 시각이면 at(24시간제), 상대 시간이면 delay_seconds.
- 학교 수업 기준으로 "1시~7시"는 오후(13~19시)로 해석해.
- 이미 지난 시각이거나 날짜가 애매하면 예약하지 말고 되물어. 예약은 오늘 안의 시각만 가능해.
- "~엔", "~할 때마다"처럼 반복되는 조건 → propose_rule.
- "시험 시간", "수업 시간"처럼 시간표에 관한 조건은 when에 "시간표에 시험이 있는 교시"처럼 시간표 기준으로 적어.
- 직전에 제안한 규칙을 고쳐 달라고 하면("50 말고 40으로") 고친 내용으로 propose_rule을 다시 호출해.
- "지금 바로" 켜고 끄기 → 도구 없이 "제어 탭에서 바로 할 수 있어요"라고 한 문장으로만 안내.
- "왜?" 질문 → get_event_log를 먼저 호출하고, 기록에 있는 사실만으로 설명.
- 기록을 설명할 때는 "언제 예약했는지"와 "언제 실행됐는지"를 구분해서 말해.
- 예약·규칙 목록을 물으면 [지금 상황]의 목록으로 답해.
- 제안 도구를 쓸 때도 무엇을 제안하는지 한 문장으로 먼저 말해.

[금지]
- 도구 이름, "도구를 쓴다/안 쓴다" 같은 내부 동작은 말하지 마.
- [지금 상황]이나 기록에 없는 숫자는 지어내지 마.
- 공기가 좋다/나쁘다는 판단은 [지금 상황]의 등급(괄호 안)만 그대로 사용해.
- 공기질·장치·교실 환경과 관계없는 요청은 정중히 거절해.
- 답은 한국어, 두 문장 이내. 강조는 **굵게**만 사용.`;
}

// 대화 기록 → Claude 메시지 형식 (같은 역할이 연달아 오면 합치고, 첫 메시지는 user로)
function buildMessages(history, message) {
  const out = [];
  for (const h of list(history, HISTORY_TURNS)) {
    const role = h?.role === 'assistant' ? 'assistant' : h?.role === 'user' ? 'user' : null;
    const text = str(h?.text, 600).trim();
    if (!role || !text) continue;
    const last = out[out.length - 1];
    if (last?.role === role) last.content += `\n${text}`;
    else out.push({ role, content: text });
  }
  while (out[0]?.role === 'assistant') out.shift();
  const last = out[out.length - 1];
  if (last?.role === 'user') last.content += `\n${message}`;
  else out.push({ role: 'user', content: message });
  return out;
}

// 조회 도구 실행 (지금은 앱이 보낸 기록, 나중에 Node-RED/InfluxDB 조회로 교체)
function runLookup(name, input, ctx) {
  if (name === 'get_event_log') {
    const rows = ctx.events.filter((e) => e.device === input?.device);
    return rows.length ? rows : { message: '최근 기록 없음' };
  }
  return { error: 'unknown tool' };
}

// ── 대화 1회 처리 ───────────────────────────────────────────
// return { text, proposal: { type: 'schedule'|'rule', input } | null, lookedUpLog, usage }
export async function chat({ message, history, context }) {
  const ctx = cleanContext(context);
  const messages = buildMessages(history, message);
  const usage = { input: 0, output: 0 };
  let text = '';
  let proposal = null;
  let lookedUpLog = false;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt(ctx),
      tools: TOOLS,
      messages,
    });
    usage.input += res.usage?.input_tokens ?? 0;
    usage.output += res.usage?.output_tokens ?? 0;

    const toolUses = res.content.filter((b) => b.type === 'tool_use');
    const roundText = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    if (roundText) text = roundText;

    // 제안 도구가 나오면 여기서 끝 (앱이 카드를 띄우고 사람이 확인)
    const propose = toolUses.find((t) => t.name.startsWith('propose_'));
    if (propose) {
      proposal = { type: propose.name === 'propose_schedule' ? 'schedule' : 'rule', input: propose.input };
      break;
    }
    if (res.stop_reason !== 'tool_use' || toolUses.length === 0) break;

    // 조회 도구 결과를 돌려주고 다시 답하게 함
    lookedUpLog ||= toolUses.some((t) => t.name === 'get_event_log');
    messages.push({ role: 'assistant', content: res.content });
    messages.push({
      role: 'user',
      content: toolUses.map((t) => ({
        type: 'tool_result', tool_use_id: t.id, content: JSON.stringify(runLookup(t.name, t.input, ctx)),
      })),
    });
  }

  console.log(`[chat] "${message.slice(0, 40)}" → ${proposal?.type ?? (lookedUpLog ? 'log' : 'text')} (in ${usage.input} / out ${usage.output})`);
  return { text, proposal, lookedUpLog, usage, model: MODEL };
}
