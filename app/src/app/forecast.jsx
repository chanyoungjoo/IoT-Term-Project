// 기록 탭 (오늘의 공기 기록)
// - 실내 CO₂ / 실내 PM2.5 / 실외 PM2.5 하루 추세 (기준선 점선, 기준 넘은 구간은 선 색이 바뀜)
// - CO₂ 그래프에는 창문 열림(청록), 실내 PM2.5 그래프에는 공기청정기 가동(보라) 기간을 칠하고 위에 지속 시간 표시
// - 그래프 3개는 카드 하나에서 좌우로 넘겨 봄. 카드 위 이름 탭으로 지금 장을 표시하고 눌러서도 이동
// - 아래 '환기·공기청정 기록': 사건마다 한 줄 요약(제목·시각·결과), 누르면 단계가 펼쳐짐
// (파일 이름은 기존 라우트(/forecast)를 유지하려고 그대로 둔다)
import { useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { ClipPath, Defs, G, Circle, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { Bell, Check, ChevronDown, ChevronRight } from 'lucide-react-native';
import { PurifierIcon } from '../PurifierIcon';
import { WindowIcon } from '../WindowCard';
import { MaskIcon } from '../MaskIcon';
import { useAppState } from '../store';
import { C, FONT } from '../theme';
import { useScrollTop } from '../useScrollTop';
import { T, Card, Header } from '../ui';
import { FadeIn, PressScale } from '../motion';
import { CountText } from '../textMotion';
import {
  buildEpisodes, buildPeriods, duration, getTrend, hm, minutesOver, CO2_LIMIT, PM_IN_LIMIT, PM_LIMIT,
} from '../history';

// 동작 종류별 색과 아이콘
const KIND = {
  alert: { fg: C.warn, bg: C.warnBg, Icon: ({ size, color }) => <Bell size={size} color={color} strokeWidth={2.2} /> },
  open: { fg: C.window, bg: C.windowBg, Icon: ({ size, color }) => <WindowIcon open size={size} color={color} /> },
  close: { fg: C.textSub, bg: '#eef1f7', Icon: ({ size, color }) => <WindowIcon open={false} size={size} color={color} /> },
  purOn: { fg: C.purifier, bg: C.purifierBg, Icon: ({ size, color }) => <PurifierIcon size={size} color={color} strokeWidth={2.2} /> },
  purOff: { fg: C.textSub, bg: '#eef1f7', Icon: ({ size, color }) => <PurifierIcon size={size} color={color} strokeWidth={2.2} /> },
  dust: { fg: C.badText, bg: C.badBg, Icon: ({ size, color }) => <MaskIcon size={size} color={color} strokeWidth={2.2} /> },
};
const PERIOD = { window: { fg: C.window, label: '창문 열림' }, purifier: { fg: C.purifier, label: '공기청정기 가동' } };

// lucide Bell 모양을 그래프 안에 직접 그리기 위한 경로
const BELL = ['M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9', 'M10.3 21a1.94 1.94 0 0 0 3.4 0'];

export default function Trend() {
  const scrollRef = useScrollTop(); // 탭에 들어올 때 항상 맨 위부터
  const insets = useSafeAreaInsets();
  const { roomId } = useAppState();
  const day = getTrend(roomId);
  const periods = buildPeriods(day.events, day.end);
  const episodes = buildEpisodes(day.events, { co2At: day.co2At, pmInAt: day.pmInAt }).reverse(); // 최근 사건이 위로
  const alerts = day.events.filter((e) => e.kind === 'alert');
  const co2Now = day.co2[day.co2.length - 1].v;
  const pmInNow = day.pmIn[day.pmIn.length - 1].v;
  const pmNow = day.pm[day.pm.length - 1].v;
  const windows = periods.filter((p) => p.kind === 'window');
  const purifiers = periods.filter((p) => p.kind === 'purifier');
  const over = minutesOver(day.co2, CO2_LIMIT);

  return (
    <ScrollView ref={scrollRef} bounces={false} overScrollMode="never" style={{ backgroundColor: C.bg }} contentContainerStyle={[s.page, { paddingTop: insets.top }]}>
      <Header />
      <T w={800} size={26} accessibilityRole="header" style={{ marginTop: 8 }}>오늘의 공기 기록</T>

      {/* 그래프 3장: 좌우로 넘겨 보기 */}
      <FadeIn delay={60}>
        <ChartPager pages={[
          {
            key: 'co2', name: '실내 CO₂',
            head: <NowRow value={co2Now.toLocaleString()} unit="ppm" chip={co2Now >= CO2_LIMIT ? '기준 초과' : null} />,
            chart: (
              <TrendChart
                id="co2" data={day.co2} start={day.start} end={day.end} min={400} max={1400} limit={CO2_LIMIT}
                color={C.primary} over={C.warn} height={160} periods={windows} alerts={alerts}
                label={`실내 CO₂ 추세. 지금 ${co2Now}ppm, 오늘 기준 ${CO2_LIMIT} 초과 ${duration(over)}`}
              />
            ),
            legend: <><Swatch kind="window" /><View style={s.legendItem}><Bell size={12} color={C.warn} strokeWidth={2.4} /><T size={12} color={C.textSub}>환기 알림</T></View></>,
          },
          {
            key: 'pmIn', name: '실내 PM2.5',
            head: <NowRow value={pmInNow} unit="㎍/㎥" chip={pmInNow >= PM_IN_LIMIT ? '기준 초과' : null} />,
            chart: (
              <TrendChart
                id="pmIn" data={day.pmIn} start={day.start} end={day.end} min={0} max={60} limit={PM_IN_LIMIT}
                color={C.navy} over={C.bad} height={160} periods={purifiers}
                label={`실내 PM2.5 추세. 지금 ${pmInNow}, 기준 ${PM_IN_LIMIT}`}
              />
            ),
            legend: <Swatch kind="purifier" />,
          },
          {
            key: 'pm', name: '실외 PM2.5',
            head: <NowRow value={pmNow} unit="㎍/㎥" chip={pmNow >= PM_LIMIT ? '나쁨' : null} />,
            chart: (
              <TrendChart
                id="pm" data={day.pm} start={day.start} end={day.end} min={0} max={60} limit={PM_LIMIT}
                color="#8a94ad" over={C.bad} height={160}
                label={`실외 PM2.5 추세. 지금 ${pmNow}, 나쁨 기준 ${PM_LIMIT}`}
              />
            ),
            legend: <T size={12} color={C.textSub}>바깥이 나쁘면 창문 대신 공기청정기를 써요</T>,
          },
        ]} />
      </FadeIn>

      {/* 사건 카드 */}
      <View style={[s.rowBetween, { marginTop: 22, marginBottom: 2 }]}>
        <T w={700} size={17}>환기·공기청정 기록</T>
        <T size={12} color={C.textSub}>{episodes.length}건</T>
      </View>
      {episodes.length === 0 && (
        <Card style={{ marginTop: 10 }}><T color={C.textSub}>오늘은 환기·공기청정 기록이 없어요.</T></Card>
      )}
      {episodes.length > 0 && (
        <FadeIn delay={160}><Card style={{ marginTop: 10, paddingVertical: 2 }}>
          {episodes.map((ep, i) => <Episode key={ep.id} ep={ep} first={i === 0} />)}
        </Card></FadeIn>
      )}
    </ScrollView>
  );
}

// 범례 한 칸: 기간 색 네모 + 이름
function Swatch({ kind }) {
  const p = PERIOD[kind];
  return (
    <View style={s.legendItem}>
      <View style={[s.swatch, { borderColor: p.fg, backgroundColor: p.fg + '22' }]} />
      <T size={12} color={C.textSub}>{p.label}</T>
    </View>
  );
}

// 카드 머리: 이름 · 현재 값 + 단위 · (문제일 때만) 칩
function NowRow({ label, value, unit, chip }) {
  return (
    <View style={s.rowBetween}>
      <View>
        {label ? <T size={12} color={C.textSub}>{label}</T> : null}
        <View style={s.valueRow}>
          <CountText w={800} size={28} value={value} />
          <T size={13} color={C.textSub} style={{ marginLeft: 3 }}>{unit}</T>
        </View>
      </View>
      {chip ? <View style={s.chip}><T w={700} size={12} color={C.warnText}>{chip}</T></View> : null}
    </View>
  );
}

// 그래프 카드 한 장을 좌우로 넘겨 보는 묶음.
// - 카드 위 이름 탭: 지금 보는 그래프 글자색 + 밑줄, 눌러서 이동
// - 밑줄은 스크롤 위치를 그대로 따라 미끄러짐 (손으로 넘기든 탭을 누르든 같은 움직임)
// - 탭 글자 굵기는 모두 같게 둬서, 선택이 바뀌어도 탭 폭이 변하지 않음
function ChartPager({ pages }) {
  const [w, setW] = useState(0);
  const [index, setIndex] = useState(0);
  const [tabs, setTabs] = useState({}); // 탭별 { x, width }
  const scrollX = useRef(new Animated.Value(0)).current;
  const ref = useRef(null);
  const indexRef = useRef(0);
  const target = useRef(null); // 탭을 눌러 이동 중인 목적지 (지나가는 장에서 선택이 깜빡이지 않게)

  const select = (n) => { indexRef.current = n; setIndex(n); };
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
    useNativeDriver: true,
    listener: (e) => {
      if (!w) return;
      const x = e.nativeEvent.contentOffset.x;
      if (target.current != null) {
        if (Math.abs(x - target.current * w) > 2) return; // 아직 이동 중
        target.current = null;
      }
      const n = Math.round(x / w);
      if (n !== indexRef.current) select(n);
    },
  });
  const go = (n) => {
    if (n === indexRef.current) return;
    target.current = n;
    select(n);
    ref.current?.scrollTo({ x: n * w, animated: true });
  };

  // 밑줄: 폭 100짜리 막대를 탭 위치로 옮기고 탭 폭만큼 늘림 (네이티브 애니메이션 가능한 transform만 사용)
  const ready = w > 0 && pages.every((p) => tabs[p.key]);
  const indicator = ready && {
    transform: [
      { translateX: scrollX.interpolate({ inputRange: pages.map((_, i) => i * w), outputRange: pages.map((p) => tabs[p.key].x + tabs[p.key].width / 2 - 50), extrapolate: 'clamp' }) },
      { scaleX: scrollX.interpolate({ inputRange: pages.map((_, i) => i * w), outputRange: pages.map((p) => tabs[p.key].width / 100), extrapolate: 'clamp' }) },
    ],
  };

  return (
    <Card style={{ marginTop: 14, paddingHorizontal: 0, paddingTop: 6, paddingBottom: 14 }}>
      <View style={s.tabs} accessibilityRole="tablist">
        {pages.map((p, i) => {
          const on = i === index;
          return (
            <Pressable
              key={p.key} onPress={() => go(i)} hitSlop={6} style={s.tab}
              onLayout={(e) => { const { x, width } = e.nativeEvent.layout; setTabs((t) => ({ ...t, [p.key]: { x, width } })); }}
              accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={`${p.name} 그래프`}
            >
              <T w={700} size={14.5} color={on ? C.text : '#9aa3b8'}>{p.name}</T>
            </Pressable>
          );
        })}
        {ready && <Animated.View pointerEvents="none" style={[s.tabBar, indicator]} />}
      </View>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {w > 0 && (
          <Animated.ScrollView
            ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            onScroll={onScroll} scrollEventThrottle={16}
          >
            {pages.map((p) => (
              <View key={p.key} style={{ width: w, paddingHorizontal: 16 }}>
                {p.head}
                {p.chart}
                <View style={s.legend}>{p.legend}</View>
              </View>
            ))}
          </Animated.ScrollView>
        )}
      </View>
    </Card>
  );
}

