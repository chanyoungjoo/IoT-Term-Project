// AirChat 아이콘: 바람 3줄(공기) + 별 2개(AI)
// - 바람: 선(stroke)으로, 별: 채움(fill)으로 그려서 작은 크기에서도 별이 먼저 보이게
// - lucide 아이콘과 같은 사용법(size, color)이라 탭바 아이콘 자리에 그대로 넣을 수 있다
import Svg, { G, Path } from 'react-native-svg';

// 24×24 기준 좌표
const WIND = [
  'M2.5 13.5h7.2a2.2 2.2 0 1 0-1.8-3.5', // 위: 짧게 말려 올라가는 바람
  'M2.5 17h12.5a2.5 2.5 0 1 1-2.1 3.9', // 가운데: 길게 말려 내려가는 바람
  'M2.5 20.5h5.5', // 아래: 짧은 바람
];
const STARS = [
  // 큰 별 (오른쪽 위, AI 강조)
  'M17.8 0.7C18.47 4.28 19.82 5.63 23.4 6.3C19.82 6.97 18.47 8.32 17.8 11.9C17.13 8.32 15.78 6.97 12.2 6.3C15.78 5.63 17.13 4.28 17.8 0.7Z',
  // 작은 별 (왼쪽 위, 반짝임)
  'M5.5 2.6C5.73 3.82 6.18 4.27 7.4 4.5C6.18 4.73 5.73 5.18 5.5 6.4C5.27 5.18 4.82 4.73 3.6 4.5C4.82 4.27 5.27 3.82 5.5 2.6Z',
];

export function AirChatIcon({ size = 24, color = '#fff', strokeWidth = 2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        {WIND.map((d) => <Path key={d} d={d} />)}
      </G>
      <G fill={color}>
        {STARS.map((d) => <Path key={d} d={d} />)}
      </G>
    </Svg>
  );
}
