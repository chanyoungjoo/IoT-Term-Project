// PM2.5(미세먼지) 아이콘: 마스크
// lucide 아이콘과 같은 사용법(size, color, strokeWidth)이라 MetricCard의 icon 자리에 그대로 넣을 수 있다.
import Svg, { Path } from 'react-native-svg';

// 24×24 기준 좌표
const PATHS = [
  'M5 9.5C5 8.1 6.1 7 7.5 7h9C17.9 7 19 8.1 19 9.5V12c0 3.6-3.1 6.5-7 6.5S5 15.6 5 12Z', // 마스크 몸체
  'M5 10H3.6A1.6 1.6 0 0 0 2 11.6v.2A3.2 3.2 0 0 0 5.2 15', // 왼쪽 귀걸이 끈
  'M19 10h1.4a1.6 1.6 0 0 1 1.6 1.6v.2a3.2 3.2 0 0 1-3.2 3.2', // 오른쪽 귀걸이 끈
  'M8.5 11h7', // 주름 위
  'M9.5 14h5', // 주름 아래
];

export function MaskIcon({ size = 24, color = '#000', strokeWidth = 2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {PATHS.map((d) => <Path key={d} d={d} />)}
    </Svg>
  );
}
