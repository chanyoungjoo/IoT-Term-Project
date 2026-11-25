# 📱 AirClass 앱

담임 선생님이 **내 교실 공기를 확인하고, 창문과 공기청정기를 바로 제어**하는 앱이에요. (Expo / React Native)

## 화면 (하단 탭)

| 탭 | 내용 |
|---|---|
| 🏠 홈 | 교실 공기질 · 실내·외 비교, 상태별 화면 색, **창문 열기·닫기 추천 + 원탭 실행** |
| 🎛️ 제어 | 창문 열기·닫기, 공기청정기 전원 · 풍량 · 자동 모드 |
| 🤖 AirChat | 말로 **예약 · 자동화 규칙** 만들기, "왜 켜졌어?" 같은 기록 질문 |
| 📈 기록 | 오늘 CO₂·PM2.5 추세와 환기 기록 |
| ⚙️ 설정 | 내 교실, 알림 기준값, 계정 |

시작할 때 로그인 · 회원가입 · 계정 찾기 화면이 먼저 나와요.

## 🤖 AirChat

- 예: "CO₂ 1,000 넘고 바깥 괜찮으면 창문 열어줘" → 자동화 규칙 카드 제안
- AirChat은 제안만 하고, 선생님이 카드에서 확인해야 예약·규칙이 등록돼요.
- `/api/chat`(`../server`)으로 Claude에 물어보고, 서버에 연결되지 않으면 **기본 응답 모드**(앱 안의 모의 엔진)로 자동 전환돼요.

## 실행

```bash
npm install
npx expo start       # Expo Go로 QR 스캔
npm run build:web    # 웹 빌드 → dist/ (라즈베리파이에서 /app/ 으로 서빙)
```

맥에서 개발하면서 라즈베리파이의 AirChat 서버를 쓰려면 `app/.env`에 아래 값을 넣어요.

```bash
EXPO_PUBLIC_API_URL=https://<라파이름>.<tailnet>.ts.net
```

## 구조

```
src/
├── app/          # expo-router 탭 화면 (홈 · 제어 · AirChat · 기록 · 설정)
├── auth/         # 로그인 · 회원가입 · 계정 찾기
├── api.js        # 데이터 접근 창구 (지금은 shared/ 더미 데이터)
├── airchat.js    # AirChat 서버 호출 + 기본 응답 모드
└── WindowCard.jsx · WindowArt.jsx   # 창문 추천 카드 · 창문 애니메이션
```

- 스택: Expo SDK 58 · expo-router · react-native-svg · lucide-react-native

> [!WARNING]
> 시연용 데모 계정(`admin` / `1234`)과 인증 코드(`123456`)가 들어 있어요. 실제 서버에 연결하기 전에 지워야 해요.
