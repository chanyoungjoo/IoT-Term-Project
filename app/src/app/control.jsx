import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fan } from 'lucide-react-native';
import { getPurifier, getRoomView, SPEEDS } from '../api';
import { useAppState } from '../store';
import { C } from '../theme';
import { T, Card, Header, Segmented, Switch } from '../ui';
import { FadeIn } from '../motion';
import WindowCard from '../WindowCard';

export default function Control() {
  const insets = useSafeAreaInsets();
  const { roomId, demo, edits, setEdits, windowEdits, setWindowOpen } = useAppState();
  const v = getRoomView(roomId, demo, windowEdits[roomId]);
  const base = getPurifier(roomId);
  const p = { windowNotify: true, ...base, ...edits[roomId] };
  const set = (patch) => setEdits((e) => ({ ...e, [roomId]: { ...e[roomId], ...patch } }));
  const winNote = windowEdits[roomId] !== undefined
    ? `방금 앱에서 ${windowEdits[roomId] ? '열었어요' : '닫았어요'}`
    : v.isDemo ? null : v.window.lastAction;

  return (
    <ScrollView bounces={false} overScrollMode="never" style={{ backgroundColor: C.bg }} contentContainerStyle={[s.page, { paddingTop: insets.top }]}>
      <Header />
      <T size={14} color={C.textSub} style={{ marginTop: 8 }}>{v.room.name}</T>
      <T w={800} size={26} accessibilityRole="header">장치 제어</T>

      {/* 창문: 추천을 보고 교사가 직접 [열기][닫기] (반자동) */}
      <FadeIn delay={60} style={{ marginTop: 16 }}>
        <WindowCard
          compact open={v.window.open} online={v.window.online} rec={v.windowRec}
          onSet={(open) => setWindowOpen(roomId, open)} note={winNote}
        />
      </FadeIn>

      {/* 공기청정기: 전원 + 풍량 (간단 카드) */}
      <FadeIn delay={120}><Card style={{ marginTop: 12, gap: 14 }}>
        <View style={s.rowBetween}>
          <View style={[s.iconBox, { backgroundColor: p.power ? C.primarySoft : C.bg }]}>
            <Fan size={24} color={p.power ? C.primaryDeep : C.textSub} />
          </View>
          <View style={{ flex: 1 }}>
            <T w={700} size={18}>공기청정기</T>
            <T size={13} color={C.textSub}>
              {!p.online ? '연결이 끊겼어요'
                : p.power ? `${p.mode === 'auto' ? '자동 제어로' : '수동으로'} 가동 중 · 풍량 ${SPEEDS[p.speed]}`
                : '꺼져 있어요'}
            </T>
          </View>
          {/* 전원을 직접 바꾸면 수동 모드가 된다 (자동 규칙이 덮어쓰지 않게) */}
          <Switch label="공기청정기 전원" value={p.online && p.power} disabled={!p.online}
            onValueChange={(on) => set({ power: on, mode: 'manual' })} />
        </View>
        <Segmented label="풍량" value={p.power ? p.speed : -1}
          onChange={(sp) => p.online && set({ speed: sp, power: true, mode: 'manual' })}
          options={SPEEDS.map((label, i) => ({ value: i, label }))} />
      </Card></FadeIn>

      <FadeIn delay={180}><Card style={{ marginTop: 12, paddingVertical: 4 }}>
        <ToggleRow title="공기청정기 자동 제어" desc="실내 미세먼지에 따라 알아서 켜고 꺼요"
          value={p.mode === 'auto'} onChange={(on) => set({ mode: on ? 'auto' : 'manual' })} />
        <ToggleRow title="창문 추천 알림" desc="열거나 닫을 때가 되면 알려 드려요. 실행은 직접 눌러서 해요"
          value={p.windowNotify} onChange={(on) => set({ windowNotify: on })} last />
      </Card></FadeIn>
    </ScrollView>
  );
}

function ToggleRow({ title, desc, value, onChange, last }) {
  return (
    <View style={[s.rowBetween, s.toggle, !last && s.divider]}>
      <View style={{ flex: 1 }}>
        <T w={700} size={16}>{title}</T>
        <T size={13} color={C.textSub} style={{ lineHeight: 19 }} lineBreakStrategyIOS="hangul-word">{desc}</T>
      </View>
      <Switch label={title} value={value} onValueChange={onChange} />
    </View>
  );
}

const s = StyleSheet.create({
  page: { paddingHorizontal: 16, paddingBottom: 120 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  toggle: { paddingVertical: 16 },
  divider: { borderBottomWidth: 1, borderBottomColor: C.border },
});
