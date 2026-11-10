// 공용 컴포넌트: 글자, 카드, 상태 칩, 스위치, 세그먼트, 수치 카드, 상단 헤더
import { useState } from 'react';
import { Animated, Switch as RNSwitch, Text, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, Wind } from 'lucide-react-native';
import { C, FONT, LEVEL, shadow } from './theme';
import { PressScale, SlidingPill, useAnimatedTo } from './motion';

export function T({ w = 400, size = 15, color = C.text, style, ...rest }) {
  return (
    <Text
      {...rest}
      style={[{ fontFamily: FONT[w], fontSize: size, color, fontVariant: ['tabular-nums'] }, style]}
    />
  );
}

export function Card({ style, children }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Chip({ level = 'ok', children, style }) {
  const l = LEVEL[level];
  return (
    <View style={[s.chip, { backgroundColor: l.bg }, style]}>
      <T w={700} size={12} color={l.fg}>{children}</T>
    </View>
  );
}

export function Switch({ value, onValueChange, label, disabled }) {
  return (
    <RNSwitch
      value={value} onValueChange={onValueChange} disabled={disabled} accessibilityLabel={label}
      trackColor={{ true: C.primary, false: '#d5dbe8' }} thumbColor="#fff" ios_backgroundColor="#d5dbe8"
    />
  );
}

// options: [{ value, label }]
export function Segmented({ options, value, onChange, label }) {
  const [w, setW] = useState(0);
  return (
    <View style={s.seg} accessibilityRole="radiogroup" accessibilityLabel={label} onLayout={(e) => setW(e.nativeEvent.layout.width - 8)}>
      <SlidingPill index={options.findIndex((o) => o.value === value)} count={options.length} width={w} style={s.segPill} />
      {options.map((o) => {
        const on = o.value === value;
        return (
          <PressScale
            key={o.value} onPress={() => onChange(o.value)} style={s.segItem}
            accessibilityRole="radio" accessibilityState={{ checked: on }}
          >
            <T w={on ? 700 : 500} size={15} color={on ? C.primaryDeep : C.textSub}>{o.label}</T>
          </PressScale>
        );
      })}
    </View>
  );
}

// 수치 카드: 아이콘, 상태 칩, 값, 기준 막대
export function MetricCard({ icon: Icon, label, value, unit, level, levelText, ratio, mark, caption }) {
  const l = LEVEL[level];
  const fill = useAnimatedTo(Math.min(1, ratio), { from: 0, duration: 900, delay: 150 });
  return (
    <Card style={s.metric}>
      <View style={s.metricTop}>
        <View style={[s.metricIcon, { backgroundColor: l.bg }]}>
          <Icon size={18} color={l.fg} />
        </View>
        <Chip level={level}>{levelText}</Chip>
      </View>
      <T size={14} color={C.textSub} style={{ marginTop: 12 }}>{label}</T>
      <T w={800} size={26}>
        {value}<T size={13} color={C.textSub}> {unit}</T>
      </T>
      <View style={s.track} accessibilityElementsHidden importantForAccessibility="no">
        <Animated.View style={[s.fill, { width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), backgroundColor: l.bar }]} />
        {mark != null && <View style={[s.mark, { left: `${mark * 100}%` }]} />}
      </View>
      <T size={12} color={C.textSub}>{caption}</T>
    </Card>
  );
}

// 로고 + 알림 버튼. 히어로 위에서는 tint(글자색), markBg/markFg(로고), bubble(알림 버튼 배경)을 바꾼다.
export function Header({ tint = C.text, markBg = C.primary, markFg = '#fff', bubble = C.surface }) {
  const router = useRouter();
  return (
    <View style={s.header}>
      <View style={s.logo}>
        <View style={[s.logoMark, { backgroundColor: markBg }]}>
          <Wind size={18} color={markFg} />
        </View>
        <T w={700} size={20} color={tint}>AirClass</T>
      </View>
      <PressScale
        onPress={() => router.navigate('/forecast')} scaleTo={0.9} style={[s.bell, { backgroundColor: bubble }]}
        accessibilityRole="button" accessibilityLabel="알림 보기, 새 알림 있음"
      >
        <Bell size={20} color={tint} />
        <View style={s.dot} />
      </PressScale>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: C.border, ...shadow },
  chip: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  seg: { flexDirection: 'row', backgroundColor: C.bg, borderRadius: 14, padding: 4 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 11 },
  segPill: { top: 4, bottom: 4, left: 4, borderRadius: 11, backgroundColor: C.surface, ...shadow },
  metric: { flex: 1, padding: 16 },
  metricTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, backgroundColor: '#eef1f7', marginVertical: 10 },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3 },
  mark: { position: 'absolute', top: -3, width: 2, height: 12, backgroundColor: C.text, borderRadius: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 56 },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoMark: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  bell: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 10, right: 11, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff5a5a' },
});
