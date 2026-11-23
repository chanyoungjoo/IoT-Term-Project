// 공기청정기 아이콘: 키 큰 세로형 본체 + 둥근 흡입구 + 아래 바람 나오는 곳
// lucide 아이콘과 같은 사용법(size, color, strokeWidth)이라 기존 Fan 자리에 그대로 넣을 수 있다.
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export function PurifierIcon({ size = 24, color = '#000', strokeWidth = 2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="6" y="2.5" width="12" height="19" rx="3" />{/* 본체 */}
      <Circle cx="12" cy="10" r="3.5" />{/* 흡입구 */}
      <Path d="M9.5 17.5h5" />{/* 아래 토출구 */}
    </Svg>
  );
}
