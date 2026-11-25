// AirChat 탭: 말로 예약하고, 규칙을 만들고, "왜?"를 묻는 채팅 화면
// 지금 바로 켜고 끄는 건 제어 탭의 일이라 여기서는 "앞으로의 예약·규칙"과 "이유 설명"만 다룬다.
import { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Clock, Send } from 'lucide-react-native';
import { currentTeacher, getPurifier, getRoomView } from '../api';
import { useAppState } from '../store';
import { C, FONT, GRAD, shadow } from '../theme';
import { Gradient } from '../Gradient';
import { T } from '../ui';
import { FadeIn, PressScale, useReducedMotion } from '../motion';
import { DEFAULT_CHIPS, DEMO_TIMETABLE, checkServer, hhmm, remoteReply, reply } from '../airchat';
import { AiAvatar, AiMessage, AutomationsSheet, EventBubble, TypingBubble, UserBubble } from '../AirChatParts';
import { KEYBOARD_EASING, useKeyboard } from '../useKeyboard';

const TAB_BAR = 74; // 떠 있는 탭바 높이 (여백 포함)

export default function AirChat() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const reduced = useReducedMotion();
  const keyboard = useKeyboard();
  const { roomId, demo, edits, windowEdits, chat } = useAppState();
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [sheet, setSheet] = useState(false);
  // AI 서버 연결 상태: null(확인 중) · true(Claude 응답) · false(앱 기본 응답)
  const [online, setOnline] = useState(null);
  const [focused, setFocused] = useState(false); // 입력창 포커스 (테두리 강조용)
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // 화면이 열릴 때 서버 상태 확인
  useEffect(() => {
    let alive = true;
    checkServer().then((ok) => alive && setOnline(ok));
    return () => { alive = false; };
  }, []);

  const scrollToEnd = () => scrollRef.current?.scrollToEnd({ animated: true });

  // 엔진(서버·모의)에 넘길 지금 교실 상황 (나중에는 서버가 DB에서 직접 조회)
  const buildContext = () => {
    const view = getRoomView(roomId, demo, windowEdits[roomId]);
    const purifier = { ...getPurifier(roomId), ...edits[roomId] };
    const lastEvent = [...chat.schedules].reverse()
      .find((x) => x.roomId === roomId && x.device === 'purifier' && x.status === 'done');
    const draftMsg = [...chat.messages].reverse().find((m) => m.card?.type === 'rule' && !m.card.status);
    return {
      ctx: {
        now: Date.now(), roomId, roomName: view.room.name, teacher: currentTeacher.name,
        sensor: view.sensor, purifierOn: purifier.online && purifier.power, purifierMode: purifier.mode,
        windowOpen: view.window.open, timetable: DEMO_TIMETABLE,
        decision: view.decision, lastEvent, schedules: chat.schedules, rules: chat.rules, draftRule: draftMsg?.card ?? null,
      },
      draftMsg,
    };
  };

  const send = async (raw) => {
    const text = (raw ?? input).trim();
    if (!text || thinking) return;
    setInput('');
    const { ctx, draftMsg } = buildContext();
    const history = chat.messages; // 이번 메시지를 넣기 전까지의 대화
    chat.addMessages({ role: 'user', text });
    setThinking(true);
    const started = Date.now();

    // 서버(Claude)에 먼저 묻고, 안 되면 앱의 모의 엔진으로 대신 답함
    let res;
    try {
      res = await remoteReply(text, ctx, history);
      setOnline(true);
    } catch (e) {
      console.warn('[AirChat] 서버 연결 실패, 기본 응답 사용:', e.message);
      res = reply(text, ctx);
      setOnline(false);
    }

    // 답이 너무 빨리 와도 "입력 중…"을 잠깐은 보여 줘야 자연스러움
    const left = (reduced ? 150 : 800) - (Date.now() - started);
    if (left > 0) await new Promise((r) => setTimeout(r, left));

    setThinking(false);
    if (res.card?.type === 'rule' && draftMsg) {
      chat.updateMessage(draftMsg.id, { card: { ...draftMsg.card, status: 'replaced' } }); // 고친 규칙으로 교체
    }
    chat.addMessages({ role: 'ai', ...res, fresh: true });
  };

  // 카드 버튼 처리
  const onAction = (m, action) => {
    const card = m.card;
    if (action === 'schedule:book') {
      const sc = chat.addSchedule(card);
      chat.updateMessage(m.id, { card: { ...card, status: 'booked', scheduleId: sc.id } });
    } else if (action === 'schedule:dismiss') {
      chat.updateMessage(m.id, { card: { ...card, status: 'dismissed' } });
    } else if (action === 'schedule:cancel') {
      chat.cancelSchedule(card.scheduleId);
    } else if (action === 'rule:add') {
      chat.addRule(card);
      chat.updateMessage(m.id, { card: { ...card, status: 'added' } });
    } else if (action === 'rule:edit') {
      setInput(`${card.threshold ?? 50} 말고 40으로 해줘`);
      inputRef.current?.focus();
    } else if (action === 'open:automations') {
      setSheet(true);
    } else if (action === 'go:control') {
      router.navigate('/control');
    }
  };

  const msgs = chat.messages;
  const lastAi = [...msgs].reverse().find((m) => m.role === 'ai');
  const chips = lastAi?.chips ?? DEFAULT_CHIPS;
  const autoCount = chat.schedules.filter((x) => x.status === 'pending').length + chat.rules.filter((r) => r.on).length;
  const canSend = input.trim().length > 0 && !thinking;
  // ── 키보드 피하기 ─────────────────────────────
  // 입력창 아래 여백은 평소 그대로(탭바 높이) 두고, 키보드가 오면 입력창을 위로 "이동"만 시킨다.
  // - iOS: 위치 이동(translateY)을 네이티브로 돌려서 키보드와 같은 프레임에 움직임 (JS 레이아웃 계산 없음)
  //        키보드 이벤트를 받는 즉시 출발해서 한 박자 늦지 않게
  // - 안드로이드: 창 자체가 키보드만큼 줄어들므로 여백만 줄임
  const tabSpace = Math.max(insets.bottom, 12) + TAB_BAR + 10;
  const lift = useRef(new Animated.Value(0)).current; // 입력창을 위로 올리는 거리 (음수 = 위)
  const [listExtra, setListExtra] = useState(0); // 키보드에 가려지는 만큼 대화 목록 아래 여유
  useEffect(() => {
    if (Platform.OS !== 'ios') return undefined;
    const move = (to, e, done) => Animated.timing(lift, {
      toValue: to, duration: e?.duration || 250, easing: KEYBOARD_EASING, useNativeDriver: true,
    }).start(done);
    const show = Keyboard.addListener('keyboardWillShow', (e) => {
      const up = Math.max(0, (e.endCoordinates?.height ?? 0) + 10 - tabSpace); // 키보드 윗면 + 10
      move(-up, e);
      setListExtra(up);
      setTimeout(scrollToEnd, e?.duration || 250); // 마지막 메시지가 가려지지 않게
    });
    const hide = Keyboard.addListener('keyboardWillHide', (e) => {
      move(0, e, () => setListExtra(0)); // 다 내려온 뒤에 여유를 없애야 목록이 튀지 않음
    });
    return () => { show.remove(); hide.remove(); };
  }, [tabSpace]); // eslint-disable-line react-hooks/exhaustive-deps
  const padBottom = Platform.OS === 'ios' ? tabSpace : (keyboard.visible ? 10 : tabSpace);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* 상단: AirChat + 내 자동화 */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <View style={s.title}>
          <AiAvatar size={38} radius={12} />
          <View>
            <T w={800} size={22} accessibilityRole="header">AirChat</T>
            {online !== null && (
              <View style={s.status} accessibilityLabel={online ? 'AI 서버 연결됨' : 'AI 서버 연결 안 됨, 기본 응답 사용 중'}>
                <View style={[s.statusDot, { backgroundColor: online ? C.ok : '#a0a8b8' }]} />
                <T w={600} size={11} color={C.textSub}>{online ? 'Claude 연결됨' : '기본 응답 모드'}</T>
              </View>
            )}
          </View>
        </View>
        <PressScale onPress={() => setSheet(true)} style={s.autoBtn} accessibilityRole="button" accessibilityLabel={`내 자동화 ${autoCount}개`}>
          <Clock size={16} color={C.primaryDeep} strokeWidth={2.2} />
          <T w={800} size={13}>자동화</T>
          <FadeIn key={autoCount} from={0} scaleFrom={0.6} duration={300}>
            <View style={s.badge}><T w={800} size={11} color="#fff">{autoCount}</T></View>
          </FadeIn>
        </PressScale>
      </View>

      {/* 대화 */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[s.list, { paddingBottom: 16 + listExtra }]}
        onContentSizeChange={scrollToEnd}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <T w={600} size={12} color="#8a93a8" style={{ alignSelf: 'center' }}>{`오늘 ${hhmm(msgs[0].at)}`}</T>
        {msgs.map((m) => {
          if (m.role === 'user') return <UserBubble key={m.id} text={m.text} />;
          if (m.role === 'event') return <EventBubble key={m.id} m={m} />;
          const schedule = m.card?.scheduleId ? chat.schedules.find((x) => x.id === m.card.scheduleId) : null;
          return (
            <AiMessage
              key={m.id} m={m} schedule={schedule} onAction={onAction} onTick={scrollToEnd}
              onStreamed={(id) => chat.updateMessage(id, { fresh: false })}
            />
          );
        })}
        {thinking && <TypingBubble />}
      </ScrollView>

      {/* 추천 질문 + 입력창 */}
      <Animated.View style={[s.composer, { paddingBottom: padBottom, transform: [{ translateY: lift }] }]}>
        {!thinking && (
          <FadeIn key={chips.join('|')} from={6} duration={260}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} keyboardShouldPersistTaps="handled">
              {chips.map((c) => (
                <PressScale key={c} onPress={() => send(c)} style={s.chip} accessibilityRole="button">
                  <T w={700} size={13} color={C.primaryDeep}>{c}</T>
                </PressScale>
              ))}
            </ScrollView>
          </FadeIn>
        )}
        {/* 입력창 + 전송 버튼을 하나의 둥근 상자로 (포커스되면 파란 테두리) */}
        <View style={[s.inputBox, focused && s.inputBoxFocus]}>
          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => send()}
            submitBehavior="submit"
            returnKeyType="send"
            placeholder="언제, 어떤 조건에서 켜고 끌까요?"
            placeholderTextColor="#8a93a8"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={s.input}
            accessibilityLabel="AirChat에 보낼 메시지"
          />
          <PressScale
            onPress={() => send()} disabled={!canSend} scaleTo={0.9}
            style={[s.send, !canSend && { opacity: 0.35 }]}
            accessibilityRole="button" accessibilityLabel="보내기" accessibilityState={{ disabled: !canSend }}
          >
            <Gradient colors={GRAD.brand} />
            <View><Send size={19} color="#fff" strokeWidth={2.3} /></View>
          </PressScale>
        </View>
      </Animated.View>

      <AutomationsSheet
        visible={sheet} onClose={() => setSheet(false)}
        schedules={chat.schedules} rules={chat.rules}
        onCancel={chat.cancelSchedule} onToggle={chat.toggleRule}
      />
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10 },
  title: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  autoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 12, minHeight: 40, ...shadow },
  badge: { backgroundColor: C.primaryDeep, borderRadius: 999, minWidth: 20, paddingHorizontal: 6, paddingVertical: 1, alignItems: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 16, gap: 14 },
  composer: { paddingHorizontal: 16, paddingTop: 8, gap: 8, backgroundColor: C.bg },
  chips: { gap: 6, paddingRight: 16 },
  chip: { borderWidth: 1, borderColor: '#d5ddf0', backgroundColor: C.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  // 입력 상자: 흰 바탕 + 테두리 + 그림자로 배경(C.bg)과 확실히 구분
  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    minHeight: 54, paddingLeft: 18, paddingRight: 6,
    backgroundColor: C.surface, borderRadius: 27, borderWidth: 1.5, borderColor: '#d5ddf0',
    ...shadow, shadowOpacity: 0.1,
  },
  inputBoxFocus: { borderColor: C.primary, shadowColor: C.primary, shadowOpacity: 0.18 },
  input: {
    flex: 1,
    minWidth: 0, width: 0, // 웹에서 TextInput 기본 폭 때문에 전송 버튼이 밀려나지 않게
    minHeight: 44, paddingVertical: 0,
    fontFamily: FONT[500], fontSize: 15, color: C.text,
    ...Platform.select({ web: { outlineStyle: 'none' } }), // 웹 브라우저 기본 포커스 테두리 제거
  },
  send: { width: 42, height: 42, borderRadius: 21, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
