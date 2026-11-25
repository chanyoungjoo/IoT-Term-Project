// AirChat 화면 부품: 말풍선, 입력 중 표시, 스트리밍 텍스트, 카드, 내 자동화 시트
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { Check, ChevronRight, Clock, ListChecks, ScrollText, ShieldCheck, X } from 'lucide-react-native';
import { AirChatIcon } from './AirChatIcon';
import { C, GRAD, shadow } from './theme';
import { Gradient } from './Gradient';
import { T, Switch } from './ui';
import { FadeIn, PressScale, useReducedMotion } from './motion';
import { ACTION_NAME, DEVICE_NAME, hhmm } from './airchat';

const PURPLE = '#6a4be0';
const PURPLE_BG = '#f1ecff';

// ── AI 아바타 (파랑→보라 그라데이션 + AirChat 아이콘: 바람 + 별) ─────
export function AiAvatar({ size = 30, radius = 10 }) {
  const id = `airchat-g${size}`;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#3a70fc" />
            <Stop offset="1" stopColor="#7c5cff" />
          </LinearGradient>
        </Defs>
        <Rect width={size} height={size} rx={radius} fill={`url(#${id})`} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, s.center]}>
        <AirChatIcon size={size * 0.68} color="#fff" strokeWidth={2.1} />
      </View>
    </View>
  );
}

// ── 대화 옆 AI 표시: 그라데이션 별 하나 ──────────────────
// 화면 제목에서는 AirChat 아이콘(바람 + 별)을 보여 주고, 메시지마다 반복되는 자리는 별만 남겨 가볍게.
const STAR = 'M12 2.5C12.6 7.6 16.4 11.4 21.5 12C16.4 12.6 12.6 16.4 12 21.5C11.4 16.4 7.6 12.6 2.5 12C7.6 11.4 11.4 7.6 12 2.5Z';
export function AiStar({ size = 30 }) {
  const id = `aistar${size}`;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessible={false}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#3a70fc" />
            <Stop offset="1" stopColor="#7c5cff" />
          </LinearGradient>
        </Defs>
        <Path d={STAR} fill={`url(#${id})`} transform="translate(1.2 1.2) scale(0.9)" />
      </Svg>
    </View>
  );
}

// ── 굵게 표시(**…**)가 섞인 문장 ─────────────────────────
const parseRich = (text) => text.split('**').map((t, i) => ({ t, b: i % 2 === 1 })).filter((x) => x.t);

function RichText({ segs, count, caret }) {
  let left = count;
  return (
    <T size={15} style={{ lineHeight: 23 }} lineBreakStrategyIOS="hangul-word">
      {segs.map((seg, i) => {
        if (left <= 0) return null;
        const part = seg.t.slice(0, left);
        left -= seg.t.length;
        return seg.b ? <T key={i} w={800} size={15}>{part}</T> : part;
      })}
      {caret && <T size={15} color={C.primary}> ●</T>}
    </T>
  );
}

// ── 글자가 흘러나오는 스트리밍 텍스트 (GPT·Claude처럼) ─────
// animate가 true면 두 글자씩 차례로 보여 주고, 다 나오면 onDone을 부른다.
export function StreamText({ text, animate, onDone, onTick }) {
  const segs = useMemo(() => parseRich(text), [text]);
  const total = segs.reduce((n, x) => n + x.t.length, 0);
  const reduced = useReducedMotion();
  const [count, setCount] = useState(animate ? 0 : total);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!animate || reduced) {
      setCount(total);
      return undefined;
    }
    const timer = setInterval(() => {
      setCount((c) => {
        const n = Math.min(total, c + 1);
        if (n >= total) clearInterval(timer);
        return n;
      });
    }, 26); // 초당 약 38자: 읽히는 속도로 흘러나오게
    return () => clearInterval(timer);
  }, [animate, reduced, total]);

  useEffect(() => {
    onTick?.(); // 글자가 늘어날 때마다 맨 아래로 스크롤
    if (count >= total && !doneRef.current) {
      doneRef.current = true;
      onDone?.();
    }
  }, [count]); // eslint-disable-line react-hooks/exhaustive-deps

  return <RichText segs={segs} count={count} caret={animate && count < total} />;
}

