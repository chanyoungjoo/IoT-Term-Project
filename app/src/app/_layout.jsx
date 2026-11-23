import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { House, SlidersHorizontal, ChartColumn, User } from 'lucide-react-native';
import { AirChatIcon } from '../AirChatIcon';
import { AppState } from '../store';
import { currentTeacher, getRoom } from '../api';
import { C, shadow } from '../theme';
import { T } from '../ui';
import { EASE, PressScale, SlidingPill, TEMPO, tabTransitionOptions, useAnimatedTo, useReducedMotion } from '../motion';
import Splash from '../Splash';
import AuthFlow from '../auth/AuthFlow';
import { useAirChatStore } from '../useAirChat';
import { KEYBOARD_EASING, useKeyboard } from '../useKeyboard';

// 폰트를 불러오는 동안 네이티브 스플래시를 유지하고, 앱 스플래시(Splash)가 그려지면 내린다
SplashScreen.preventAutoHideAsync();

const TABS = {
  index: { label: '홈', icon: House },
  control: { label: '제어', icon: SlidersHorizontal }, // 장치 조작 (청정기·창문)
  airchat: { label: 'AirChat', icon: AirChatIcon }, // 말로 예약·규칙 만들기 (바람 + 별 아이콘)
  forecast: { label: '기록', icon: ChartColumn }, // 오늘 CO₂·PM2.5 추세와 환기 기록
  settings: { label: '설정', icon: User },
};

