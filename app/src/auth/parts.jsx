// 인증 화면 공용 부품: 화면 틀, 상단 바, 입력칸, 버튼, 체크박스, 비밀번호 조건, 인증 코드 칸, 안내 상자
import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronLeft, Eye, EyeOff, Info } from 'lucide-react-native';
import { Gradient } from '../Gradient';
import { C, FONT, GRAD } from '../theme';
import { T } from '../ui';
import { PressScale } from '../motion';
import { pwRules } from './authApi';

// 화면 틀: 내용은 스크롤, footer(버튼)는 내용이 짧으면 화면 아래에 붙음.
// iOS는 키보드가 올라오면 automaticallyAdjustKeyboardInsets로 내용이 가려지지 않게 밀려 올라감.
// padBottom=false: 아래 안전 여백을 화면이 직접 채울 때 (로그인 시트처럼 바닥까지 칠해야 할 때)
export function Screen({ children, footer, top, bg = C.surface, padTop = true, padBottom = true }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {top}
      {/* 내용이 화면보다 짧으면 끌어도 출렁이지 않게 (키보드가 올라와 넘칠 때만 스크롤) */}
      <ScrollView
        style={{ flex: 1 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
        alwaysBounceVertical={false} bounces={false} overScrollMode="never"
        contentContainerStyle={{ flexGrow: 1, paddingTop: padTop && !top ? insets.top : 0, paddingBottom: padBottom ? Math.max(insets.bottom, 16) + 8 : 0 }}
      >
        <View style={{ flex: 1 }}>{children}</View>
        {footer ? <View style={s.footer}>{footer}</View> : null}
      </ScrollView>
    </View>
  );
}

// 상단 바: 뒤로 + 가운데 제목 + (단계형이면) 진행 막대
export function TopBar({ title, onBack, step, steps = 3 }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top, backgroundColor: C.surface }}>
      <View style={s.topBar}>
        <Pressable onPress={onBack} hitSlop={10} style={s.back} accessibilityRole="button" accessibilityLabel="뒤로">
          <ChevronLeft size={26} color={C.text} />
        </Pressable>
        <T w={700} size={16} style={{ flex: 1, textAlign: 'center', marginRight: 44 }}>{title}</T>
      </View>
      {step ? (
        <View style={s.prog} accessible accessibilityLabel={`${steps}단계 중 ${step}단계`}>
          {Array.from({ length: steps }, (_, i) => <View key={i} style={[s.progBar, i < step && s.progOn]} />)}
        </View>
      ) : null}
    </View>
  );
}

// 입력칸. state: 'ok'(초록) | 'err'(빨강) | null, help: 아래 안내 문구, secure: 비밀번호(눈 버튼)
export function Field({ label, icon: Icon, state, help, secure, right, editable = true, style, ...input }) {
  const [focus, setFocus] = useState(false);
  const [show, setShow] = useState(false);
  const ref = useRef(null);
  const border = state === 'err' ? C.bad : state === 'ok' ? C.ok : focus ? C.primary : '#dfe5f2';
  return (
    <View style={style}>
      {label ? <T w={700} size={13} color="#4a5570" style={s.label}>{label}</T> : null}
      <View style={s.fieldRow}>
        {/* 상자 어디를 눌러도 입력칸에 포커스 (아이콘·여백을 눌러도 키보드가 올라옴) */}
        <Pressable onPress={() => ref.current?.focus()} disabled={!editable} accessible={false}
          style={[s.field, { borderColor: border }, focus && !state && s.fieldFocus, !editable && s.fieldOff]}>
          {Icon ? <View style={s.icon}><Icon size={20} color={state === 'err' ? C.bad : focus ? C.primary : '#9aa3b8'} /></View> : null}
          <TextInput
            autoCapitalize="none" autoCorrect={false} // 기본값 (넘겨받은 값이 있으면 그걸 씀)
            {...input} ref={ref} editable={editable}
            secureTextEntry={secure && !show}
            onFocus={(e) => { setFocus(true); input.onFocus?.(e); }}
            onBlur={(e) => { setFocus(false); input.onBlur?.(e); }}
            placeholderTextColor="#9aa3b8"
            style={s.input}
            accessibilityLabel={label ?? input.placeholder}
          />
          {secure ? (
            <Pressable onPress={() => setShow((v) => !v)} hitSlop={8} accessibilityRole="button" accessibilityLabel={show ? '비밀번호 숨기기' : '비밀번호 보기'}>
              {show ? <Eye size={20} color="#9aa3b8" /> : <EyeOff size={20} color="#b4bccd" />}
            </Pressable>
          ) : null}
          {state === 'ok' && !secure ? <Check size={18} color={C.ok} strokeWidth={2.6} /> : null}
        </Pressable>
        {right}
      </View>
      {help ? <T size={12.5} color={state === 'err' ? C.badText : state === 'ok' ? C.okText : C.textSub} style={{ marginTop: 6 }}>{help}</T> : null}
    </View>
  );
}