// axis=false면 아래 시간 축을 숨김 (한 카드에 쌓을 때 맨 아래 그래프만 축 표시)
function TrendChart({ id, data, start, end, min, max, limit, color, over, height, axis = true, periods = [], alerts = [], label }) {
  const [W, setW] = useState(0);
  const hasPeriods = periods.length > 0;
  const P = { l: 34, r: 6, t: hasPeriods ? 22 : 10, b: axis ? 20 : 4 };
  const iw = Math.max(1, W - P.l - P.r);
  const ih = height - P.t - P.b;
  const x = (m) => P.l + (iw * (m - start)) / (end - start);
  const y = (v) => P.t + ih * (1 - (Math.min(max, Math.max(min, v)) - min) / (max - min));
  const valueAt = (m) => { // 이벤트 시각의 값 (10분 간격 사이는 직선 보간)
    const i = data.findIndex((p) => p.m >= m);
    if (i <= 0) return data[Math.max(0, i)].v;
    const a = data[i - 1], b = data[i];
    return a.v + ((b.v - a.v) * (m - a.m)) / (b.m - a.m);
  };
  const line = data.map((p, i) => `${i ? 'L' : 'M'}${x(p.m).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(end)} ${y(min)} L${x(start)} ${y(min)} Z`;
  const last = data[data.length - 1];
  const ticks = [start, 660, 780, end].filter((m) => m >= start && m <= end);

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height, marginTop: 6 }} accessible accessibilityLabel={label}>
      {W > 0 && (
        <Svg width={W} height={height}>
          <Defs>
            {/* 기준선 위쪽만 보이게 잘라서 초과 구간을 다른 색으로 덧그림 */}
            <ClipPath id={`over-${id}`}><Rect x={0} y={0} width={W} height={y(limit)} /></ClipPath>
            <LinearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={hasPeriods ? 0.08 : 0.16} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {/* 동작 기간 음영 + 위에 지속 시간 */}
          {periods.map((p) => (
            <G key={`${p.kind}-${p.a}`}>
              <Rect x={x(p.a)} y={P.t} width={Math.max(2, x(p.b) - x(p.a))} height={y(min) - P.t} fill={PERIOD[p.kind].fg} opacity={0.13} />
              <SvgText x={(x(p.a) + x(p.b)) / 2} y={P.t - 6} fontSize={10.5} fill={PERIOD[p.kind].fg} textAnchor="middle" fontFamily={FONT[700]}>
                {duration(p.b - p.a)}
              </SvgText>
            </G>
          ))}

          {/* 축 눈금 값 */}
          {[min, limit, max].map((v) => (
            <SvgText key={v} x={P.l - 6} y={y(v) + 3.5} fontSize={10} fill="#9aa3b8" textAnchor="end" fontFamily={FONT[500]}>
              {v.toLocaleString()}
            </SvgText>
          ))}
          <Line x1={P.l} x2={W - P.r} y1={y(min)} y2={y(min)} stroke={C.border} />

          {/* 값 선: 기본색 → 기준 초과 부분만 경고색으로 덧그림 */}
          <Path d={area} fill={`url(#fill-${id})`} />
          <Path d={line} fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" />
          <Path d={line} fill="none" stroke={over} strokeWidth={2.2} strokeLinejoin="round" clipPath={`url(#over-${id})`} />

          {/* 기준선 */}
          <Line x1={P.l} x2={W - P.r} y1={y(limit)} y2={y(limit)} stroke={over} strokeDasharray="4 4" />

          {/* 환기 알림: 선 위에 종 */}
          {alerts.map((a) => {
            const cx = x(a.m), cy = y(valueAt(a.m));
            return (
              <G key={a.id}>
                <Circle cx={cx} cy={cy} r={10} fill="#fff" stroke={C.warn} strokeWidth={1.8} />
                <G transform={`translate(${cx - 6} ${cy - 6}) scale(0.5)`}>
                  {BELL.map((d) => <Path key={d} d={d} fill="none" stroke={C.warn} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />)}
                </G>
              </G>
            );
          })}

          {/* 마지막 값 */}
          <Circle cx={x(last.m)} cy={y(last.v)} r={3.8} fill="#fff" stroke={last.v >= limit ? over : color} strokeWidth={2.2} />

          {/* 시간 축 */}
          {axis && ticks.map((m, i) => (
            <SvgText key={m} x={x(m)} y={height - 5} fontSize={10} fill="#9aa3b8" fontFamily={FONT[500]}
              textAnchor={i === 0 ? 'start' : i === ticks.length - 1 ? 'end' : 'middle'}>
              {hm(m)}
            </SvgText>
          ))}
        </Svg>
      )}
    </View>
  );
}

