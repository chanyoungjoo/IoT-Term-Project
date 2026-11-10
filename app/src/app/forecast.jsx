import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { G, Rect, Line, Text as SvgText } from 'react-native-svg';
import { Info, Fan, Bell } from 'lucide-react-native';
import { THRESHOLDS } from '../../../shared/rules';
import { controlLog, currentTeacher, getRoom, outdoor, school } from '../api';
import { C, FONT } from '../theme';
import { T, Card, Header } from '../ui';
import { FadeIn, useAnimatedTo } from '../motion';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedText = Animated.createAnimatedComponent(SvgText);

const W = 320;
const H = 200;
const PAD = 24;

export default function Forecast() {
  const insets = useSafeAreaInsets();
  const bars = [{ x: '지금', v: outdoor.now, now: true }, ...outdoor.forecast.map((v, i) => ({ x: `+${i + 1}h`, v }))];
  const max = Math.max(...bars.map((b) => b.v), THRESHOLDS.outdoorPm25Bad) * 1.15;
  const y = (v) => H - PAD - (v / max) * (H - PAD * 2);
  const slot = W / bars.length;
  const myLog = controlLog.filter((l) => currentTeacher.roomIds.includes(l.roomId));

  return (
    <ScrollView bounces={false} overScrollMode="never" style={{ backgroundColor: C.bg }} contentContainerStyle={[s.page, { paddingTop: insets.top }]}>
      <Header />
      <T size={14} color={C.textSub} style={{ marginTop: 8 }}>{school.name} 주변 실외</T>
      <T w={800} size={26} accessibilityRole="header">예측과 알림</T>

      <FadeIn delay={40} style={s.future}>
        <Info size={18} color={C.primaryDeep} />
        <T size={14} color={C.primaryDeep} style={{ flex: 1, lineHeight: 20 }}>
          실외 미세먼지 예측과 사전 환기 알림은 향후 확장 기능이에요. 아래 막대는 예시 값이에요.
        </T>
      </FadeIn>

      <FadeIn delay={100}><Card style={{ marginTop: 12 }}>
        <View style={s.rowBetween}>
          <T w={700} size={17}>시간대별 실외 PM2.5</T>
          <T size={12} color={C.textSub}>㎍/㎥</T>
        </View>
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}
          accessibilityLabel={`지금 ${outdoor.now}, 5시간 예시 값 ${outdoor.forecast.join(', ')}. 나쁨 기준 ${THRESHOLDS.outdoorPm25Bad}`}>
          <Line x1={0} x2={W} y1={y(THRESHOLDS.outdoorPm25Bad)} y2={y(THRESHOLDS.outdoorPm25Bad)} stroke={C.bad} strokeDasharray="4 4" />
          <SvgText x={W} y={y(THRESHOLDS.outdoorPm25Bad) - 5} fontSize={11} fill={C.badText} textAnchor="end" fontFamily={FONT[700]}>
            나쁨 {THRESHOLDS.outdoorPm25Bad}
          </SvgText>
          {bars.map((b, i) => <Bar key={b.x} bar={b} i={i} cx={slot * i + slot / 2} top={y(b.v)} />)}
        </Svg>
        <View style={s.legend}>
          {[[C.primary, '지금'], [C.primaryLight, '보통 예측'], [C.warn, '나쁨 예측']].map(([c, l]) => (
            <View key={l} style={s.legendItem}>
              <View style={[s.swatch, { backgroundColor: c }]} />
              <T size={12} color={C.textSub}>{l}</T>
            </View>
          ))}
        </View>
      </Card></FadeIn>

      <T w={700} size={17} style={{ marginTop: 20, marginBottom: 8 }}>내 교실 알림</T>
      <Card style={{ paddingVertical: 4 }}>
        {myLog.map((l, i) => {
          const Icon = l.device === '환기 알림' ? Bell : Fan;
          return (
            <FadeIn key={l.id} delay={200 + i * 70} style={[s.item, i < myLog.length - 1 && s.divider]}>
              <View style={s.itemIcon}><Icon size={18} color={C.primary} /></View>
              <View style={{ flex: 1 }}>
                <View style={s.rowBetween}>
                  <T w={700} size={15}>{getRoom(l.roomId).name} {l.device}</T>
                  <T size={12} color={C.textSub}>{l.time}</T>
                </View>
                <T size={14} color={C.textSub} style={{ lineHeight: 20 }}>
                  {l.action}{l.rule ? ` (규칙 ${l.rule})` : l.who ? ` (${l.who})` : ''}
                </T>
              </View>
            </FadeIn>
          );
        })}
      </Card>
    </ScrollView>
  );
}

// 막대가 바닥에서 차례로 자라 오름
function Bar({ bar, i, cx, top }) {
  const p = useAnimatedTo(1, { from: 0, delay: 250 + i * 90, duration: 650 });
  const base = H - PAD;
  const bad = bar.v >= THRESHOLDS.outdoorPm25Bad;
  const color = bar.now ? C.primary : bad ? C.warn : C.primaryLight;
  return (
    <G>
      <AnimatedRect
        x={cx - 15} width={30} rx={7} fill={color}
        y={p.interpolate({ inputRange: [0, 1], outputRange: [base, top] })}
        height={p.interpolate({ inputRange: [0, 1], outputRange: [0, base - top] })}
      />
      <AnimatedText x={cx} y={top - 6} opacity={p} fontSize={13} fill={bad ? C.warnText : C.text} textAnchor="middle" fontFamily={FONT[700]}>{bar.v}</AnimatedText>
      <SvgText x={cx} y={H - 6} fontSize={12} fill={bar.now ? C.text : C.textSub} textAnchor="middle" fontFamily={FONT[bar.now ? 700 : 500]}>{bar.x}</SvgText>
    </G>
  );
}

const s = StyleSheet.create({
  page: { paddingHorizontal: 16, paddingBottom: 120 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  future: { flexDirection: 'row', gap: 8, marginTop: 16, padding: 14, borderRadius: 16, backgroundColor: C.primarySoft },
  legend: { flexDirection: 'row', gap: 14, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  item: { flexDirection: 'row', gap: 12, paddingVertical: 14 },
  itemIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  divider: { borderBottomWidth: 1, borderBottomColor: C.border },
});
