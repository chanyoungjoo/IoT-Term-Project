// 홈 히어로의 창문 그림. 규칙(상태)에 따라 움직인다.
//  2 환기 필요  : 창문 두 짝이 경첩을 축으로 열리고, 바람 화살표가 밖으로 흘러감
//  3 실외 나쁨  : 창문이 닫히고 금지 표시, 밖의 먼지가 창에 막혀 튕김
//  1 실내 PM 높음: 창문 닫힘 + 금지 표시, 둘레로 물결
//  5 정상       : 창문 닫힘 + 체크, 둘레로 잔잔한 물결
// 상태가 바뀌어도 다시 마운트하지 않아서, 열림 ↔ 닫힘이 이어지는 동작으로 보인다.
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Rect, Line, Circle, Path } from 'react-native-svg';
import { useAnimatedTo, useReducedMotion } from './motion';

const W = 100;
const H = 96;
const SASH_W = 35;
const SASH_H = 80;
const TOP = 8;

// active인 동안 반복 애니메이션을 돌리고, 꺼지거나 '동작 줄이기'면 멈춘다
function useLoop(active, value, make) {
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!active || reduced) return value.setValue(0);
    const anim = Animated.loop(make(value));
    anim.start();
    return () => anim.stop();
  }, [active, reduced]); // eslint-disable-line react-hooks/exhaustive-deps
}

const linear = (duration) => (v) => Animated.timing(v, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true });
const pingPong = (duration) => (v) => Animated.sequence([
  Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
  Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
]);

export default function WindowArt({ rule, color, bg }) {
  const isOpen = rule === 2;
  const open = useAnimatedTo(isOpen ? 1 : 0, { spring: true, native: true });
  const badgeIn = useAnimatedTo(isOpen ? 0 : 1, { spring: true, native: true });
  const flow = useRef(new Animated.Value(0)).current;
  const dust = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  useLoop(isOpen, flow, linear(1400));
  useLoop(rule === 3, dust, pingPong(700));
  useLoop(rule === 5 || rule === 1, pulse, linear(1600));

  const label = isOpen ? '창문을 열어 환기하는 그림' : rule === 5 ? '창문이 닫혀 있고 괜찮다는 그림' : '창문을 닫아 두라는 그림';
  const sashFill = { fill: color, fillOpacity: 0.12 };

  return (
    <View style={s.box} accessible accessibilityRole="image" accessibilityLabel={label}>
      {/* 창 구멍(창짝이 열리면 드러나는 연한 면)과 창턱. 테두리는 창짝이 그리므로 여기서는 선을 긋지 않는다 */}
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Rect x={15} y={TOP} width={SASH_W * 2} height={SASH_H} rx={4} fill={color} fillOpacity={0.14} />
        <Line x1={9} y1={TOP + SASH_H + 5} x2={W - 9} y2={TOP + SASH_H + 5} stroke={color} strokeWidth={4} strokeLinecap="round" />
      </Svg>

      {/* 열린 창 사이로 빠져나가는 바람 (화살표 2개, 반 박자씩 어긋나게) */}
      {[0, 0.5].map((phase, i) => {
        const t = phase ? Animated.modulo(Animated.add(flow, phase), 1) : flow;
        return (
          <Animated.View
            key={phase} pointerEvents="none"
            style={[s.arrow, {
              top: i ? 52 : 26,
              opacity: Animated.multiply(open, t.interpolate({ inputRange: [0, 0.25, 0.75, 1], outputRange: [0, 1, 1, 0] })),
              transform: [{ translateX: t.interpolate({ inputRange: [0, 1], outputRange: [10, -14] }) }],
            }]}
          >
            <Svg width={40} height={18}>
              <Path d="M36 9 H6 M14 2 L6 9 L14 16" stroke={color} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Animated.View>
        );
      })}

      {/* 왼쪽 창짝: 왼쪽 경첩 기준으로 회전 */}
      <Animated.View style={[s.sash, { left: 15, transformOrigin: 'left',
        transform: [{ perspective: 260 }, { rotateY: open.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-68deg'] }) }] }]}>
        <Sash color={color} fill={sashFill} handleX={SASH_W - 7} />
      </Animated.View>
      {/* 오른쪽 창짝: 오른쪽 경첩 기준으로 회전 */}
      <Animated.View style={[s.sash, { left: 50, transformOrigin: 'right',
        transform: [{ perspective: 260 }, { rotateY: open.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '68deg'] }) }] }]}>
        <Sash color={color} fill={sashFill} handleX={7} />
      </Animated.View>

      {/* 가운데 배지: 닫혀 있을 때만, 정상이면 체크 / 그 외 금지 표시 */}
      <Animated.View pointerEvents="none" style={[s.badgeWrap, { opacity: badgeIn, transform: [{ scale: badgeIn }] }]}>
        <Animated.View style={[s.ring, { borderColor: color,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }] }]} />
        <Svg width={36} height={36}>
          <Circle cx={18} cy={18} r={15} fill={bg} stroke={color} strokeWidth={4} />
          {rule === 5
            ? <Path d="M11 18 L16 23 L26 13" stroke={color} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            : <Line x1={8} y1={8} x2={28} y2={28} stroke={color} strokeWidth={4} strokeLinecap="round" />}
        </Svg>
      </Animated.View>

      {/* 실외 나쁨: 밖에서 다가오다 창에 막혀 튕기는 먼지 */}
      {rule === 3 && [16, 36, 56, 76].map((y, i) => (
        <Animated.View
          key={y} pointerEvents="none"
          style={[s.dust, { top: y, right: i % 2 ? -6 : -2,
            transform: [{ translateX: dust.interpolate({ inputRange: [0, 1], outputRange: i % 2 ? [0, -5] : [-4, 2] }) }] }]}
        />
      ))}
    </View>
  );
}

function Sash({ color, fill, handleX }) {
  return (
    <Svg width={SASH_W} height={SASH_H}>
      <Rect x={2} y={2} width={SASH_W - 4} height={SASH_H - 4} rx={4} stroke={color} strokeWidth={4} {...fill} />
      <Line x1={handleX} y1={SASH_H / 2 - 7} x2={handleX} y2={SASH_H / 2 + 7} stroke={color} strokeWidth={3} strokeLinecap="round" />
    </Svg>
  );
}

const s = StyleSheet.create({
  box: { width: W, height: H },
  sash: { position: 'absolute', top: TOP, width: SASH_W, height: SASH_H },
  arrow: { position: 'absolute', left: 30 },
  badgeWrap: { position: 'absolute', left: W / 2 - 18, top: H / 2 - 18, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 36, height: 36, borderRadius: 18, borderWidth: 2 },
  dust: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#ff8a3d' },
});
