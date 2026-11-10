import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { getPurifier, getRoom, SPEEDS } from '../api';
import { useAppState } from '../store';
import { C } from '../theme';
import { T, Card, Header, Segmented, Switch } from '../ui';
import { FadeIn, useAnimatedTo } from '../motion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const R = 84;
const LEN = 2 * Math.PI * R;

export default function Control() {
  const insets = useSafeAreaInsets();
  const { roomId, edits, setEdits } = useAppState();
  const room = getRoom(roomId);
  const base = getPurifier(roomId);
  const p = { notify: true, keepClosed: true, ...base, ...edits[roomId] };
  const set = (patch) => setEdits((e) => ({ ...e, [roomId]: { ...e[roomId], ...patch } }));
  const fraction = p.power ? (p.speed + 1) / SPEEDS.length : 0;
  // 게이지 호가 새 풍량까지 스프링처럼 감기거나 풀림
  const offset = useAnimatedTo(LEN * (1 - fraction), { from: LEN, spring: true });

  return (
    <ScrollView bounces={false} overScrollMode="never" style={{ backgroundColor: C.bg }} contentContainerStyle={[s.page, { paddingTop: insets.top }]}>
      <Header />
      <T size={14} color={C.textSub} style={{ marginTop: 8 }}>{room.name}</T>
      <T w={800} size={26} accessibilityRole="header">장치 제어</T>

      <FadeIn delay={60}><Card style={{ marginTop: 16 }}>
        <View style={s.rowBetween}>
          <View style={{ flex: 1 }}>
            <T w={700} size={18}>공기청정기</T>
            <T size={13} color={C.textSub}>
              {!p.online ? '연결이 끊겼어요' : p.power ? (p.mode === 'auto' ? '자동 제어로 가동 중' : '수동으로 가동 중') : '꺼져 있어요'}
            </T>
          </View>
          {/* 전원을 직접 바꾸면 수동 모드가 된다 (자동 규칙이 덮어쓰지 않게) */}
          <Switch label="공기청정기 전원" value={p.online && p.power} disabled={!p.online}
            onValueChange={(v) => set({ power: v, mode: 'manual' })} />
        </View>

        <View style={s.gauge} accessible accessibilityLabel={p.power ? `가동 중, 풍량 ${SPEEDS[p.speed]}` : '꺼짐'}>
          <Svg width={2 * R + 24} height={2 * R + 24}>
            <Circle cx={R + 12} cy={R + 12} r={R} stroke="#eef1f7" strokeWidth={16} fill="none" />
            <AnimatedCircle
              cx={R + 12} cy={R + 12} r={R} stroke={C.primary} strokeWidth={16} fill="none" strokeLinecap="round"
              strokeDasharray={`${LEN} ${LEN}`} strokeDashoffset={offset} transform={`rotate(-90 ${R + 12} ${R + 12})`}
              opacity={p.power ? 1 : 0}
            />
          </Svg>
          <FadeIn key={`${p.power}-${p.speed}`} from={6} scaleFrom={0.85} style={s.gaugeText}>
            <T w={600} size={14} color={p.power ? C.primaryDeep : C.textSub}>{p.power ? '가동 중' : '꺼짐'}</T>
            <T w={800} size={40}>{p.power ? SPEEDS[p.speed] : '-'}</T>
            <T size={13} color={C.textSub}>{p.power ? `풍량 ${p.speed + 1}단계` : '전원을 켜 주세요'}</T>
          </FadeIn>
        </View>

        <Segmented label="풍량" value={p.power ? p.speed : -1}
          onChange={(v) => p.online && set({ speed: v, power: true, mode: 'manual' })}
          options={SPEEDS.map((label, i) => ({ value: i, label }))} />
      </Card></FadeIn>

      <FadeIn delay={140}><Card style={{ marginTop: 12, paddingVertical: 4 }}>
        <ToggleRow title="자동 제어 모드" desc="수치에 따라 공기청정기를 알아서 켜고 꺼요"
          value={p.mode === 'auto'} onChange={(v) => set({ mode: v ? 'auto' : 'manual' })} />
        <ToggleRow title="환기 알림 받기" desc="CO₂가 높고 바깥 공기가 괜찮으면 환기하라고 알려 드려요"
          value={p.notify} onChange={(v) => set({ notify: v })} />
        <ToggleRow title="환기 제한 알림 받기" desc="바깥 미세먼지가 나쁠 때 창문을 닫아 두라고 알려 드려요"
          value={p.keepClosed} onChange={(v) => set({ keepClosed: v })} last />
      </Card></FadeIn>
    </ScrollView>
  );
}

function ToggleRow({ title, desc, value, onChange, last }) {
  return (
    <View style={[s.rowBetween, s.toggle, !last && s.divider]}>
      <View style={{ flex: 1 }}>
        <T w={700} size={16}>{title}</T>
        <T size={13} color={C.textSub} style={{ lineHeight: 19 }}>{desc}</T>
      </View>
      <Switch label={title} value={value} onValueChange={onChange} />
    </View>
  );
}

const s = StyleSheet.create({
  page: { paddingHorizontal: 16, paddingBottom: 120 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gauge: { alignItems: 'center', justifyContent: 'center', marginVertical: 20 },
  gaugeText: { position: 'absolute', alignItems: 'center' },
  toggle: { paddingVertical: 16 },
  divider: { borderBottomWidth: 1, borderBottomColor: C.border },
});
