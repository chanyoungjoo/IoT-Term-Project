import { useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { House, Fan, ChartColumn, User } from 'lucide-react-native';
import { AppState } from '../store';
import { currentTeacher } from '../api';
import { C, shadow } from '../theme';
import { T } from '../ui';
import { PressScale, SlidingPill, useAnimatedTo } from '../motion';
import Splash from '../Splash';

// 폰트를 불러오는 동안 네이티브 스플래시를 유지하고, 앱 스플래시(Splash)가 그려지면 내린다
SplashScreen.preventAutoHideAsync();

const TABS = {
  index: { label: '홈', icon: House },
  control: { label: '제어', icon: Fan },
  forecast: { label: '예측·알림', icon: ChartColumn },
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
  const [splashDone, setSplashDone] = useState(false);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <AppState.Provider value={{ roomId, setRoomId, demo, setDemo, edits, setEdits }}>
        <StatusBar style="auto" />
        <Tabs screenOptions={{ headerShown: false, animation: 'shift' }} tabBar={(props) => <FloatingTabBar {...props} />}>
          {Object.keys(TABS).map((name) => <Tabs.Screen key={name} name={name} />)}
        </Tabs>
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
  return (
    <View
      style={[s.wrap, { bottom: Math.max(insets.bottom, 12) }]} accessibilityRole="tablist"
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
    </View>
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
  wrap: {
    position: 'absolute', left: 16, right: 16, flexDirection: 'row', padding: 6, gap: 4,
    backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: 28, borderWidth: 1, borderColor: C.border, ...shadow, shadowOpacity: 0.12,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 9, borderRadius: 22 },
  pill: { top: 6, bottom: 6, left: 6, borderRadius: 22, backgroundColor: C.primarySoft },
});
