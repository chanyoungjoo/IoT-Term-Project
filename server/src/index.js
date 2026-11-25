// AirClass API 서버 (라즈베리파이 Docker 컨테이너에서 실행, nginx가 /api/ 로 연결)
// - POST /api/chat   : AirChat 대화 → Claude Haiku
// - GET  /api/health : 상태 확인 (키 설정 여부, 오늘 사용량)
// 외부 패키지 없이 Node 기본 http 모듈만 사용한다.
import http from 'node:http';
import { chat, MODEL } from './chat.js';

const PORT = Number(process.env.PORT || 3000);
const DAILY_LIMIT = Number(process.env.DAILY_LIMIT || 300); // 하루 최대 호출 수 (비용 안전장치)
const MAX_BODY = 32 * 1024; // 요청 본문 최대 크기
const MAX_MESSAGE = 300; // 메시지 최대 글자 수

// ── 하루 사용량 (한국 날짜 기준, 메모리에만 보관 → 재시작하면 0부터) ──
const todayKST = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }); // 2026-11-23
let quota = { day: todayKST(), count: 0 };
function takeQuota() {
  const day = todayKST();
  if (quota.day !== day) quota = { day, count: 0 };
  if (quota.count >= DAILY_LIMIT) return false;
  quota.count += 1;
  return true;
}

// 사용자에게 보여도 되는 오류 (status + 한국어 메시지)
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    // 맥에서 expo start로 개발할 때 라파 주소로 바로 붙을 수 있게 허용
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(body === null ? undefined : JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new HttpError(413, '요청이 너무 커요'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(new HttpError(400, 'JSON 형식이 아니에요'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'OPTIONS') return sendJson(res, 204, null);

    if (req.method === 'GET' && pathname === '/api/health') {
      if (quota.day !== todayKST()) quota = { day: todayKST(), count: 0 };
      return sendJson(res, 200, {
        ok: true, model: MODEL, keySet: Boolean(process.env.ANTHROPIC_API_KEY),
        today: quota.count, dailyLimit: DAILY_LIMIT,
      });
    }

    if (req.method === 'POST' && pathname === '/api/chat') {
      if (!process.env.ANTHROPIC_API_KEY) throw new HttpError(503, '서버에 API 키가 설정되지 않았어요');
      const body = await readJson(req);
      const message = typeof body.message === 'string' ? body.message.trim() : '';
      if (!message) throw new HttpError(400, '메시지가 비어 있어요');
      if (message.length > MAX_MESSAGE) throw new HttpError(400, `메시지는 ${MAX_MESSAGE}자 이내로 보내 주세요`);
      if (!takeQuota()) throw new HttpError(429, '오늘 AirChat 사용량을 모두 썼어요');
      const result = await chat({ message, history: body.history, context: body.context });
      return sendJson(res, 200, result);
    }

    throw new HttpError(404, '없는 주소예요');
  } catch (err) {
    if (err instanceof HttpError) return sendJson(res, err.status, { error: err.message });
    // Claude API 오류(키 오류, 크레딧 부족, 한도 초과 등)는 로그에만 자세히 남기고 앱에는 502로
    console.error(`[api] ${req.method} ${pathname} 실패:`, err.status ?? '', err.message);
    return sendJson(res, 502, { error: 'AI 응답을 받지 못했어요' });
  }
});

server.listen(PORT, () => {
  console.log(`AirClass API :${PORT} · model ${MODEL} · key ${process.env.ANTHROPIC_API_KEY ? 'OK' : '없음'} · 하루 ${DAILY_LIMIT}회`);
});

// docker stop 시 바로 종료 (Node가 PID 1이면 SIGTERM을 직접 처리해야 함)
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    server.close(() => process.exit(0));
    server.closeAllConnections(); // 열려 있는 연결이 종료를 붙잡지 않게
  });
}
