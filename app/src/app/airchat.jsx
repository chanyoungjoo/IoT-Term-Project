// AirChat 탭: 말로 예약하고, 규칙을 만들고, "왜?"를 묻는 채팅 화면
// 지금 바로 켜고 끄는 건 제어 탭의 일이라 여기서는 "앞으로의 예약·규칙"과 "이유 설명"만 다룬다.
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Clock, Send } from 'lucide-react-native';
import { currentTeacher, getPurifier, getRoomView } from '../api';
import { useAppState } from '../store';
import { C, FONT, shadow } from '../theme';
import { T } from '../ui';
import { FadeIn, PressScale, useReducedMotion } from '../motion';
import { DEFAULT_CHIPS, DEMO_TIMETABLE, checkServer, hhmm, remoteReply, reply } from '../airchat';
import { AiAvatar, AiMessage, AutomationsSheet, EventBubble, TypingBubble, UserBubble } from '../AirChatParts';
import { useKeyboardVisible } from '../useKeyboard';

const TAB_BAR = 74; // 떠 있는 탭바 높이 (여백 포함)

export default function AirChat() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const reduced = useReducedMotion();
  const keyboard = useKeyboardVisible();
  const { roomId, demo, edits, windowEdits, chat } = useAppState();
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [sheet, setSheet] = useState(false);
  // AI 서버 연결 상태: null(확인 중) · true(Claude 응답) · false(앱 기본 응답)
  const [online, setOnline] = useState(null);
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
    const left = (reduced ? 150 : 650) - (Date.now() - started);
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
  const bottomSpace = keyboard ? 10 : Math.max(insets.bottom, 12) + TAB_BAR + 10;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
        contentContainerStyle={s.list}
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
      <View style={[s.composer, { paddingBottom: bottomSpace }]}>
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
        <View style={s.inputRow}>
          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => send()}
            submitBehavior="submit"
            returnKeyType="send"
            placeholder="언제, 어떤 조건에서 켜고 끌까요?"
            placeholderTextColor="#8a93a8"
            style={s.input}
            accessibilityLabel="AirChat에 보낼 메시지"
          />
          <PressScale
            onPress={() => send()} disabled={!canSend} scaleTo={0.9}
            style={[s.send, !canSend && { opacity: 0.45 }]}
            accessibilityRole="button" accessibilityLabel="보내기" accessibilityState={{ disabled: !canSend }}
          >
            <Send size={21} color="#fff" strokeWidth={2.2} />
          </PressScale>
        </View>
      </View>

      <AutomationsSheet
        visible={sheet} onClose={() => setSheet(false)}
        schedules={chat.schedules} rules={chat.rules}
        onCancel={chat.cancelSchedule} onToggle={chat.toggleRule}
      />
    </KeyboardAvoidingView>
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
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1, minWidth: 0, width: 0, minHeight: 50, // 웹에서 TextInput 기본 폭 때문에 전송 버튼이 밀려나지 않게 borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 16, fontFamily: FONT[500], fontSize: 15, color: C.text, ...shadow,
    ...Platform.select({ web: { outlineStyle: 'none' } }), // 웹 브라우저 기본 포커스 테두리 제거
  },
  send: { width: 50, height: 50, borderRadius: 16, backgroundColor: C.primaryDeep, alignItems: 'center', justifyContent: 'center' },
});