// ── 입력 중… (점 세 개가 차례로 통통 튐) ─────────────────
export function TypingBubble() {
  const a = useRef(new Animated.Value(0)).current;
  const b = useRef(new Animated.Value(0)).current;
  const c = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const bounce = (v, delay) => Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(v, { toValue: 1, duration: 340, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 340, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.delay(420 - delay),
    ]));
    const loops = [bounce(a, 0), bounce(b, 150), bounce(c, 300)];
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [a, b, c]);
  const dot = (v) => ({
    opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }],
  });
  return (
    <FadeIn from={8} duration={250}>
      <View style={s.aiRow} accessible accessibilityLabel="AirChat이 답을 쓰는 중">
        <AiStar />
        <View style={s.typing}>
          {[a, b, c].map((v, i) => <Animated.View key={i} style={[s.dot, dot(v)]} />)}
        </View>
      </View>
    </FadeIn>
  );
}

// ── 말풍선 ──────────────────────────────────────────
export function UserBubble({ text }) {
  return (
    <FadeIn from={12} scaleFrom={0.96} duration={280} style={{ alignSelf: 'flex-end', maxWidth: '80%' }}>
      <View style={s.me}>
        <Gradient colors={GRAD.brand} />
        <T size={15} color="#fff" style={{ lineHeight: 22 }}>{text}</T>
      </View>
    </FadeIn>
  );
}

// 예약이 실행됐을 때 대화에 남는 기록
export function EventBubble({ m }) {
  const tone = m.ok ? { bg: C.okBg, fg: C.okText } : { bg: C.warnBg, fg: C.warnText };
  return (
    <FadeIn from={10} scaleFrom={0.97} duration={350}>
      <View style={[s.event, { backgroundColor: tone.bg }]} accessibilityLiveRegion="polite">
        <View style={[s.icon, { backgroundColor: '#fff' }]}>
          {m.ok ? <Check size={16} color={tone.fg} strokeWidth={3} /> : <ShieldCheck size={16} color={tone.fg} />}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T w={800} size={14} color={tone.fg}>{m.text}</T>
          <T w={600} size={12} color={tone.fg} style={{ opacity: 0.85 }}>{m.sub}</T>
        </View>
      </View>
    </FadeIn>
  );
}

// AI 답변: 아바타 + 스트리밍 텍스트 → 다 나오면 카드가 떠오름
export function AiMessage({ m, schedule, onStreamed, onAction, onTick }) {
  const [done, setDone] = useState(!m.fresh);
  return (
    <FadeIn from={8} duration={300}>
      <View style={s.aiRow}>
        <AiStar />
        <View style={s.aiBody}>
          <StreamText
            text={m.text} animate={!!m.fresh} onTick={onTick}
            onDone={() => { setDone(true); if (m.fresh) onStreamed?.(m.id); }}
          />
          {done && m.card && (
            <FadeIn from={14} scaleFrom={0.97} duration={380}>
              <MessageCard card={m.card} schedule={schedule} onAction={(a) => onAction(m, a)} />
            </FadeIn>
          )}
          {done && m.note && (
            <FadeIn delay={150} from={6}>
              <T size={14} color={C.textSub} style={{ lineHeight: 21 }}>{m.note}</T>
            </FadeIn>
          )}
        </View>
      </View>
    </FadeIn>
  );
}

// ── 카드 ────────────────────────────────────────────
function MessageCard({ card, schedule, onAction }) {
  if (card.type === 'schedule') return <ScheduleCard card={card} schedule={schedule} onAction={onAction} />;
  if (card.type === 'rule') return <RuleCard card={card} onAction={onAction} />;
  if (card.type === 'evidence') return <EvidenceCard card={card} />;
  if (card.type === 'list') return <ListCard card={card} onAction={onAction} />;
  if (card.type === 'control') return <LinkButton label="제어 탭으로 가기" onPress={() => onAction('go:control')} />;
  return null;
}

function CardHead({ icon: Icon, bg, fg, title, right }) {
  return (
    <View style={s.cardHead}>
      <View style={[s.icon, { backgroundColor: bg }]}><Icon size={16} color={fg} strokeWidth={2.2} /></View>
      <T w={800} size={14} style={{ flex: 1 }}>{title}</T>
      {right}
    </View>
  );
}

function Row({ k, v, color }) {
  return (
    <View style={s.kv}>
      <T size={14} color={C.textSub}>{k}</T>
      <T w={700} size={14} color={color ?? C.text} style={{ flexShrink: 1, textAlign: 'right' }}>{v}</T>
    </View>
  );
}

function Btn({ label, primary, onPress }) {
  return (
    <PressScale onPress={onPress} style={[s.btn, primary && s.btnPri]} accessibilityRole="button">
      {primary && <Gradient colors={GRAD.brand} dir="horizontal" />}
      <T w={800} size={15} color={primary ? '#fff' : C.text}>{label}</T>
    </PressScale>
  );
}

