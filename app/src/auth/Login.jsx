// 로그인 (L-A): 위쪽은 브랜드 그라데이션 + 소개, 아래 흰 시트에 입력칸
// - 로고를 길게 누르면 시연 계정이 채워짐 (발표 때 빠르게 로그인)
// - 5번 틀리면 1분 잠금, 승인 대기 계정은 안내 문구
// - 가운데 큰 창문 그림(P-3): 4초마다 창이 열려 바람이 들어오고 다시 닫힘 (홈 화면 '환기'와 같은 동작)
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { Lock, User, Wind } from 'lucide-react-native';
import { Gradient } from '../Gradient';
import { C, GRAD } from '../theme';
import { T } from '../ui';
import { FadeIn, TEMPO, useReducedMotion } from '../motion';
import { SwapText } from '../textMotion';
import { DEMO_ACCOUNT, login } from './authApi';
import { Btn, CheckRow, Field, Screen } from './parts';

export default function Login({ nav, params, onLogin }) {
  const insets = useSafeAreaInsets();
  const [id, setId] = useState(params.id ?? '');
  const [pw, setPw] = useState('');
  const [keep, setKeep] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice] = useState(params.notice ?? null); // 다른 화면에서 넘어올 때 보여 줄 안내 (예: 비밀번호를 바꿨어요)

  const submit = async () => {
    if (!id.trim() || !pw) { setError('아이디와 비밀번호를 입력해 주세요.'); return; }
    setBusy(true);
    const r = await login(id, pw);
    setBusy(false);
    if (r.ok) { onLogin(r.user, { keep }); return; }
    if (r.code === 'wrong') setError(`아이디 또는 비밀번호가 맞지 않아요. (${r.max}번 중 ${r.count}번 틀림)`);
    if (r.code === 'locked') setError(`여러 번 틀려서 잠시 잠갔어요. ${r.seconds}초 뒤에 다시 시도해 주세요.`);
    if (r.code === 'pending') setError('행정실 승인을 기다리고 있어요. 승인되면 로그인할 수 있어요.');
  };

  return (
    <Screen padTop={false} padBottom={false} bg="transparent">
      {/* 위: 그라데이션 소개 영역 */}
      {/* 가운데 정렬: 작은 로고 줄 → 큰 창문(주인공) → 제목 */}
      <View style={[s.hero, { paddingTop: insets.top + 18 }]}>
        <Gradient colors={GRAD.hero[5]} glow={0.25} />
        <Pressable
          onLongPress={() => { setId(DEMO_ACCOUNT.id); setPw(DEMO_ACCOUNT.pw); setError(null); }} delayLongPress={600}
          accessibilityRole="image" accessibilityLabel="AirClass 로고" style={s.brand}
        >
          <Wind size={22} color="#fff" strokeWidth={2.4} />
          <T w={800} size={18} color="#fff">AirClass</T>
        </Pressable>
        <View style={s.window} pointerEvents="none"><AnimatedWindow size={150} /></View>
        <FadeIn delay={80} style={s.titleBox}>
          <RotatingTitle />
        </FadeIn>
      </View>

      {/* 아래: 흰 시트 */}
      <View style={s.sheetWrap}>
      <FadeIn delay={140} from={24} style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        {notice ? <View style={s.noticeBox}><T size={13} color={C.okText}>{notice}</T></View> : null}
        <Field icon={User} placeholder="아이디" value={id} onChangeText={(t) => { setId(t); setError(null); }} returnKeyType="next" textContentType="username" />
        <Field
          icon={Lock} placeholder="비밀번호" value={pw} secure style={{ marginTop: 10 }}
          onChangeText={(t) => { setPw(t); setError(null); }} onSubmitEditing={submit} returnKeyType="go" textContentType="password"
          state={error ? 'err' : null} help={error}
        />
        <CheckRow on={keep} onPress={() => setKeep((v) => !v)} label="로그인 상태 유지" style={{ marginTop: 12 }} />
        <Btn title="로그인" variant="grad" onPress={submit} loading={busy} style={{ marginTop: 20 }} />
        <View style={s.links}>
          <Pressable onPress={() => nav.push('find')} hitSlop={8} accessibilityRole="link">
            <T w={600} size={13.5} color={C.textSub}>아이디·비밀번호 찾기</T>
          </Pressable>
          <View style={s.sep} />
          <Pressable onPress={() => nav.push('signup')} hitSlop={8} accessibilityRole="link">
            <T w={700} size={13.5} color={C.primaryDeep}>회원가입</T>
          </Pressable>
        </View>
      </FadeIn>
      </View>
    </Screen>
  );
}

// 제목 두 줄: 첫 줄 '교실 공기'는 고정, 둘째 줄은 서비스 소개 문구가 차례로 바뀜 (K-5)
// 바뀔 때는 이전 문구가 위로 사라지고 새 문구가 아래에서 올라옴 (SwapText)
const TAGLINES = ['AirClass가 챙길게요', '환기할 때를 알려 드려요', '버튼 하나로 창문 열기', '궁금하면 AirChat에 물어보세요'];
const TAGLINE_MS = Math.round(2000 * TEMPO); // 문구 하나가 보이는 시간 (약 2.8초)

