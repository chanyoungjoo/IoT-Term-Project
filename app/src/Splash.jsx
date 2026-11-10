// 앱 안 스플래시: 네이티브 스플래시(app.json의 expo-splash-screen)와 같은 배경·같은 위치·같은 크기의 로고에서 시작해
// 바람 선이 그려지고 이름이 떠오른 뒤, 로고가 커지며 사라져 홈이 드러난다.
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import Svg, { Path } from 'react-native-svg';
import { C } from './theme';
import { T } from './ui';
import { useReducedMotion } from './motion';

const LOGO = 96; // app.json splash imageWidth와 같아야 이어져 보인다
const GLYPH = (LOGO * 620) / 1024; // 앱 아이콘(icon.png)과 같은 비율
const LINES = ['M9.8 4.4A2 2 0 1 1 11 8H2', 'M17.5 8a2.5 2.5 0 1 1 2 4H2', 'M12.8 19.6A2 2 0 1 0 14 16H2']; // lucide Wind
const DASH = 30; // 각 선 길이보다 긴 값 (viewBox 단위)

const AnimatedPath = Animated.createAnimatedComponent(Path);
const timing = (v, toValue, duration, delay = 0, native = true, easing = Easing.out(Easing.cubic)) =>
  Animated.timing(v, { toValue, duration, delay, easing, useNativeDriver: native });

export default function Splash({ onDone }) {
  const reduced = useReducedMotion();
  const draw = useRef(LINES.map(() => new Animated.Value(0))).current;
  const text = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 화면이 그려진 뒤 네이티브 스플래시를 내린다 (같은 모습이라 바뀌는 순간이 안 보임)
    SplashScreen.hideAsync();
    const anim = reduced
      ? timing(out, 1, 250, 400)
      : Animated.sequence([
          Animated.stagger(110, draw.map((v) => timing(v, 1, 420, 0, false))),
          timing(text, 1, 380),
          timing(out, 1, 420, 450, true, Easing.in(Easing.cubic)),
        ]);
    anim.start(({ finished }) => finished && onDone());
    return () => anim.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fade = out.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, s.bg, { opacity: fade }]} pointerEvents="none"
      accessible accessibilityLabel="AirClass 시작 중">
      <StatusBar style="light" />
      <Animated.View style={[s.logo, { transform: [{ scale: out.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }] }]}>
        <Svg width={GLYPH} height={GLYPH} viewBox="0 0 24 24">
          {LINES.map((d, i) => (
            <AnimatedPath
              key={d} d={d} fill="none" stroke={C.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
              // 네이티브 스플래시는 빈 흰 사각형이라, 선은 여기서 처음 그려진다
              strokeDasharray={`${DASH} ${DASH}`}
              strokeDashoffset={reduced ? 0 : draw[i].interpolate({ inputRange: [0, 1], outputRange: [DASH, 0] })}
            />
          ))}
        </Svg>
      </Animated.View>
      <Animated.View style={[s.name, { opacity: text, transform: [{ translateY: text.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
        <T w={800} size={28} color="#fff">AirClass</T>
        <T size={14} color="rgba(255,255,255,0.8)" style={{ marginTop: 4 }}>교실 공기를 한눈에 봐요</T>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  bg: { backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  logo: { width: LOGO, height: LOGO, borderRadius: (LOGO * 236) / 1024, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  name: { position: 'absolute', top: '50%', marginTop: LOGO / 2 + 20, alignItems: 'center' },
});