// 버튼. variant: grad(브랜드 그라데이션) | flat(파랑) | ghost(연파랑) | line(테두리)
export function Btn({ title, onPress, variant = 'flat', disabled, loading, small, style }) {
  const off = disabled || loading;
  const fg = variant === 'ghost' ? C.primaryDeep : variant === 'line' ? C.text : '#fff';
  return (
    <PressScale
      onPress={off ? undefined : onPress} scaleTo={off ? 1 : 0.97}
      style={[s.btn, small && s.btnSmall, s[variant], off && variant !== 'ghost' && variant !== 'line' && s.btnOff, off && (variant === 'ghost' || variant === 'line') && { opacity: 0.5 }, style]}
      accessibilityRole="button" accessibilityState={{ disabled: !!off, busy: !!loading }} accessibilityLabel={title}
    >
      {variant === 'grad' && !off ? <Gradient colors={GRAD.brand} /> : null}
      {loading ? <ActivityIndicator color={fg} /> : <T w={700} size={small ? 14 : 16.5} color={fg}>{title}</T>}
    </PressScale>
  );
}

// 체크박스 한 줄
export function CheckRow({ on, onPress, label, bold, style }) {
  return (
    <Pressable onPress={onPress} hitSlop={4} style={[s.checkRow, style]} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={label}>
      <View style={[s.cb, on && s.cbOn]}>{on ? <Check size={14} color="#fff" strokeWidth={3} /> : null}</View>
      <T w={bold ? 700 : 500} size={bold ? 15 : 14} color={bold ? C.text : '#4a5570'}>{label}</T>
    </Pressable>
  );
}

// 비밀번호 조건: 입력하는 대로 초록 체크로 바뀜
export function PwRules({ pw }) {
  return (
    <View style={s.rules}>
      {pwRules(pw).map((r) => (
        <View key={r.label} style={s.rule} accessible accessibilityLabel={`${r.label} ${r.ok ? '충족' : '미충족'}`}>
          <Check size={13} color={r.ok ? C.ok : '#c8d1e3'} strokeWidth={3} />
          <T w={600} size={12.5} color={r.ok ? C.okText : '#9aa3b8'}>{r.label}</T>
        </View>
      ))}
    </View>
  );
}

// 인증 코드 6칸: 보이지 않는 입력칸 하나에 숫자를 받고, 칸 6개에 나눠 보여 줌
export function CodeBoxes({ value, onChange, disabled }) {
  const ref = useRef(null);
  const [focus, setFocus] = useState(false);
  return (
    <Pressable onPress={() => ref.current?.focus()} disabled={disabled} accessibilityLabel="인증 코드 6자리">
      <View style={s.code}>
        {Array.from({ length: 6 }, (_, i) => {
          const cur = focus && i === Math.min(value.length, 5);
          return (
            <View key={i} style={[s.codeBox, cur && s.fieldFocus, cur && { borderColor: C.primary }, disabled && s.fieldOff]}>
              <T w={800} size={24}>{value[i] ?? ''}</T>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={ref} value={value} editable={!disabled} maxLength={6} keyboardType="number-pad" textContentType="oneTimeCode"
        onChangeText={(t) => onChange(t.replace(/\D/g, ''))} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={s.hiddenInput} caretHidden
      />
    </Pressable>
  );
}

// 안내 상자 (tone: info 파랑 | ok 초록 | err 빨강)
export function Notice({ tone = 'info', children, style }) {
  const c = { info: [C.primarySoft, C.primaryDeep], ok: [C.okBg, C.okText], err: [C.badBg, C.badText] }[tone];
  return (
    <View style={[s.notice, { backgroundColor: c[0] }, style]} accessibilityLiveRegion="polite">
      <Info size={16} color={c[1]} />
      <T size={13} color={c[1]} style={{ flex: 1, lineHeight: 19 }}>{children}</T>
    </View>
  );
}

const s = StyleSheet.create({
  footer: { paddingHorizontal: 20, paddingTop: 16 },
  topBar: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  prog: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingBottom: 4 },
  progBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#dfe5f2' },
  progOn: { backgroundColor: C.primary },
  label: { marginTop: 16, marginBottom: 6 },
  fieldRow: { flexDirection: 'row', gap: 8 },
  field: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1.5, backgroundColor: C.surface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 },
  icon: { flexShrink: 0 },
  fieldFocus: { shadowColor: C.primary, shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  fieldOff: { backgroundColor: C.bg, borderColor: C.bg },
  // minWidth 0: 웹에서 입력칸 기본 폭 때문에 아이콘·눈 버튼이 밖으로 밀리지 않게
  // 높이는 고정값(48)으로: 퍼센트 높이는 기기마다 계산이 달라질 수 있음. outlineStyle은 웹에서만 (네이티브는 'none'을 모름)
  input: { flex: 1, minWidth: 0, height: 48, fontFamily: FONT[500], fontSize: 15.5, color: C.text, paddingVertical: 0, ...Platform.select({ web: { outlineStyle: 'none' }, default: {} }) },
  btn: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  btnSmall: { height: 52, paddingHorizontal: 14, borderRadius: 14 },
  grad: { backgroundColor: C.primary },
  flat: { backgroundColor: C.primary },
  ghost: { backgroundColor: C.primarySoft },
  line: { backgroundColor: C.surface, borderWidth: 1.5, borderColor: '#dfe5f2' },
  btnOff: { backgroundColor: '#d5ddf0' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  cb: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: '#c8d1e3', alignItems: 'center', justifyContent: 'center' },
  cbOn: { backgroundColor: C.primary, borderColor: C.primary },
  rules: { flexDirection: 'row', gap: 12, marginTop: 8 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  code: { flexDirection: 'row', gap: 8 },
  codeBox: { flex: 1, height: 58, borderRadius: 14, borderWidth: 1.5, borderColor: '#dfe5f2', backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  notice: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 12, alignItems: 'flex-start' },
});
