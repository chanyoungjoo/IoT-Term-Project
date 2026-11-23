// 로그인 전 화면 묶음. 간단한 화면 쌓기(스택)로 이동하고, 새 화면은 옆에서 밀려 들어옴.
// nav.push(이름, 값) / nav.back() / nav.replace(이름, 값) / nav.reset(이름, 값)
// 안드로이드 뒤로 버튼도 nav.back으로 처리
import { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, StyleSheet, View } from 'react-native';
import { useReducedMotion } from '../motion';
import Login from './Login';
import Signup from './Signup';
import { FindChoose, FindId, FindPw } from './Find';

const SCREENS = { login: Login, signup: Signup, find: FindChoose, findId: FindId, findPw: FindPw };
let seq = 0;
// dir: 1 앞으로(오른쪽에서 들어옴), -1 뒤로(왼쪽에서 들어옴)
const entry = (name, params = {}, dir = 1) => ({ name, params, dir, key: `${name}-${(seq += 1)}` });

export default function AuthFlow({ onLogin }) {
  const [stack, setStack] = useState(() => [entry('login')]);
  const nav = {
    push: (name, params) => setStack((st) => [...st, entry(name, params, 1)]),
    // 뒤로: 아래 화면을 새로 그리며 왼쪽에서 들어오게 (key를 바꿔 다시 마운트)
    back: () => setStack((st) => (st.length > 1 ? [...st.slice(0, -2), { ...entry(st[st.length - 2].name, st[st.length - 2].params, -1) }] : st)),
    replace: (name, params) => setStack((st) => [...st.slice(0, -1), entry(name, params, 1)]),
    reset: (name, params) => setStack([entry(name, params, -1)]),
  };

  // 안드로이드 하드웨어 뒤로: 첫 화면이 아니면 한 단계 뒤로
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length <= 1) return false;
      nav.back();
      return true;
    });
    return () => sub.remove();
  }, [stack.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const top = stack[stack.length - 1];
  const Screen = SCREENS[top.name];
  return (
    <View style={s.root}>
      <SlideIn key={top.key} dir={top.dir}>
        <Screen nav={nav} params={top.params} onLogin={onLogin} />
      </SlideIn>
    </View>
  );
}

// 화면이 바뀔 때: 진행 방향에서 살짝 밀려 들어오며 나타남 (동작 줄이기면 바로 표시)
function SlideIn({ dir, children }) {
  const reduced = useReducedMotion();
  const p = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) return;
    Animated.timing(p, { toValue: 1, duration: 320, easing: Easing.bezier(0.25, 0.1, 0.25, 1), useNativeDriver: true }).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const style = {
    flex: 1,
    opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
    transform: [{ translateX: p.interpolate({ inputRange: [0, 1], outputRange: [dir * 36, 0] }) }],
  };
  return <Animated.View style={style}>{children}</Animated.View>;
}

const s = StyleSheet.create({
  root: { flex: 1 }, // 투명 (로그인 전환 때 뒤의 홈이 보이게)
});
