// 공용 모션: RN 기본 Animated만 사용 (추가 라이브러리 없음)
// iOS '동작 줄이기'가 켜져 있으면 모든 애니메이션을 건너뛰고 바로 최종값을 보여 준다.
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable } from 'react-native';

// ── 앱 전체 애니메이션 속도 기준 ──────────────────────
// TEMPO: 모든 시간(duration·delay)에 곱하는 값. 1보다 크면 느려진다. (1 = 처음 설계값)
// EASE: 처음엔 부드럽게 출발해서 끝에서 천천히 멈추는 곡선 (CSS의 ease와 같음).
//       예전의 Easing.out(cubic)은 출발이 너무 급해서 "툭" 튀어나오는 느낌이 났다.
export const TEMPO = 1.4;
export const EASE = Easing.bezier(0.25, 0.1, 0.25, 1);
const t = (ms) => Math.round(ms * TEMPO);

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
      ? Animated.spring(v, { toValue: target, useNativeDriver: native, speed: 10, bounciness: 4, delay: t(delay) })
      : Animated.timing(v, { toValue: target, duration: t(duration), delay: t(delay), easing: EASE, useNativeDriver: native });
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
    Animated.timing(p, { toValue: 1, duration: t(duration), easing: EASE, useNativeDriver: false }).start();
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
  const to = (v) => Animated.spring(s, { toValue: v, useNativeDriver: true, speed: 28, bounciness: 6 }).start();
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

// ── 탭 전환 애니메이션 ───────────────────────────────
// TAB_TRANSITION 값만 바꾸면 탭을 옮길 때의 움직임이 바뀐다.
//   'lift'  : 새 화면이 살짝 아래에서 떠오르며 나타남 (카드 FadeIn과 같은 느낌, 기본)
//   'fade'  : 제자리에서 서서히 바뀜 (가장 조용함)
//   'slide' : 누른 탭 방향으로 살짝 밀림 (방향감)
//   'none'  : 애니메이션 없음
export const TAB_TRANSITION = 'lift';
export const TAB_TRANSITION_MS = t(240); // 탭 전환 시간 (약 0.34초). 스크롤 되돌리기 시점에도 씀

// progress: 지금 탭 0, 왼쪽 탭 -1, 오른쪽 탭 1 → 0에 가까울수록 또렷하게
const tabInterpolators = {
  lift: ({ current }) => ({
    sceneStyle: {
      opacity: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] }),
      transform: [
        { translateY: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [12, 0, 12] }) },
        { scale: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.985, 1, 0.985] }) },
      ],
    },
  }),
  fade: ({ current }) => ({
    sceneStyle: {
      opacity: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] }),
    },
  }),
  slide: ({ current }) => ({
    sceneStyle: {
      opacity: current.progress.interpolate({ inputRange: [-1, -0.6, 0, 0.6, 1], outputRange: [0, 0.4, 1, 0.4, 0] }),
      transform: [{ translateX: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [-28, 0, 28] }) }],
    },
  }),
};

// Tabs의 screenOptions에 펼쳐 넣는 설정. 동작 줄이기가 켜져 있으면 애니메이션 없이 바로 바뀐다.
export function tabTransitionOptions(reduced) {
  if (reduced || TAB_TRANSITION === 'none') return { animation: 'none' };
  return {
    animation: 'fade', // 탭 전환 애니메이션을 켜는 스위치 (실제 움직임은 아래 두 값이 정함)
    sceneStyleInterpolator: tabInterpolators[TAB_TRANSITION],
    transitionSpec: { animation: 'timing', config: { duration: TAB_TRANSITION_MS, easing: EASE } }, // 약 0.34초
  };
}