export default function RootLayout() {
  const [loaded] = useFonts({
    'WantedSans-Regular': require('../../assets/fonts/WantedSans-Regular.ttf'),
    'WantedSans-Medium': require('../../assets/fonts/WantedSans-Medium.ttf'),
    'WantedSans-SemiBold': require('../../assets/fonts/WantedSans-SemiBold.ttf'),
    'WantedSans-Bold': require('../../assets/fonts/WantedSans-Bold.ttf'),
    'WantedSans-ExtraBold': require('../../assets/fonts/WantedSans-ExtraBold.ttf'),
  });
  const [roomId, setRoomId] = useState(currentTeacher.defaultRoomId);
  const [demo, setDemo] = useState('normal');
  const [edits, setEdits] = useState({}); // 교실별 공기청정기 설정 { [roomId]: { power, mode, speed } }
  const [windowEdits, setWindowEdits] = useState({}); // 앱에서 여닫은 창문 상태 { [roomId]: true|false }
  // 시연 상태를 바꾸면 그 상태의 창문 시작값부터 다시 보여 준다
  const changeDemo = (k) => { setDemo(k); setWindowEdits({}); };
  const setWindowOpen = (id, open) => setWindowEdits((w) => ({ ...w, [id]: open }));
  const [splashDone, setSplashDone] = useState(false);
  // 로그인한 선생님 (없으면 로그인 화면). 프로토타입이라 메모리에만 있어서 앱을 다시 켜면 다시 로그인한다.
  const [user, setUser] = useState(null);
  // 로그인 전환(T-1): enter 0(로그인 화면) → 1(앱). 크기·위치 변화 없이 로그인 화면이 서서히 투명해지며 뒤의 홈과 겹쳐 바뀜
  const enter = useRef(new Animated.Value(0)).current;
  const [authShown, setAuthShown] = useState(true); // 사라지는 애니메이션 동안에도 로그인 화면을 남겨 둠
  const onLogin = (u) => {
    setUser(u);
    const first = u.roomIds?.find((id) => getRoom(id));
    if (first) setRoomId(first); // 담당 교실 중 첫 번째를 홈에 보여 줌
    if (reduced) { enter.setValue(1); setAuthShown(false); return; }
    Animated.timing(enter, { toValue: 1, duration: Math.round(300 * TEMPO), easing: EASE, useNativeDriver: true })
      .start(() => setAuthShown(false));
  };
  const router = useRouter();
  // 로그아웃: 탭은 로그인 화면 뒤에 그대로 남아 있으므로, 다시 로그인하면 항상 홈부터 보이게 홈 탭으로 돌려 둠
  const logout = () => {
    setUser(null); setDemo('normal'); setWindowEdits({}); router.navigate('/');
    enter.setValue(0); setAuthShown(true); // 로그인 화면은 새로 그려지며 자체 등장 애니메이션
  };
  const reduced = useReducedMotion(); // 동작 줄이기 켜면 탭 전환 애니메이션도 끔
  // AirChat 대화·예약·규칙 (탭을 옮겨도 유지, 예약 실행기도 여기서 돈다)
  const chat = useAirChatStore({ demo, edits, setEdits, windowEdits, setWindowOpen });

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <AppState.Provider value={{ roomId, setRoomId, demo, setDemo: changeDemo, edits, setEdits, windowEdits, setWindowOpen, chat, user, logout }}>
        {/* 로그인 전에는 파란 그라데이션 위라 밝은 글자 */}
        <StatusBar style={user ? 'auto' : 'light'} />
        <Tabs screenOptions={{ headerShown: false, ...tabTransitionOptions(reduced) }} tabBar={(props) => <FloatingTabBar {...props} />}>
          {Object.keys(TABS).map((name) => <Tabs.Screen key={name} name={name} />)}
        </Tabs>
        {/* 로그인 전: 탭 위를 전체 화면으로 덮음 (스플래시와 같은 방식).
            탭 자리에 바꿔 그리면 아이폰에서 바깥 틀 크기가 0이 되어 화면이 잘리고 입력칸이 눌리지 않았음 */}
        {authShown && (
          <Animated.View
            style={[s.authLayer, { opacity: enter.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}
            pointerEvents={user ? 'none' : 'auto'} accessibilityViewIsModal={!user}
          >
            <AuthFlow onLogin={onLogin} />
          </Animated.View>
        )}
        {!splashDone && <Splash onDone={() => setSplashDone(true)} />}
      </AppState.Provider>
    </SafeAreaProvider>
  );
}

// 떠 있는 둥근 탭바, 선택 탭은 연한 파랑 배경
// SDK 58의 expo-router 탭바는 navigation 대신 emitter·navigateToTab을 넘겨준다
function FloatingTabBar({ state, emitter, navigateToTab }) {
  const insets = useSafeAreaInsets();
  const [w, setW] = useState(0);
  // 키보드가 올라오면 탭바는 키보드 뒤로 내려가며 사라진다 (채팅 앱의 일반적인 방식).
  // 없애지(null) 않고 키보드와 같은 시간·곡선으로 움직여서, 화면이 툭 튀지 않게 한다.
  const keyboard = useKeyboard();
  const hide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(hide, {
      toValue: keyboard.visible ? 1 : 0, duration: keyboard.duration, easing: KEYBOARD_EASING, useNativeDriver: true,
    }).start();
  }, [keyboard.visible]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.View
      style={[s.wrap, {
        bottom: Math.max(insets.bottom, 12),
        opacity: hide.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
        transform: [{ translateY: hide.interpolate({ inputRange: [0, 1], outputRange: [0, 40] }) }],
      }]}
      pointerEvents={keyboard.visible ? 'none' : 'auto'} // 숨어 있는 동안은 눌리지 않게
      accessibilityRole="tablist" accessibilityElementsHidden={keyboard.visible}
      onLayout={(e) => setW(e.nativeEvent.layout.width - 14)} // 테두리 1 + 안쪽 여백 6, 양쪽
    >
      <SlidingPill index={state.index} count={state.routes.length} width={w} gap={4} style={s.pill} />
      {state.routes.map((route, i) => {
        const tab = TABS[route.name];
        const on = state.index === i;
        return (
          <PressScale
            key={route.key} style={s.tab} scaleTo={0.92}
            accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={tab.label}
            onPress={() => {
              // 기본 탭바와 같은 방식: tabPress 이벤트를 먼저 알리고, 막히지 않았으면 이동
              const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!on && !event.defaultPrevented) navigateToTab(route.key);
            }}
          >
            <TabIcon icon={tab.icon} on={on} />
            <T w={on ? 700 : 500} size={12} color={on ? C.primaryDeep : C.textSub}>{tab.label}</T>
          </PressScale>
        );
      })}
    </Animated.View>
  );
}

// 선택되면 아이콘이 톡 튀어 오름
function TabIcon({ icon: Icon, on }) {
  const lift = useAnimatedTo(on ? 1 : 0, { spring: true, native: true });
  const transform = [
    { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) },
    { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
  ];
  return (
    <Animated.View style={{ transform }}>
      <Icon size={22} color={on ? C.primary : C.textSub} />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  // RN 0.88에는 StyleSheet.absoluteFillObject가 없어서(undefined) 위치를 직접 적음
  // 배경은 투명: 로그인 화면이 내려가며 뒤의 홈이 보이도록 (각 인증 화면이 자기 배경을 칠함)
  authLayer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 5 },
  wrap: {
    position: 'absolute', left: 16, right: 16, flexDirection: 'row', padding: 6, gap: 4,
    backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: 28, borderWidth: 1, borderColor: C.border, ...shadow, shadowOpacity: 0.12,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 9, borderRadius: 22 },
  pill: { top: 6, bottom: 6, left: 6, borderRadius: 22, backgroundColor: C.primarySoft },
});
