// 그라데이션 배경 (react-native-svg만 사용, 추가 패키지 없음)
// 부모 안에 absolute로 깔고, 부모에 overflow: 'hidden' + borderRadius를 주면 모서리도 둥글게 잘린다.
// 크기는 '100%' 대신 실제 영역을 재서(onLayout) 숫자로 그린다.
//  - 아이폰에서 SVG의 퍼센트 크기가 영역보다 작게 계산되어 그라데이션이 일부만 칠해지는 문제가 있었음
//  - 재기 전 첫 순간에는 시작색으로 칠해 두어 빈 화면이 깜빡이지 않게 함
import { useId, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

const DIR = {
  diag: { x1: 0, y1: 0, x2: 1, y2: 1 }, // 왼쪽 위 → 오른쪽 아래
  vertical: { x1: 0, y1: 0, x2: 0, y2: 1 },
  horizontal: { x1: 0, y1: 0, x2: 1, y2: 0 },
};

// colors: [시작색, 끝색], glow: 오른쪽 위에 은은한 흰 빛 (0~1)
export function Gradient({ colors, dir = 'diag', glow = 0, style }) {
  const id = `g${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [size, setSize] = useState(null);
  const onLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    if (!size || size.width !== width || size.height !== height) setSize({ width, height });
  };
  return (
    <View
      pointerEvents="none" onLayout={onLayout}
      style={[StyleSheet.absoluteFill, !size && { backgroundColor: colors[0] }, style]}
    >
      {size && size.width > 0 && size.height > 0 && (
        <Svg width={size.width} height={size.height}>
          <Defs>
            <LinearGradient id={id} {...DIR[dir]}>
              <Stop offset="0" stopColor={colors[0]} />
              <Stop offset="1" stopColor={colors[1]} />
            </LinearGradient>
            {glow > 0 && (
              <RadialGradient id={`${id}glow`} cx="0.85" cy="0.1" r="0.6">
                <Stop offset="0" stopColor="#ffffff" stopOpacity={glow} />
                <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
              </RadialGradient>
            )}
          </Defs>
          <Rect x={0} y={0} width={size.width} height={size.height} fill={`url(#${id})`} />
          {glow > 0 && <Rect x={0} y={0} width={size.width} height={size.height} fill={`url(#${id}glow)`} />}
        </Svg>
      )}
    </View>
  );
}
