// 회원가입 (S-B): ① 학교·교실 → ② 계정 만들기 → ③ 본인 확인(학교 이메일 + 약관) → 가입 완료(행정실 승인 대기)
// 단계끼리 입력값은 이 화면 하나가 들고 있어서, 뒤로 가도 지워지지 않음
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Check, Clock, Mail, School, Search, User } from 'lucide-react-native';
import { C } from '../theme';
import { T } from '../ui';
import { FadeIn } from '../motion';
import {
  DEMO_CODE, checkId, codeOk, emailOk, idProblem, pwOk, roomGroups, schoolName, searchSchools, sendCode, signup,
} from './authApi';
import { Btn, CheckRow, CodeBoxes, Field, Notice, PwRules, Screen, TopBar } from './parts';
import { useCountdown } from './useCountdown';

const TERMS = [
  { key: 'service', label: '[필수] 서비스 이용약관', required: true },
  { key: 'privacy', label: '[필수] 개인정보 수집·이용', required: true },
  { key: 'alert', label: '[선택] 공기질 알림 받기', required: false },
];

export default function Signup({ nav }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    query: '', schoolId: null, roomIds: [],
    name: '', id: '', idChecked: null, pw: '', pw2: '',
    email: '', code: '', sent: 0, terms: {},
  });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const back = () => (step > 1 && step < 4 ? setStep(step - 1) : nav.back());

  if (step === 4) return <Done form={form} onLogin={() => nav.reset('login', { id: form.id.trim().toLowerCase() })} />;
  return (
    <Screen
      top={<TopBar title="회원가입" onBack={back} step={step} />}
      footer={step === 1 ? <Step1Footer form={form} next={() => setStep(2)} />
        : step === 2 ? <Step2Footer form={form} next={() => setStep(3)} />
          : <Step3Footer form={form} done={() => setStep(4)} />}
    >
      <FadeIn key={step} from={10} duration={300} style={s.body}>
        {step === 1 && <Step1 form={form} set={set} />}
        {step === 2 && <Step2 form={form} set={set} />}
        {step === 3 && <Step3 form={form} set={set} />}
      </FadeIn>
    </Screen>
  );
}