function LinkButton({ label, onPress }) {
  return (
    <PressScale onPress={onPress} style={s.link} accessibilityRole="button">
      <T w={800} size={14} color={C.primaryDeep}>{label}</T>
      <ChevronRight size={18} color={C.primaryDeep} />
    </PressScale>
  );
}

// "1분 뒤", "남은 0:42"처럼 매초 바뀌는 시간
function useNow(active) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}
const mmss = (ms) => {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
};
const relative = (ms) => {
  const min = Math.round(ms / 60000);
  if (ms < 60000) return `${Math.max(1, Math.round(ms / 1000))}초 뒤`;
  if (min < 60) return `${min}분 뒤`;
  return `${Math.floor(min / 60)}시간 ${min % 60 ? `${min % 60}분 ` : ''}뒤`;
};

function ScheduleCard({ card, schedule, onAction }) {
  const pending = schedule?.status === 'pending';
  const now = useNow(!card.status || pending);
  const label = `${DEVICE_NAME[card.device]} ${ACTION_NAME[card.action]}`;

  // ① 아직 확인 전: 예약 내용 + [취소] [예약하기]
  if (!card.status) {
    return (
      <View style={s.card}>
        <CardHead icon={Clock} bg={C.primarySoft} fg={C.primaryDeep} title="예약 확인" />
        <Row k="대상" v={`${card.roomName} ${DEVICE_NAME[card.device]}`} />
        <Row k="동작" v={ACTION_NAME[card.action]} color={C.primaryDeep} />
        <Row k="실행 시각" v={`오늘 ${hhmm(card.at)} (${relative(card.at - now)})`} />
        {card.warn && <Note tone="warn" text={card.warn} />}
        <Note text="실행 직전에 장치 연결과 공기 상태를 한 번 더 확인해요." />
        <View style={s.btns}>
          <Btn label="취소" onPress={() => onAction('schedule:dismiss')} />
          <Btn label="예약하기" primary onPress={() => onAction('schedule:book')} />
        </View>
      </View>
    );
  }
  // ② 확인 전에 취소함
  if (card.status === 'dismissed') {
    return <Muted text={`${label} 예약을 하지 않았어요`} />;
  }
  // ③ 예약됨 → 대기 / 완료 / 건너뜀 / 취소
  const st = schedule?.status ?? 'pending';
  const view = {
    pending: { icon: Clock, bg: C.primarySoft, fg: C.primaryDeep, title: `예약됨 · ${hhmm(card.at)} ${label}`, sub: `${mmss(card.at - now)} 남음` },
    done: { icon: Check, bg: C.okBg, fg: C.okText, title: `실행 완료 · ${hhmm(card.at)} ${label}`, sub: '장치 응답까지 확인했어요' },
    skipped: { icon: ShieldCheck, bg: C.warnBg, fg: C.warnText, title: `실행 안 함 · ${hhmm(card.at)} ${label}`, sub: schedule?.reason },
    canceled: { icon: X, bg: C.bg, fg: C.textSub, title: `취소된 예약 · ${hhmm(card.at)} ${label}`, sub: '내 자동화에서 취소했어요' },
  }[st];
  return (
    <View style={[s.card, { gap: 8 }]}>
      <CardHead icon={view.icon} bg={view.bg} fg={view.fg} title={view.title} />
      <View style={s.statusRow}>
        <T size={13} color={C.textSub} style={{ flex: 1 }}>{view.sub}</T>
        {st === 'pending' && (
          <Pressable onPress={() => onAction('schedule:cancel')} accessibilityRole="button" hitSlop={8}>
            <T w={800} size={13} color={C.badText}>예약 취소</T>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function RuleCard({ card, onAction }) {
  if (card.status === 'replaced') return <Muted text={`‘${card.name}’ 초안은 새 버전으로 바뀌었어요`} />;
  return (
    <View style={s.card}>
      <CardHead icon={ListChecks} bg={PURPLE_BG} fg={PURPLE} title={`새 규칙 · ${card.name}`} />
      <Block label="언제" text={card.when} bg={C.bg} fg={C.textSub} />
      <Block label="동작" text={card.action} bg={C.primarySoft} fg={C.primaryDeep} />
      <Block label="예외 · 안전 조건" text={card.except} bg={C.warnBg} fg={C.warnText} shield />
      <Note text={card.preview} />
      {card.status === 'added' ? (
        <View style={[s.added]}>
          <Check size={16} color={C.okText} strokeWidth={3} />
          <T w={700} size={13} color={C.okText}>규칙을 추가했어요 · 내 자동화에서 관리</T>
        </View>
      ) : (
        <View style={s.btns}>
          <Btn label="고치기" onPress={() => onAction('rule:edit')} />
          <Btn label="규칙 추가" primary onPress={() => onAction('rule:add')} />
        </View>
      )}
    </View>
  );
}

function Block({ label, text, bg, fg, shield }) {
  return (
    <View style={[s.block, { backgroundColor: bg }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {shield && <ShieldCheck size={12} color={fg} strokeWidth={2.4} />}
        <T w={800} size={11} color={fg}>{label}</T>
      </View>
      <T w={700} size={14} style={{ lineHeight: 20 }}>{text}</T>
    </View>
  );
}

function EvidenceCard({ card }) {
  const dot = { primary: C.primaryDeep, ok: C.ok };
  return (
    <View style={[s.card, { gap: 10 }]}>
      <CardHead icon={ScrollText} bg={C.bg} fg="#4a5570" title="근거 기록" />
      {card.items.map((it, i) => (
        <FadeIn key={i} delay={i * 90} from={6}>
          <View style={s.tl}>
            <T w={700} size={13} color={C.textSub} style={{ width: 42 }}>{it.time}</T>
            <View style={[s.tlDot, { backgroundColor: dot[it.tone] }]} />
            <T size={13} style={{ flex: 1, lineHeight: 19 }}>{it.text}</T>
          </View>
        </FadeIn>
      ))}
    </View>
  );
}

function ListCard({ card, onAction }) {
  return (
    <View style={[s.card, { gap: 8 }]}>
      {card.items.map((it, i) => (
        <View key={i} style={s.listRow}>
          {it.icon === 'clock' ? <Clock size={16} color={C.primaryDeep} /> : <ListChecks size={16} color={PURPLE} />}
          <T w={700} size={14}>{it.text}</T>
        </View>
      ))}
      <LinkButton label="내 자동화 열기" onPress={() => onAction('open:automations')} />
    </View>
  );
}

function Note({ text, tone }) {
  const color = tone === 'warn' ? C.warnText : C.textSub;
  return (
    <View style={s.note}>
      <ShieldCheck size={14} color={color} style={{ marginTop: 2 }} />
      <T size={12} color={color} style={{ flex: 1, lineHeight: 18 }}>{text}</T>
    </View>
  );
}

function Muted({ text }) {
  return (
    <View style={[s.card, { paddingVertical: 12, backgroundColor: C.bg, borderStyle: 'dashed' }]}>
      <T size={13} color={C.textSub}>{text}</T>
    </View>
  );
}

// ── 내 자동화 (아래에서 올라오는 시트) ─────────────────────
export function AutomationsSheet({ visible, onClose, schedules, rules, onCancel, onToggle }) {
  const now = useNow(visible);
  const order = { pending: 0, done: 1, skipped: 2, canceled: 3 };
  const list = [...schedules].sort((a, b) => order[a.status] - order[b.status] || b.at - a.at);
  const STATUS = {
    done: { text: '완료', bg: C.okBg, fg: C.okText },
    skipped: { text: '실행 안 함', bg: C.warnBg, fg: C.warnText },
    canceled: { text: '취소됨', bg: C.bg, fg: C.textSub },
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel="닫기" />
      <View style={s.sheet}>
        <View style={s.grab} />
        <View style={s.sheetHead}>
          <T w={800} size={21}>내 자동화</T>
          <PressScale onPress={onClose} style={s.close} accessibilityRole="button" accessibilityLabel="닫기">
            <X size={20} color={C.text} />
          </PressScale>
        </View>
        <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
          <View style={s.sec}>
            <T w={700} size={13} color={C.textSub}>예약</T>
            {list.length === 0 && <T size={14} color={C.textSub} style={{ paddingVertical: 8 }}>아직 예약이 없어요. “1분 뒤에 청정기 켜줘”처럼 말해 보세요.</T>}
            {list.map((sc) => (
              <View key={sc.id} style={[s.item, sc.status !== 'pending' && { opacity: 0.7 }]}>
                <View style={[s.itemIcon, { backgroundColor: sc.status === 'pending' ? C.primarySoft : C.bg }]}>
                  <Clock size={20} color={sc.status === 'pending' ? C.primaryDeep : C.textSub} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <T w={800} size={15}>{`${hhmm(sc.at)} ${DEVICE_NAME[sc.device]} ${ACTION_NAME[sc.action]}`}</T>
                  <T size={12} color={C.textSub} numberOfLines={1}>
                    {sc.status === 'pending' ? `${mmss(sc.at - now)} 남음 · “${sc.quote}”` : `“${sc.quote}”`}
                  </T>
                </View>
                {sc.status === 'pending' ? (
                  <PressScale onPress={() => onCancel(sc.id)} style={s.cancel} accessibilityRole="button" accessibilityLabel={`${hhmm(sc.at)} 예약 취소`}>
                    <T w={800} size={13} color={C.badText}>취소</T>
                  </PressScale>
                ) : (
                  <View style={[s.pill, { backgroundColor: STATUS[sc.status].bg }]}>
                    <T w={800} size={12} color={STATUS[sc.status].fg}>{STATUS[sc.status].text}</T>
                  </View>
                )}
              </View>
            ))}
          </View>

          <View style={s.sec}>
            <T w={700} size={13} color={C.textSub}>내가 만든 규칙</T>
            {rules.length === 0 && <T size={14} color={C.textSub} style={{ paddingVertical: 8 }}>아직 규칙이 없어요. “시험 시간엔 청정기 꺼줘”처럼 말해 보세요.</T>}
            {rules.map((r) => (
              <View key={r.id} style={s.item}>
                <View style={[s.itemIcon, { backgroundColor: PURPLE_BG }]}><ListChecks size={20} color={PURPLE} /></View>
                <View style={{ flex: 1, gap: 3 }}>
                  <T w={800} size={15}>{r.name}</T>
                  <T size={12} color={C.textSub}>{r.summary}</T>
                  <View style={s.quote}><T size={12} color={PURPLE} numberOfLines={2}>{`“${r.quote}”`}</T></View>
                </View>
                <Switch label={`${r.name} 규칙`} value={r.on} onValueChange={() => onToggle(r.id)} />
              </View>
            ))}
            {rules.length > 0 && (
              <T size={12} color={C.textSub} style={{ marginTop: 4 }}>지금은 프로토타입이라 규칙은 저장만 돼요. 서버 규칙 엔진이 연결되면 실제로 동작해요.</T>
            )}
          </View>

          <View style={[s.sec, { flexDirection: 'row', gap: 12, alignItems: 'center' }]}>
            <View style={[s.itemIcon, { backgroundColor: C.warnBg }]}><ShieldCheck size={20} color={C.warnText} /></View>
            <View style={{ flex: 1, gap: 2 }}>
              <T w={800} size={15}>학교 기본 규칙이 항상 먼저예요</T>
              <T size={12} color={C.textSub} style={{ lineHeight: 18 }}>실내 PM2.5 35↑ 청정기 켜기 같은 안전 기준은 행정실이 관리해요. 내가 만든 규칙은 이 기준을 넘을 수 없어요.</T>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  aiRow: { flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  aiBody: { flex: 1, minWidth: 0, gap: 10, paddingTop: 4 },
  typing: { flexDirection: 'row', gap: 5, alignItems: 'center', backgroundColor: C.surface, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1, borderColor: C.border },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.primary },
  me: { overflow: 'hidden', borderRadius: 20, borderBottomRightRadius: 6, paddingHorizontal: 15, paddingVertical: 11 },
  event: { flexDirection: 'row', gap: 10, alignItems: 'center', borderRadius: 14, paddingHorizontal: 13, paddingVertical: 11 },
  icon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 14, gap: 10, ...shadow },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 7, borderTopWidth: 1, borderTopColor: '#eef1f7' },
  btns: { flexDirection: 'row', gap: 8, marginTop: 2 },
  btn: { flex: 1, minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: '#d5ddf0', backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  btnPri: { borderWidth: 0, overflow: 'hidden' },
  link: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.primarySoft, borderRadius: 12, paddingHorizontal: 14, minHeight: 46 },
  note: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  block: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 3 },
  added: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.okBg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11 },
  tl: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tlDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  // RN 0.88에는 StyleSheet.absoluteFillObject가 없어서 위치를 직접 적음
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(20, 28, 45, 0.35)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '86%', backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 8 },
  grab: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: '#cfd6e4', marginBottom: 8 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingBottom: 12 },
  close: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  sec: { backgroundColor: C.surface, borderRadius: 22, padding: 16, gap: 4, ...shadow },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#eef1f7' },
  itemIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cancel: { borderWidth: 1, borderColor: '#d5ddf0', borderRadius: 10, minHeight: 36, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  pill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  quote: { alignSelf: 'flex-start', backgroundColor: '#f6f3ff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginTop: 2 },
});
