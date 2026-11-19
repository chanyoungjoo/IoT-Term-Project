// AirChat 탭: 말로 예약하고, 규칙을 만들고, "왜?"를 묻는 채팅 화면
// 지금 바로 켜고 끄는 건 제어 탭의 일이라 여기서는 "앞으로의 예약·규칙"과 "이유 설명"만 다룬다.
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Clock, Send } from 'lucide-react-native';
import { currentTeacher, getPurifier, getRoomView } from '../api';
import { useAppState } from '../store';
import { C, FONT, shadow } from '../theme';
import { T } from '../ui';
import { FadeIn, PressScale, useReducedMotion } from '../motion';
import { DEFAULT_CHIPS, hhmm, reply } from '../airchat';
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
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToEnd = () => scrollRef.current?.scrollToEnd({ animated: true });

  // 엔진에 넘길 지금 교실 상황 (나중에 서버로 바꾸면 서버가 직접 조회)
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
        decision: view.decision, lastEvent, schedules: chat.schedules, rules: chat.rules, draftRule: draftMsg?.card ?? null,
      },
      draftMsg,
    };
  };

  const send = (raw) => {
    const text = (raw ?? input).trim();
    if (!text || thinking) return;
    setInput('');
    chat.addMessages({ role: 'user', text });
    setThinking(true);
    const { ctx, draftMsg } = buildContext();
    const res = reply(text, ctx);
    // 실제 LLM처럼 잠깐 "입력 중…"을 보여 준 뒤 답을 스트리밍
    const wait = reduced ? 150 : 650 + Math.min(500, text.length * 12);
    setTimeout(() => {
      setThinking(false);
      if (res.card?.type === 'rule' && draftMsg) {
        chat.updateMessage(draftMsg.id, { card: { ...draftMsg.card, status: 'replaced' } }); // 고친 규칙으로 교체
      }
      chat.addMessages({ role: 'ai', ...res, fresh: true });
    }, wait);
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
          <T w={800} size={22} accessibilityRole="header">AirChat</T>
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