// ① 학교 검색 → 담당 교실(여러 개)
function Step1({ form, set }) {
  const list = searchSchools(form.query);
  const chosen = list.find((x) => x.id === form.schoolId) ?? null;
  return (
    <>
      <T w={800} size={20} accessibilityRole="header">어느 학교 선생님이세요?</T>
      <T size={14.5} color={C.textSub} style={{ marginTop: 4 }}>담당 교실의 공기를 바로 보여 드릴게요.</T>
      <Field label="학교" icon={Search} placeholder="학교 이름으로 검색" value={form.query} onChangeText={(t) => set({ query: t })} style={{ marginTop: 6 }} />
      <View style={s.list}>
        {list.length === 0 && <T size={13.5} color={C.textSub} style={{ padding: 14 }}>검색 결과가 없어요.</T>}
        {list.map((sc, i) => {
          const on = sc.id === form.schoolId;
          return (
            <Pressable
              key={sc.id} onPress={() => set({ schoolId: sc.id, roomIds: [] })} style={[s.school, i > 0 && s.divider]}
              accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${sc.name}, ${sc.addr}`}
            >
              <School size={20} color={on ? C.primary : '#9aa3b8'} />
              <View style={{ flex: 1 }}>
                <T w={700} size={15}>{sc.name}</T>
                <T size={12.5} color={C.textSub}>{sc.addr}</T>
              </View>
              {on ? <Check size={18} color={C.primary} strokeWidth={2.6} /> : null}
            </Pressable>
          );
        })}
      </View>

      {chosen && !chosen.ready && (
        <Notice style={{ marginTop: 14 }}>이 학교는 아직 AirClass 교실이 등록되지 않았어요. 행정실에 먼저 문의해 주세요.</Notice>
      )}
      {chosen?.ready && (
        <>
          <T w={700} size={13} color="#4a5570" style={{ marginTop: 22 }}>
            담당 교실 <T size={13} color="#9aa3b8">(여러 개 선택 가능)</T>
          </T>
          {roomGroups().map((g) => (
            <View key={g.title} style={{ marginTop: 10 }}>
              <T w={600} size={12} color={C.textSub} style={{ marginBottom: 6 }}>{g.title}</T>
              <View style={s.chips}>
                {g.rooms.map((r) => {
                  const on = form.roomIds.includes(r.id);
                  return (
                    <Pressable
                      key={r.id} style={[s.chip, on && s.chipOn]}
                      onPress={() => set({ roomIds: on ? form.roomIds.filter((x) => x !== r.id) : [...form.roomIds, r.id] })}
                      accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={r.name}
                    >
                      <T w={700} size={13.5} color={on ? C.primaryDeep : '#4a5570'}>{r.short}</T>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </>
      )}
    </>
  );
}
function Step1Footer({ form, next }) {
  const ready = searchSchools('').find((x) => x.id === form.schoolId)?.ready;
  const ok = ready && form.roomIds.length > 0;
  return <Btn title={ok ? `다음 (교실 ${form.roomIds.length}개)` : '다음'} onPress={next} disabled={!ok} />;
}

// ② 이름 · 아이디(중복 확인) · 비밀번호(조건 표시) · 비밀번호 확인
function Step2({ form, set }) {
  const [checking, setChecking] = useState(false);
  const id = form.id.trim().toLowerCase();
  const local = id ? idProblem(id) : null;
  const check = async () => {
    setChecking(true);
    const r = await checkId(id);
    setChecking(false);
    set({ idChecked: r.ok ? { id, ok: true } : { id, ok: false, message: r.message } });
  };
  const checked = form.idChecked?.id === id ? form.idChecked : null; // 아이디를 고치면 다시 확인
  const idState = checked ? (checked.ok ? 'ok' : 'err') : local && id.length >= 4 ? 'err' : null;
  const idHelp = checked ? (checked.ok ? '사용할 수 있는 아이디예요.' : checked.message) : local && id.length >= 4 ? local : '영문 소문자로 시작, 4~16자';
  const pw2State = form.pw2 ? (form.pw2 === form.pw ? 'ok' : 'err') : null;
  return (
    <>
      <T w={800} size={20} accessibilityRole="header">로그인할 계정을 만들어요</T>
      <Field label="이름" icon={User} placeholder="예: 이지은" value={form.name} onChangeText={(t) => set({ name: t })} textContentType="name" autoCapitalize="words" />
      <Field
        label="아이디" placeholder="아이디" value={form.id} onChangeText={(t) => set({ id: t })} state={idState} help={idHelp} textContentType="username"
        right={<Btn small variant="ghost" title={checked?.ok ? '확인 완료' : '중복 확인'} onPress={check} loading={checking} disabled={!id || !!local || checked?.ok} style={{ width: 96 }} />}
      />
      <Field label="비밀번호" placeholder="비밀번호" secure value={form.pw} onChangeText={(t) => set({ pw: t })} textContentType="newPassword" />
      <PwRules pw={form.pw} />
      <Field
        label="비밀번호 확인" placeholder="비밀번호를 한 번 더 입력" secure value={form.pw2} onChangeText={(t) => set({ pw2: t })}
        state={pw2State} help={pw2State === 'ok' ? '비밀번호가 같아요.' : pw2State === 'err' ? '비밀번호가 달라요.' : null}
      />
    </>
  );
}
function Step2Footer({ form, next }) {
  const id = form.id.trim().toLowerCase();
  const ok = form.name.trim() && form.idChecked?.id === id && form.idChecked.ok && pwOk(form.pw) && form.pw === form.pw2;
  return (
    <>
      <Btn title="다음" onPress={next} disabled={!ok} />
      {!ok && <T size={12.5} color={C.textSub} style={s.footHint}>아이디 중복 확인과 비밀번호 조건을 모두 채우면 넘어가요.</T>}
    </>
  );
}

// ③ 학교 이메일 인증 + 약관
function Step3({ form, set }) {
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState(null);
  const timer = useCountdown(form.sent, 300);
  const send = async () => {
    setSending(true);
    const r = await sendCode(form.email);
    setSending(false);
    if (!r.ok) { setErr(r.message); return; }
    setErr(null);
    set({ sent: Date.now(), code: '' });
  };
  const allOn = TERMS.every((t) => form.terms[t.key]);
  const codeState = form.code.length === 6 ? (codeOk(form.code) ? 'ok' : 'err') : null;
  return (
    <>
      <T w={800} size={20} accessibilityRole="header">선생님인지 확인할게요</T>
      <T size={14.5} color={C.textSub} style={{ marginTop: 4 }}>학교 이메일로 받은 6자리 코드를 입력해 주세요.</T>
      <Field
        label="학교 이메일" icon={Mail} placeholder="예: name@sen.go.kr" value={form.email} keyboardType="email-address" textContentType="emailAddress"
        onChangeText={(t) => { set({ email: t }); setErr(null); }} state={err ? 'err' : null} help={err}
        right={<Btn small variant="ghost" title={form.sent ? '재전송' : '코드 받기'} onPress={send} loading={sending} disabled={!emailOk(form.email)} style={{ width: 92 }} />}
      />
      {form.sent ? (
        <>
          <Notice style={{ marginTop: 12 }}>인증 코드를 보냈어요. 시연용 코드는 {DEMO_CODE}이에요.</Notice>
          <T w={700} size={13} color="#4a5570" style={{ marginTop: 16, marginBottom: 6 }}>인증 코드</T>
          <CodeBoxes value={form.code} onChange={(t) => set({ code: t })} disabled={timer.left === 0} />
          <T size={12.5} color={codeState === 'err' ? C.badText : codeState === 'ok' ? C.okText : C.textSub} style={{ marginTop: 6 }}>
            {codeState === 'ok' ? '인증됐어요.' : codeState === 'err' ? '코드가 맞지 않아요.' : timer.left ? `남은 시간 ${timer.text}` : '시간이 지났어요. 재전송을 눌러 주세요.'}
          </T>
        </>
      ) : null}

      <View style={s.terms}>
        <CheckRow bold on={allOn} label="전체 동의" onPress={() => set({ terms: Object.fromEntries(TERMS.map((t) => [t.key, !allOn])) })} />
        <View style={[s.divider, { marginVertical: 8 }]} />
        {TERMS.map((t) => (
          <CheckRow key={t.key} on={!!form.terms[t.key]} label={t.label} onPress={() => set({ terms: { ...form.terms, [t.key]: !form.terms[t.key] } })} style={{ marginVertical: 2 }} />
        ))}
      </View>
    </>
  );
}
function Step3Footer({ form, done }) {
  const [busy, setBusy] = useState(false);
  const ok = form.sent && codeOk(form.code) && TERMS.filter((t) => t.required).every((t) => form.terms[t.key]);
  const submit = async () => {
    setBusy(true);
    await signup({ name: form.name, id: form.id, pw: form.pw, email: form.email, schoolId: form.schoolId, roomIds: form.roomIds });
    setBusy(false);
    done();
  };
  return <Btn title="가입 완료" variant="grad" onPress={submit} disabled={!ok} loading={busy} />;
}

// 가입 완료: 행정실 승인 대기 안내 + 요약
function Done({ form, onLogin }) {
  const rooms = roomGroups().flatMap((g) => g.rooms).filter((r) => form.roomIds.includes(r.id)).map((r) => r.name);
  const rows = [['학교', schoolName(form.schoolId)], ['담당 교실', rooms.join(', ')], ['아이디', form.id.trim().toLowerCase()]];
  return (
    <Screen footer={<Btn title="로그인 화면으로" onPress={onLogin} />}>
      <FadeIn from={16} style={[s.body, { alignItems: 'center', paddingTop: 100 }]}>
        <View style={s.doneIcon}><Clock size={46} color={C.primary} /></View>
        <T w={800} size={26} style={{ marginTop: 24 }} accessibilityRole="header">가입 신청이 끝났어요</T>
        <T size={14.5} color={C.textSub} style={{ marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
          행정실에서 확인하면 바로 쓸 수 있어요.{'\n'}승인되면 알림으로 알려 드릴게요.
        </T>
        <View style={s.summary}>
          {rows.map(([k, v]) => (
            <View key={k} style={s.sumRow}>
              <T size={14} color={C.textSub}>{k}</T>
              <T w={700} size={15} style={{ flex: 1, textAlign: 'right' }} numberOfLines={2}>{v}</T>
            </View>
          ))}
        </View>
      </FadeIn>
    </Screen>
  );
}

const s = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingTop: 22 },
  list: { marginTop: 8, borderRadius: 16, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 14 },
  school: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: C.border },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: '#dfe5f2', backgroundColor: C.surface },
  chipOn: { backgroundColor: C.primarySoft, borderColor: C.primary },
  footHint: { textAlign: 'center', marginTop: 10 },
  terms: { marginTop: 24, borderRadius: 16, borderWidth: 1.5, borderColor: C.border, padding: 14 },
  doneIcon: { width: 96, height: 96, borderRadius: 30, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  summary: { alignSelf: 'stretch', marginTop: 28, borderRadius: 16, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 16, paddingVertical: 8 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 7 },
});
