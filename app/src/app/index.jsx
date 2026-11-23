import { useEffect } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, Cloud, Thermometer, Droplet } from 'lucide-react-native';
import { MaskIcon } from '../MaskIcon';
import { THRESHOLDS } from '../../../shared/rules';
import { currentTeacher, getRoomView, school } from '../api';
import { useAppState } from '../store';
import { C, GRAD, HERO, LEVEL } from '../theme';
import { useScrollTop } from '../useScrollTop';
import { Gradient } from '../Gradient';
import { T, Card, Header, MetricCard, Segmented } from '../ui';
import { FadeIn, PressScale, useAnimatedColor, useAnimatedTo } from '../motion';
import WindowArt from '../WindowArt';
import WindowCard from '../WindowCard';

const fmt = (n) => n.toLocaleString('ko-KR');
const inRange = (v, [lo, hi]) => v >= lo && v <= hi;
const floorText = (room) => (room.floor === 's' ? '특별실' : `${school.building} ${room.floor}층`);

export default function Home() {
  const insets = useSafeAreaInsets();
  const { roomId, setRoomId, demo, setDemo, windowEdits, setWindowOpen, user } = useAppState();
  // 탭에 들어올 때 항상 맨 위부터. 로그인·로그아웃 때도 맨 위로 (홈은 로그인 화면 뒤에 남아 있어서)
  const scrollRef = useScrollTop();
  useEffect(() => { scrollRef.current?.scrollTo({ y: 0, animated: false }); }, [user]);
  const v = getRoomView(roomId, demo, windowEdits[roomId]);
  const { sensor, decision, outPm, outState } = v;
  const hero = HERO[decision.rule];
  const co2Lv = sensor.co2 >= THRESHOLDS.co2High ? 'warn' : 'ok';
  const pmLv = sensor.pm25 >= THRESHOLDS.indoorPm25Bad ? 'bad' : 'ok';
  const tempOk = inRange(sensor.temperature, THRESHOLDS.comfortTemp);
  const humOk = inRange(sensor.humidity, THRESHOLDS.comfortHumidity);
  const myRooms = currentTeacher.roomIds;
  const nextRoom = myRooms[(myRooms.indexOf(roomId) + 1) % myRooms.length];
  const onHero = hero.fg === '#ffffff';
  const heroBg = useAnimatedColor(hero.bg);

  return (
    <ScrollView ref={scrollRef} bounces={false} overScrollMode="never" style={{ backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 120 }}>
      <Animated.View style={[s.hero, { backgroundColor: heroBg, paddingTop: insets.top }]}>
        <FadeIn key={`g${decision.rule}`} from={0} duration={500} style={StyleSheet.absoluteFill}>
          <Gradient colors={GRAD.hero[decision.rule]} glow={0.22} />
        </FadeIn>
        <Header
          tint={hero.fg} bubble={hero.chip}
          markBg={onHero ? 'rgba(255,255,255,0.22)' : hero.fg} markFg={onHero ? '#fff' : hero.bg}
        />
        <PressScale
          style={[s.roomPick, { backgroundColor: hero.chip }]} onPress={() => setRoomId(nextRoom)}
          accessibilityRole="button" accessibilityLabel={`교실 선택: 지금 ${v.room.name}`}
          accessibilityHint={`누르면 ${myRooms.length}개 교실을 차례로 바꿔요`}
        >
          <T w={700} size={16} color={hero.fg}>{v.room.name}</T>
          <T size={15} color={hero.sub}>{floorText(v.room)}</T>
          <ChevronDown size={18} color={hero.fg} />
        </PressScale>

        {/* 숫자 카드(같은 폭) · 창문 그림 · 숫자 카드. 카드 폭이 같아서 숫자 길이가 달라져도 창문은 항상 가운데 */}
        <View style={s.compare}>
          <HeroMetric hero={hero} label="실내 CO₂" value={fmt(sensor.co2)} unit="ppm" bad={co2Lv === 'warn'}
            status={co2Lv === 'warn' ? '환기 필요' : '양호'} />
          <WindowArt rule={decision.rule} color={hero.fg} bg={hero.bg} />
          <HeroMetric hero={hero} label="실외 PM2.5" value={outPm ?? '-'} unit="㎍/㎥" bad={outState === 'bad'}
            status={outState === 'bad' ? '나쁨' : outState === 'good' ? '보통' : '알 수 없음'} />
        </View>

        {/* 제목·설명 (가운데 정렬). 상태는 배경색·제목·숫자 칩으로 충분해서 라벨 칩은 뺌 */}
        <FadeIn key={decision.rule} delay={80} style={{ alignItems: 'center', marginTop: 20 }}>
          <T w={800} size={26} color={hero.fg} style={[s.center, { lineHeight: 34 }]} lineBreakStrategyIOS="hangul-word" accessibilityRole="header">
            {decision.title}
          </T>
          <T size={15} color={hero.sub} style={[s.center, { lineHeight: 22, marginTop: 6 }]} lineBreakStrategyIOS="hangul-word">{decision.message}</T>
        </FadeIn>
      </Animated.View>

      <View style={s.body}>
        {/* 창문 카드: 추천 + 원탭 실행 (지금 할 일 카드를 대신함) */}
        <FadeIn delay={100}>
          <WindowCard
            open={v.window.open} online={v.window.online} rec={v.windowRec}
            onSet={(open) => setWindowOpen(roomId, open)}
            note={windowEdits[roomId] !== undefined ? `방금 창문을 ${windowEdits[roomId] ? '열었어요' : '닫았어요'}` : null}
          />
        </FadeIn>
        <FadeIn delay={120}>
          <View style={s.row}>
            <MetricCard icon={Cloud} label="CO₂" value={fmt(sensor.co2)} unit="ppm" level={co2Lv}
              levelText={co2Lv === 'warn' ? '환기 필요' : '양호'} ratio={sensor.co2 / (THRESHOLDS.co2High * 1.6)}
              mark={1 / 1.6} caption={`기준 ${fmt(THRESHOLDS.co2High)}ppm`} />
            <MetricCard icon={MaskIcon} label="PM2.5" value={sensor.pm25} unit="㎍/㎥" level={pmLv}
              levelText={pmLv === 'bad' ? '나쁨' : '양호'} ratio={sensor.pm25 / (THRESHOLDS.indoorPm25Bad * 1.6)}
              mark={1 / 1.6} caption={`기준 ${THRESHOLDS.indoorPm25Bad}㎍/㎥`} />
          </View>
        </FadeIn>
        <FadeIn delay={190}>
          <View style={s.row}>
            <MetricCard icon={Thermometer} label="온도" value={sensor.temperature.toFixed(1)} unit="°C"
              level={tempOk ? 'ok' : 'warn'} levelText={tempOk ? '양호' : '확인'} ratio={sensor.temperature / 35}
              caption={`적정 ${THRESHOLDS.comfortTemp.join('~')}°C`} />
            <MetricCard icon={Droplet} label="습도" value={sensor.humidity} unit="%"
              level={humOk ? 'ok' : 'warn'} levelText={humOk ? '양호' : '확인'} ratio={sensor.humidity / 100}
              caption={`적정 ${THRESHOLDS.comfortHumidity.join('~')}%`} />
          </View>
        </FadeIn>
        <FadeIn delay={330}>
          <Card>
            <T w={700} size={17}>실내·외 PM2.5 비교</T>
            <CompareBar label="교실 안" value={sensor.pm25} level={pmLv} />
            <CompareBar label="바깥" value={outPm} level={outState === 'bad' ? 'bad' : 'ok'} />
            <T size={13} color={C.textSub} style={{ marginTop: 10 }}>
              {outPm == null ? '바깥 값을 아직 받지 못했어요.'
                : outPm > sensor.pm25 ? `바깥이 교실보다 ${outPm - sensor.pm25}㎍/㎥ 더 탁해요.`
                : `교실이 바깥보다 ${sensor.pm25 - outPm}㎍/㎥ 더 탁해요.`}
            </T>
          </Card>
        </FadeIn>
        <FadeIn delay={400}>
          <Card style={{ gap: 10 }}>
            <T w={700} size={14} color={C.textSub}>시연용 상태 전환</T>
            <Segmented label="시연용 상태" value={demo} onChange={setDemo}
              options={[{ value: 'normal', label: '정상' }, { value: 'co2', label: 'CO₂ 높음' }, { value: 'outdoorBad', label: '실외 나쁨' }]} />
            {!v.isDemo && <T size={12} color={C.textSub}>시연값은 2학년 2반에만 적용돼요. 지금은 이 교실의 실제 더미값이에요.</T>}
          </Card>
        </FadeIn>
      </View>
    </ScrollView>
  );
}

