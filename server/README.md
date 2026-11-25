# 🤖 AirClass API 서버 (AirChat)

앱의 **AirChat** 대화를 Claude Haiku에 연결하는 서버예요. 라즈베리파이의 Docker 컨테이너에서 돌고, nginx가 `/api/`로 연결해요.
외부 패키지는 `@anthropic-ai/sdk` 하나만 써요.

## API

| 메서드 | 주소 | 내용 |
|---|---|---|
| `POST` | `/api/chat` | `{ message, history, context }` → `{ text, proposal, ... }` |
| `GET` | `/api/health` | 키 설정 여부, 모델, 오늘 사용량 |

## AirChat이 할 수 있는 일

| 도구 | 동작 |
|---|---|
| `propose_schedule` | 한 번만 실행되는 **예약** 제안 (예: "1분 뒤 청정기 켜줘") |
| `propose_rule` | 조건마다 반복되는 **자동화 규칙** 제안 (예: "CO₂ 높고 바깥 괜찮으면 창문 열어줘") |
| `get_event_log` | 교실의 최근 장치 동작 기록 조회 (예: "청정기 왜 켜졌어?") |

> 서버는 장치를 **직접 제어하지 않아요**. `propose_*`는 제안만 돌려주고, 앱에서 선생님이 확인해야 등록돼요.

## 설정 (`server/.env`)

```bash
cp .env.example .env
```

| 변수 | 설명 | 기본값 |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude Console에서 발급한 키 (**깃에 올리지 않기**) | — |
| `ANTHROPIC_MODEL` | 사용할 모델 | `claude-haiku-5-5` |
| `DAILY_LIMIT` | 하루 최대 `/api/chat` 호출 수 (한국 자정 초기화) | `300` |
| `PORT` | 서버 포트 | `3000` |

## 실행

```bash
npm install
npm run dev    # 로컬 개발 (.env 읽기 + 자동 재시작)
npm start      # 운영
```

라즈베리파이에서는 루트에서 `docker compose up -d --build`로 웹·앱과 함께 띄워요.

```bash
curl -s localhost/api/health   # "keySet":true 이면 연결 완료
docker compose logs -f api     # 대화 로그 · 토큰 사용량
```

## 비용 안전장치

- 메시지 300자 제한, 하루 호출 수 제한(`DAILY_LIMIT`)
- nginx 분당 요청 제한, Claude Console 월 지출 한도
- 도구 왕복 최대 3회, 최근 대화 8개만 전송