function RotatingTitle() {
  const [i, setI] = useState(0);
  // 가장 긴 문구(14자)가 화면 폭에 한 줄로 들어가는 글자 크기 (최대 27). 393 폭 → 24, 375 폭 → 23
  const { width } = useWindowDimensions();
  const size = Math.min(27, Math.floor((width - 44) / 14.2));
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % TAGLINES.length), TAGLINE_MS);
    return () => clearInterval(id);
  }, []);
  return (
    // 화면 읽기 기능에는 바뀌는 문구 대신 대표 문장 하나만 읽어 줌
    <View accessible accessibilityRole="header" accessibilityLabel="교실 공기, AirClass가 챙길게요">
      <T w={800} size={size} color="#fff" style={[s.title, { lineHeight: size + 9 }]}>교실 공기</T>
      <SwapText w={800} size={size} color="#fff" style={[s.title, { lineHeight: size + 9 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
        {TAGLINES[i]}
      </SwapText>
    </View>
  );
}

// 창문 애니메이션 (W-1)
// t: 0~1 한 주기(4초). 0~0.3 열림 → 0.3~0.7 바람이 들어옴 → 0.7~1 닫힘
// SVG 모양(path)이 매 순간 바뀌어서 화면 갱신(requestAnimationFrame)으로 그림. '동작 줄이기'면 닫힌 창만 보여 줌.
const PERIOD = 4000;
const W = (a) => `rgba(255,255,255,${a})`;
const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - ((-2 * x + 2) ** 2) / 2);

function useLoopTime(active) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    let raf;
    const start = Date.now();
    const tick = () => { setT(((Date.now() - start) % PERIOD) / PERIOD); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return t;
}

function AnimatedWindow({ size = 124 }) {
  const reduced = useReducedMotion();
  const t = useLoopTime(!reduced);
  const open = reduced ? 0 : t < 0.3 ? easeInOut(t / 0.3) : t < 0.7 ? 1 : 1 - easeInOut((t - 0.7) / 0.3);
  // 창 한 짝: 바깥쪽 경첩은 고정, 안쪽 끝이 좁아지며(원근) 열리는 것처럼 보임
  const w = 38 * (1 - 0.75 * open);
  const k = 8 * open;
  const left = `M32 22 L${32 + w} ${22 + k} L${32 + w} ${106 - k} L32 106 Z`;
  const right = `M108 22 L${108 - w} ${22 + k} L${108 - w} ${106 - k} L108 106 Z`;
  // 열려 있는 동안 바람 줄 3개가 왼쪽→오른쪽으로 흘러감
  const gusts = open > 0.2 ? [0, 1, 2].map((i) => {
    const p = (t * 3 + i / 3) % 1;
    const x = 40 + p * 60;
    return { d: `M${x - 14} ${50 + i * 14} q7 -5 14 0 t14 0`, op: Math.sin(p * Math.PI) * open * 0.9 }; // 줄 3개는 순서가 고정이라 index를 key로 씀
  }) : [];
  return (
    <Svg width={size} height={size} viewBox="0 0 140 140" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Rect x="32" y="22" width="76" height="84" rx="6" stroke={W(0.35)} strokeWidth={4} fill={W(0.06)} />
      <Path d="M24 112h92" stroke={W(0.55)} strokeWidth={5} strokeLinecap="round" />
      <Path d={left} stroke={W(0.85)} strokeWidth={4.5} fill={W(0.12)} strokeLinejoin="round" />
      <Path d={right} stroke={W(0.85)} strokeWidth={4.5} fill={W(0.12)} strokeLinejoin="round" />
      {gusts.map((g, i) => <Path key={i} d={g.d} stroke={W(g.op.toFixed(2))} strokeWidth={4} fill="none" strokeLinecap="round" />)}
    </Svg>
  );
}

const s = StyleSheet.create({
  hero: { paddingHorizontal: 22, paddingBottom: 66, overflow: 'hidden', alignItems: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleBox: { alignSelf: 'stretch', marginTop: 4 },
  title: { lineHeight: 36, textAlign: 'center' },
  window: { marginTop: 8 },
  // 흰 바탕은 바깥(sheetWrap)에: 안쪽 내용이 서서히 나타나는 동안에도 뒤의 홈이 비치지 않게
  sheetWrap: { flex: 1, marginTop: -36, backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  sheet: { flex: 1, paddingHorizontal: 20, paddingTop: 28 },
  noticeBox: { backgroundColor: C.okBg, borderRadius: 12, padding: 12, marginBottom: 14 },
  links: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 22 },
  sep: { width: 1, height: 11, backgroundColor: '#d5ddf0', marginHorizontal: 14 },
});
