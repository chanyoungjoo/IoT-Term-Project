// 창문 카드 (반자동 제어): 현재 상태 + Rule 엔진 추천 + 원탭 실행
// 시스템은 추천만 하고, 실제로 여닫는 건 사람이 버튼을 눌러서 한다 (학생 안전).
// compact: 제어 탭처럼 [열기][닫기] 두 버튼으로 보여 줄 때
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Lightbulb } from 'lucide-react-native';
import { C, shadow } from './theme';
import { T } from './ui';
import { FadeIn, PressScale } from './motion';

// 창문 아이콘 (lucide에 창문 모양이 없어 직접 그림)
const ICON = {
  open: 'M3 4h7v16H3zM10 4l8 2v12l-8 2M14 11h1',
  closed: 'M4 3h16v18H4zM12 3v18M4 12h16',
};

export function WindowIcon({ open, color, size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round">
      <Path d={open ? ICON.open : ICON.closed} />
    </Svg>
  );
}

// 추천 종류별 카드 색 (추천 없음 / 열기 추천 / 닫기 추천)
const TONE = {
  calm: {
    card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }, fg: C.text, sub: C.textSub,
    box: C.primarySoft, boxFg: C.primaryDeep, live: C.okBg, liveFg: C.okText, dot: C.ok,
    recBg: C.bg, recFg: C.text, btnBg: C.bg, btnFg: C.primaryDeep,
  },
  open: {
    card: { backgroundColor: C.primaryDeep }, fg: '#fff', sub: 'rgba(255,255,255,0.75)',
    box: 'rgba(255,255,255,0.18)', boxFg: '#fff', live: 'rgba(255,255,255,0.18)', liveFg: '#fff', dot: '#7dffb5',
    recBg: 'rgba(255,255,255,0.14)', recFg: '#fff', btnBg: '#fff', btnFg: C.primaryDeep,
  },
  close: {
    card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, shadowOpacity: 0.16 }, fg: C.text, sub: C.textSub,
    box: C.okBg, boxFg: C.okText, live: C.okBg, liveFg: C.okText, dot: C.ok,
    recBg: C.warnBg, recFg: '#8a4d00', btnBg: C.text, btnFg: '#fff',
  },
};

export default function WindowCard({ open, online = true, rec, onSet, note, compact }) {
  const t = TONE[rec ? rec.action : 'calm'];
  const state = !online ? '연결이 끊겼어요' : open ? '열려 있어요' : '닫혀 있어요';
  const caption = note || (rec ? '누르면 교실 창문이 바로 움직여요' : '지금은 추천이 없어요. 필요하면 직접 여닫을 수 있어요');

  return (
    <View style={[s.card, shadow, t.card]}>
      <View style={s.head}>
        <View style={[s.iconBox, { backgroundColor: t.box }]}>
          <WindowIcon open={open} color={t.boxFg} />
        </View>
        <View style={{ flex: 1 }}>
          <T w={700} size={12} color={t.sub}>창문</T>
          <FadeIn key={String(open)} from={4}>
            <T w={800} size={18} color={t.fg} accessibilityLiveRegion="polite">{state}</T>
          </FadeIn>
        </View>
        <View style={[s.live, { backgroundColor: t.live }]}>
          <View style={[s.liveDot, { backgroundColor: t.dot }]} />
          <T w={800} size={11} color={t.liveFg}>실시간</T>
        </View>
      </View>

      {rec && (
        <FadeIn key={rec.action} from={6}>
          <View style={[s.rec, { backgroundColor: t.recBg }]}>
            <View style={s.recHead}>
              <Lightbulb size={16} color={t.recFg} />
              <T w={800} size={14} color={t.recFg}>{rec.title}</T>
            </View>
            <T size={13} color={t.recFg} style={{ lineHeight: 19, opacity: 0.92 }} lineBreakStrategyIOS="hangul-word">{rec.reason}</T>
          </View>
        </FadeIn>
      )}

      {compact ? (
        <View style={s.pair} accessibilityRole="radiogroup" accessibilityLabel="창문 열기 닫기">
          <PairButton label="열기" on={open} hint={rec?.action === 'open'} disabled={!online} onPress={() => onSet(true)} />
          <PairButton label="닫기" on={!open} hint={rec?.action === 'close'} disabled={!online} onPress={() => onSet(false)} dark />
        </View>
      ) : (
        <PressScale
          onPress={() => onSet(!open)} disabled={!online} style={[s.btn, { backgroundColor: t.btnBg, opacity: online ? 1 : 0.5 }]}
          accessibilityRole="button" accessibilityLabel={open ? '창문 닫기' : '창문 열기'}
        >
          <T w={800} size={16} color={t.btnFg}>{open ? '창문 닫기' : '창문 열기'}</T>
        </PressScale>
      )}
      <T size={12} color={t.sub} style={{ textAlign: 'center' }}>{caption}</T>
    </View>
  );
}

// 제어 탭의 [열기][닫기]: 지금 상태는 채운 버튼, 추천 방향은 파란 테두리
function PairButton({ label, on, hint, disabled, onPress, dark }) {
  const fill = dark ? C.text : C.primaryDeep;
  return (
    <PressScale
      onPress={onPress} disabled={disabled}
      style={[s.pairBtn, on ? { backgroundColor: fill } : { borderWidth: 1.5, borderColor: hint ? C.primaryDeep : '#d5ddf0' }, disabled && { opacity: 0.5 }]}
      accessibilityRole="radio" accessibilityState={{ checked: on, disabled }} accessibilityLabel={`창문 ${label}`}
    >
      <T w={800} size={16} color={on ? '#fff' : hint ? C.primaryDeep : C.text}>{label}</T>
    </PressScale>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 22, padding: 16, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  live: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  rec: { borderRadius: 14, padding: 12, gap: 4 },
  recHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btn: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pair: { flexDirection: 'row', gap: 8 },
  pairBtn: { flex: 1, minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface },
});