function CompareBar({ label, value, level }) {
  const max = THRESHOLDS.outdoorPm25Bad * 2;
  const fill = useAnimatedTo(Math.min(1, (value ?? 0) / max), { from: 0, duration: 900, delay: 400 });
  return (
    <View style={s.cmpRow} accessible accessibilityLabel={`${label} PM2.5 ${value ?? '알 수 없음'}`}>
      <T size={14} color={C.textSub} style={{ width: 52 }}>{label}</T>
      <View style={s.cmpTrack}>
        <Animated.View style={[s.cmpFill, { width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), backgroundColor: LEVEL[level].bar }]} />
      </View>
      <T w={700} size={15} style={{ width: 36, textAlign: 'right' }}>{value ?? '-'}</T>
    </View>
  );
}

// 히어로 숫자 카드 (반투명, 가운데 정렬): 라벨 / 숫자 / 상태 칩
function HeroMetric({ hero, label, value, unit, bad, status }) {
  return (
    <View style={[s.metricCard, { backgroundColor: hero.glass }]} accessible accessibilityLabel={`${label} ${value}, ${status}`}>
      <T w={600} size={13} color={hero.sub} numberOfLines={1}>{label}</T>
      {/* 숫자 + 단위를 한 줄에 (단위는 항상 표시) */}
      <FadeIn key={value} from={6} style={s.valueRow}>
        <T w={800} size={28} color={hero.fg} numberOfLines={1}>{value}</T>
        <T w={600} size={12} color={hero.sub} style={s.unit}>{unit}</T>
      </FadeIn>
      {/* 기준을 넘은 숫자에만 반전색 칩 */}
      {bad ? (
        <View style={[s.miniChip, { backgroundColor: hero.fg, alignSelf: 'center', marginTop: 2 }]}>
          <T w={700} size={12} color={hero.bg} numberOfLines={1}>{status}</T>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 52 },
  roomPick: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, marginTop: 8 },
  compare: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 22 },
  // 반투명 숫자 카드: 양쪽 같은 폭(flex: 1), 안의 내용은 가운데 정렬
  valueRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' },
  unit: { marginLeft: 3 },
  metricCard: { flex: 1, alignSelf: 'stretch', justifyContent: 'center', alignItems: 'center', gap: 2, borderRadius: 16, paddingHorizontal: 8, paddingVertical: 11 },
  center: { textAlign: 'center' },
  miniChip: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, marginTop: 4 },
  // 히어로 위로 올라오는 시트: 위쪽 모서리만 둥글게, 카드는 이 시트 안에 놓인다
  body: { paddingHorizontal: 16, paddingTop: 20, marginTop: -28, gap: 12, backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  row: { flexDirection: 'row', gap: 12 },
  cmpRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  cmpTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: '#eef1f7', overflow: 'hidden' },
  cmpFill: { height: '100%', borderRadius: 5 },
});
