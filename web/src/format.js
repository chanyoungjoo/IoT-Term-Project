// 숫자·날짜 포맷과 차트 색 (컴포넌트 파일과 분리해야 Fast Refresh가 동작)
export const fmt = (n) => n.toLocaleString('ko-KR')

// '2026-11-10T09:51:00+09:00' → '11월 10일 오전 9:51'
export const stamp = (iso) =>
  new Date(iso).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Seoul' })

// 사용자가 '동작 줄이기'를 켰으면 차트 애니메이션도 끈다
export const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// SVG 속성에는 CSS 변수가 안 먹는 경우가 있어 차트용 색은 값으로 둔다 (index.css 토큰과 같은 값)
export const COLORS = { primary: '#3a70fc', primaryLight: '#8bb5fe', warn: '#f08c00', bad: '#e03131', ok: '#2b9a66', sub: '#66718a', border: '#e3e9f5' }
