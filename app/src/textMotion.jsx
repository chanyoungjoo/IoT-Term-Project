// 글자·숫자 애니메이션
// - 숫자(A안 카운트업): 값이 바뀌면 이전 값에서 새 값까지 빠르게 세어 올라가거나 내려감
//   · 처음 화면에 나올 때는 0부터 세어 올라감
//   · 아주 작은 변화(3% 미만)는 바로 바꿈 → 실제 센서 값이 조금씩 흔들릴 때 숫자가 계속 움직이지 않게
// - 글자(D안 위로 밀어 교체): 문구가 바뀌면 이전 문구는 위로 사라지고 새 문구가 아래에서 올라옴
// - '동작 줄이기'가 켜져 있으면 둘 다 효과 없이 바로 바뀜
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { EASE, TEMPO, useReducedMotion } from './motion';
import { C, FONT } from './theme';

// ui.jsx의 T와 같은 글자 (ui.jsx가 이 파일을 쓰므로, 서로 불러오는 순환을 피하려고 여기 따로 둠)
function T({ w = 400, size = 15, color = C.text, style, ...rest }) {
  return <Text {...rest} style={[{ fontFamily: FONT[w], fontSize: size, color, fontVariant: ['tabular-nums'] }, style]} />;
}

// '1,180' / '23.5' / 620 처럼 숫자로 읽을 수 있으면 { num, decimals, comma }, 아니면 null ('-' 같은 값)
function parseNumber(value) {
  const str = String(value).trim();
  if (!/^-?[\d,]+(\.\d+)?$/.test(str)) return null;
  return { num: Number(str.replace(/,/g, '')), decimals: (str.split('.')[1] ?? '').length, comma: str.includes(',') };
}
// 원래 값과 같은 모양(소수 자릿수, 천 단위 쉼표)으로 다시 글자로
function formatLike(n, { decimals, comma }) {
  const fixed = n.toFixed(decimals);
  if (!comma && Math.abs(n) < 1000) return fixed;
  const [int, frac] = fixed.split('.');
  const withComma = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac ? `${withComma}.${frac}` : withComma;
}
const easeOut = (x) => 1 - (1 - x) ** 3;

// 숫자 값 → 지금 화면에 보여 줄 글자
export function useCountUp(value, { duration = 950 } = {}) { // 약 1.3초 (TEMPO 1.4배)
  const reduced = useReducedMotion();
  const target = parseNumber(value);
  const [shown, setShown] = useState(() => (target && !reduced ? formatLike(0, target) : String(value)));
  const from = useRef(target ? 0 : null); // 지금 화면에 보이는 숫자 (다음 애니메이션의 시작점)

  useEffect(() => {
    if (!target) { setShown(String(value)); from.current = null; return undefined; }
    const start = from.current ?? target.num;
    const diff = target.num - start;
    const small = Math.abs(diff) < Math.max(Math.abs(target.num) * 0.03, 10 ** -target.decimals);
    if (reduced || small) { setShown(formatLike(target.num, target)); from.current = target.num; return undefined; }
    let raf;
    const t0 = Date.now();
    const total = Math.round(duration * TEMPO);
    const tick = () => {
      const p = Math.min(1, (Date.now() - t0) / total);
      const n = start + diff * easeOut(p);
      from.current = n;
      setShown(formatLike(n, target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [String(value), reduced]); // eslint-disable-line react-hooks/exhaustive-deps
  return shown;
}

// 숫자 글자 (T와 같은 속성을 받음). 예: <CountText w={800} size={28} value="1,180" />
export function CountText({ value, duration, ...tProps }) {
  const shown = useCountUp(value, { duration });
  return <T {...tProps}>{shown}</T>;
}

// 위로 밀어 바뀌는 글자 (T와 같은 속성을 받음). 예: <SwapText w={800} size={26}>{title}</SwapText>
export function SwapText({ children, style, containerStyle, ...tProps }) {
  const text = String(children ?? '');
  const reduced = useReducedMotion();
  const [cur, setCur] = useState(text);
  const [prev, setPrev] = useState(null);
  const [h, setH] = useState(0);
  const p = useRef(new Animated.Value(1)).current;

  // 글자가 바뀐 그 렌더에서 바로 이전/새 글자를 정해 둠 (새 글자가 한 프레임 먼저 보이는 깜빡임 방지)
  if (text !== cur) {
    setPrev(reduced ? null : cur);
    setCur(text);
    if (!reduced) p.setValue(0);
  }
  useEffect(() => {
    if (prev == null) return undefined;
    const anim = Animated.timing(p, { toValue: 1, duration: Math.round(520 * TEMPO), easing: EASE, useNativeDriver: true }); // 약 0.73초
    anim.start(({ finished }) => { if (finished) setPrev(null); });
    return () => anim.stop();
  }, [prev, cur]); // eslint-disable-line react-hooks/exhaustive-deps

  const dist = h || 24; // 높이를 재기 전에는 대략값
  return (
    <View style={[s.box, containerStyle]} onLayout={(e) => setH(e.nativeEvent.layout.height)}>
      <Animated.View style={prev != null && { opacity: p, transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [dist, 0] }) }] }}>
        <T {...tProps} style={style}>{cur}</T>
      </Animated.View>
      {prev != null && (
        <Animated.View
          pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
          style={[s.prev, { opacity: p.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, -dist] }) }] }]}
        >
          <T {...tProps} style={style}>{prev}</T>
        </Animated.View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  box: { overflow: 'hidden', alignSelf: 'stretch' },
  prev: { position: 'absolute', top: 0, left: 0, right: 0 },
});
