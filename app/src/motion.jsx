// 공용 모션: RN 기본 Animated만 사용 (추가 라이브러리 없음)
// iOS '동작 줄이기'가 켜져 있으면 모든 애니메이션을 건너뛰고 바로 최종값을 보여 준다.
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable } from 'react-native';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

// target이 바뀌면 그 값으로 부드럽게 따라가는 Animated.Value. from을 주면 처음 마운트 때 from에서 출발.
export function useAnimatedTo(target, { from = target, spring, duration = 600, delay = 0, native = false } = {}) {
  const v = useRef(new Animated.Value(from)).current;
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return v.setValue(target);
    const anim = spring
      ? Animated.spring(v, { toValue: target, useNativeDriver: native, speed: 16, bounciness: 6, delay })
      : Animated.timing(v, { toValue: target, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: native });
    anim.start();
    return () => anim.stop();
  }, [target, reduced]); // eslint-disable-line react-hooks/exhaustive-deps
  return v;
}

// 색이 바뀌면 이전 색에서 새 색으로 섞어 준다 (히어로 배경)
export function useAnimatedColor(color, duration = 500) {
  const [pair, setPair] = useState([color, color]);
  const p = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (color === pair[1]) return;
    setPair([pair[1], color]);
    p.setValue(0);
    Animated.timing(p, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [color]); // eslint-disable-line react-hooks/exhaustive-deps
  return p.interpolate({ inputRange: [0, 1], outputRange: pair });
}

// 마운트될 때 아래에서 떠오르며 나타남. key를 바꾸면 다시 재생된다.
export function FadeIn({ delay = 0, from = 16, scaleFrom = 1, duration = 450, style, children }) {
  const p = useAnimatedTo(1, { from: 0, delay, duration, native: true });
  const transform = [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }];
  if (scaleFrom !== 1) transform.push({ scale: p.interpolate({ inputRange: [0, 1], outputRange: [scaleFrom, 1] }) });
  return <Animated.View style={[style, { opacity: p, transform }]}>{children}</Animated.View>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// 누르면 살짝 눌렸다가 스프링으로 돌아오는 Pressable
export function PressScale({ style, scaleTo = 0.96, onPressIn, onPressOut, ...rest }) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (v) => Animated.spring(s, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 8 }).start();
  return (
    <AnimatedPressable
      {...rest}
      style={[style, { transform: [{ scale: s }] }]}
      onPressIn={(e) => { to(scaleTo); onPressIn?.(e); }}
      onPressOut={(e) => { to(1); onPressOut?.(e); }}
    />
  );
}

// 세그먼트·탭바에서 선택 항목 뒤를 미끄러지듯 따라가는 배경
// width: 컨테이너 안쪽 너비, gap: 항목 사이 간격, index < 0 이면 숨김
export function SlidingPill({ index, count, width, gap = 0, style }) {
  const x = useAnimatedTo(Math.max(index, 0), { spring: true, native: true });
  const shown = useAnimatedTo(index < 0 ? 0 : 1, { duration: 200, native: true });
  if (!width) return null;
  const itemW = (width - gap * (count - 1)) / count;
  const translateX = x.interpolate({ inputRange: [0, 1], outputRange: [0, itemW + gap], extrapolate: 'extend' });
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, width: itemW, opacity: shown, transform: [{ translateX }] }, style]}
    />
  );
}
