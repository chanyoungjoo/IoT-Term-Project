// CLAUDE.md 디자인 토큰
export const C = {
  primary: '#3a70fc',
  primaryDeep: '#2c5fe6',
  primarySoft: '#e9f1ff',
  primaryLight: '#8bb5fe',
  bg: '#f4f7fd',
  surface: '#ffffff',
  text: '#282828',
  textSub: '#66718a',
  border: '#e3e9f5',
  ok: '#2b9a66', okText: '#1e7a50', okBg: '#eaf6f0',
  warn: '#f08c00', warnText: '#a85f00', warnBg: '#fff1dc',
  bad: '#e03131', badText: '#c42727', badBg: '#fdecec',
  navy: '#1f2a44',
  // 추세 탭 동작 색: 창문(바깥 공기) 청록, 공기청정기 보라
  window: '#0c9e8a', windowBg: '#e3f7f3',
  purifier: '#7048e8', purifierBg: '#efebff',
};

export const FONT = {
  400: 'WantedSans-Regular',
  500: 'WantedSans-Medium',
  600: 'WantedSans-SemiBold',
  700: 'WantedSans-Bold',
  800: 'WantedSans-ExtraBold',
};

export const LEVEL = {
  ok: { fg: C.okText, bg: C.okBg, bar: C.ok },
  warn: { fg: C.warnText, bg: C.warnBg, bar: C.warn },
  bad: { fg: C.badText, bg: C.badBg, bar: C.bad },
};

export const shadow = {
  shadowColor: '#1f2a44', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 2,
};

// 그라데이션 색 (시작 → 끝)
export const GRAD = {
  brand: ['#3a70fc', '#6c5cff'], // AirChat 전용: 버튼, 내 말풍선, 전송 버튼 (AI 아바타와 같은 파랑→보라)
  hero: {
    5: ['#4b8bff', '#5a55f2'], // 정상: 밝은 파랑 → 남보라
    2: ['#ffc65e', '#ff8b3d'], // CO₂ 높음: 노랑 → 주황
    3: ['#33477a', '#141b30'], // 실외 나쁨: 남색 → 밤색
    1: ['#ff6065', '#d1264c'], // PM 높음: 코랄 → 진홍
  },
};

// 홈 히어로 색: 적용된 규칙 번호별 (정상 파랑 / CO₂ 높음 주황 / 실외 나쁨 남색 / 실내 PM 높음 빨강)
export const HERO = {
  5: { bg: C.primary, fg: '#ffffff', sub: 'rgba(255,255,255,0.82)', chip: 'rgba(255,255,255,0.18)', glass: 'rgba(255,255,255,0.14)', label: '모든 수치 정상' },
  2: { bg: '#ffad3b', fg: '#2b1a00', sub: 'rgba(43,26,0,0.75)', chip: 'rgba(43,26,0,0.1)', glass: 'rgba(255,255,255,0.28)', label: '주의, CO₂ 높음' },
  3: { bg: C.navy, fg: '#ffffff', sub: 'rgba(255,255,255,0.78)', chip: 'rgba(255,255,255,0.14)', glass: 'rgba(255,255,255,0.09)', label: '실외 나쁨, 환기 제한' },
  1: { bg: C.bad, fg: '#ffffff', sub: 'rgba(255,255,255,0.85)', chip: 'rgba(255,255,255,0.18)', glass: 'rgba(255,255,255,0.14)', label: '경고, PM2.5 높음' },
};
