import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight } from 'lucide-react-native';
import Constants from 'expo-constants';
import { THRESHOLDS } from '../../../shared/rules';
import { currentTeacher, getRoom, school } from '../api';
import { useAppState } from '../store';
import { C } from '../theme';
import { T, Card, Header } from '../ui';
import { FadeIn, PressScale } from '../motion';

const fmt = (n) => n.toLocaleString('ko-KR');

export default function Settings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { roomId, setRoomId } = useAppState();
  const homeRoom = getRoom(currentTeacher.defaultRoomId);

  const limits = [
    ['실내 PM2.5', `${THRESHOLDS.indoorPm25Bad}㎍/㎥ 이상이면 나쁨`],
    ['CO₂', `${fmt(THRESHOLDS.co2High)}ppm 이상이면 환기`],
    ['실외 PM2.5', `${THRESHOLDS.outdoorPm25Bad}㎍/㎥ 이상이면 나쁨`],
  ];
  const account = [
    ['이름', `${currentTeacher.name} 선생님`],
    ['소속', school.name],
    ['앱 버전', Constants.expoConfig?.version ?? '-'],
  ];

  return (
    <ScrollView bounces={false} overScrollMode="never" style={{ backgroundColor: C.bg }} contentContainerStyle={[s.page, { paddingTop: insets.top }]}>
      <Header />
      <T w={800} size={26} style={{ marginTop: 8 }} accessibilityRole="header">설정</T>

      <FadeIn delay={60}><Card style={[s.profile, { marginTop: 16 }]}>
        <View style={s.avatar}><T w={800} size={20} color={C.primaryDeep}>{currentTeacher.name[0]}</T></View>
        <View style={{ flex: 1 }}>
          <T w={700} size={18}>{currentTeacher.name} 선생님</T>
          <T size={13} color={C.textSub}>{school.name}, {homeRoom.name} 담임</T>
        </View>
      </Card></FadeIn>

      <FadeIn delay={130}><Card style={s.section}>
        <T w={600} size={13} color={C.textSub}>내 교실 관리</T>
        {currentTeacher.roomIds.map((id, i) => {
          const r = getRoom(id);
          const selected = id === roomId;
          return (
            <PressScale
              key={id} scaleTo={0.98} style={[s.row, i < currentTeacher.roomIds.length - 1 && s.divider]}
              onPress={() => { setRoomId(id); router.navigate('/'); }}
              accessibilityRole="button" accessibilityState={{ selected }}
              accessibilityLabel={`${r.name}${selected ? ', 지금 보는 교실' : ''}`} accessibilityHint="홈에서 이 교실을 보여 줘요"
            >
              <View style={{ flex: 1 }}>
                <T w={700} size={16}>{r.name}</T>
                <T size={13} color={C.textSub}>{r.floor === 's' ? '특별실' : `${school.building} ${r.floor}층`}, 센서 1대, 공기청정기 1대</T>
              </View>
              {id === currentTeacher.defaultRoomId && (
                <View style={s.badge}><T w={700} size={12} color={C.primaryDeep}>기본 교실</T></View>
              )}
              <ChevronRight size={18} color={C.textSub} />
            </PressScale>
          );
        })}
      </Card></FadeIn>

      <FadeIn delay={200}><Card style={s.section}>
        <T w={600} size={13} color={C.textSub}>알림 기준값</T>
        {limits.map(([k, v]) => (
          <View key={k} style={[s.row, s.divider]}>
            <T size={15} style={{ flex: 1 }}>{k}</T>
            <T w={700} size={15}>{v}</T>
          </View>
        ))}
        <T size={12} color={C.textSub} style={{ marginTop: 10, lineHeight: 18 }}>
          기준값은 학교 행정실에서 정해요. 바꾸려면 행정실에 문의해 주세요.
        </T>
      </Card></FadeIn>

      <FadeIn delay={270}><Card style={s.section}>
        <T w={600} size={13} color={C.textSub}>계정</T>
        {account.map(([k, v], i) => (
          <View key={k} style={[s.row, i < account.length - 1 && s.divider]}>
            <T size={15} style={{ flex: 1 }}>{k}</T>
            <T size={15} color={C.textSub}>{v}</T>
          </View>
        ))}
      </Card></FadeIn>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { paddingHorizontal: 16, paddingBottom: 120 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  section: { marginTop: 12, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, minHeight: 48 },
  divider: { borderBottomWidth: 1, borderBottomColor: C.border },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8, backgroundColor: C.primarySoft },
});