// 사건 한 줄: 시작 아이콘 · 제목 · 시작 시각 · 결과. 누르면 단계(아이콘·제목·설명·시각)가 펼쳐짐
function Episode({ ep, first }) {
  const [open, setOpen] = useState(false);
  const head = KIND[ep.steps[0].kind];
  const result = ep.done
    ? `${ep.metric} ${ep.from.toLocaleString()} → ${ep.to.toLocaleString()} ${ep.unit} · ${duration(ep.minutes)}`
    : '대응 중';
  return (
    <View style={!first && s.divider}>
      <PressScale
        scaleTo={0.98} onPress={() => setOpen((v) => !v)} style={s.epRow}
        accessibilityRole="button" accessibilityState={{ expanded: open }}
        accessibilityLabel={`${hm(ep.start)} ${ep.title}. ${result}`} accessibilityHint="눌러서 단계를 펼치거나 접어요"
      >
        <View style={[s.epIcon, { backgroundColor: head.bg }]}><head.Icon size={17} color={head.fg} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={s.rowBetween}>
            <T w={700} size={14.5} numberOfLines={1} style={{ flex: 1 }}>{ep.title}</T>
            <T size={12} color={C.textSub}>{hm(ep.start)}</T>
          </View>
          <View style={[s.valueRow, { alignItems: 'center', gap: 4, marginTop: 2 }]}>
            {ep.done && <Check size={12} color={C.okText} strokeWidth={2.8} />}
            <T w={700} size={12.5} color={ep.done ? C.okText : C.warnText} numberOfLines={1}>{result}</T>
          </View>
        </View>
        {open ? <ChevronDown size={18} color="#9aa3b8" /> : <ChevronRight size={18} color="#9aa3b8" />}
      </PressScale>

      {open && (
        <FadeIn from={-4} duration={250} style={s.steps}>
          {ep.steps.map((st, i) => {
            const k = KIND[st.kind];
            const lastStep = i === ep.steps.length - 1;
            return (
              <View key={st.id} style={s.step} accessible accessibilityLabel={`${hm(st.m)} ${st.title}. ${st.desc ?? ''}`}>
                {!lastStep && <View style={s.stepLine} />}
                <View style={[s.stepIcon, { backgroundColor: k.bg }]}><k.Icon size={14} color={k.fg} /></View>
                <View style={{ flex: 1 }}>
                  <View style={s.rowBetween}>
                    <T w={700} size={13.5}>{st.title}</T>
                    <T size={12} color={C.textSub}>{hm(st.m)}</T>
                  </View>
                  {st.kind !== 'close' && st.desc ? <T size={12.5} color={C.textSub} style={{ marginTop: 1 }}>{st.desc}</T> : null}
                </View>
              </View>
            );
          })}
        </FadeIn>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  page: { paddingHorizontal: 16, paddingBottom: 120 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline' },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: C.warnBg },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8, minHeight: 18, alignItems: 'center' },
  tabs: { flexDirection: 'row', gap: 18, paddingHorizontal: 16, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  tab: { paddingTop: 8, paddingBottom: 10 },
  tabBar: { position: 'absolute', left: 0, bottom: -1, width: 100, height: 2.5, borderRadius: 2, backgroundColor: C.primary },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 14, height: 10, borderRadius: 3, borderWidth: 1.5 },
  divider: { borderTopWidth: 1, borderTopColor: C.border },
  epRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  epIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  steps: { paddingLeft: 44, paddingBottom: 10 },
  step: { flexDirection: 'row', gap: 10, paddingVertical: 5 },
  stepLine: { position: 'absolute', left: 12, top: 31, bottom: -5, width: 2, backgroundColor: C.border },
  stepIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
