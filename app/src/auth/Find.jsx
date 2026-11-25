// 계정 찾기 (F-B): 먼저 무엇을 잊었는지 고르고, 각 흐름으로 들어감
// - 아이디 찾기: 이름 + 학교 이메일 + 코드 → 아이디 일부를 가려서 보여 줌
// - 비밀번호 찾기: 아이디 + 학교 이메일 + 코드 → 새 비밀번호 → 완료
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ChevronRight, CircleCheck, KeyRound, Mail, ShieldCheck, User } from 'lucide-react-native';
import { C } from '../theme';
import { T } from '../ui';
import { FadeIn, PressScale } from '../motion';
import {
  DEMO_CODE, emailOk, findId, maskId, pwOk, resetPassword, sendCode, verifyForReset,
} from './authApi';
import { Btn, CodeBoxes, Field, Notice, PwRules, Screen, TopBar } from './parts';
import { useCountdown } from './useCountdown';

// '2026-03-02' → '2026년 3월 2일'
const koDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${y}년 ${m}월 ${d}일`; };

// 무엇을 잊으셨나요?
export function FindChoose({ nav }) {
  return (
    <Screen top={<TopBar title="" onBack={nav.back} />}>
      <FadeIn from={10} style={s.body}>
        <T w={800} size={26} accessibilityRole="header">무엇을 잊으셨나요?</T>
        <T size={14.5} color={C.textSub} style={{ marginTop: 6 }}>가입할 때 쓴 학교 이메일로 확인해 드려요.</T>
        <ChoiceCard icon={User} title="아이디를 잊었어요" desc="이름과 학교 이메일로 찾기" onPress={() => nav.push('findId')} style={{ marginTop: 24 }} />
        <ChoiceCard icon={KeyRound} title="비밀번호를 잊었어요" desc="인증 후 새 비밀번호로 바꾸기" onPress={() => nav.push('findPw')} style={{ marginTop: 12 }} />
      </FadeIn>
    </Screen>
  );
}

function ChoiceCard({ icon: Icon, title, desc, onPress, style }) {
  return (
    <PressScale onPress={onPress} scaleTo={0.98} style={[s.choice, style]} accessibilityRole="button" accessibilityLabel={`${title}. ${desc}`}>
      <View style={s.choiceIcon}><Icon size={24} color={C.primary} /></View>
      <View style={{ flex: 1 }}>
        <T w={800} size={16.5}>{title}</T>
        <T size={12.5} color={C.textSub} style={{ marginTop: 3 }}>{desc}</T>
      </View>
      <ChevronRight size={20} color="#b4bccd" />
    </PressScale>
  );
}

// 이메일 + 코드 받기 + 코드 6칸 (아이디 찾기·비밀번호 찾기 공통)
function EmailCode({ email, setEmail, code, setCode, sent, setSent }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const timer = useCountdown(sent, 300);
  const send = async () => {
    setBusy(true);
    const r = await sendCode(email);
    setBusy(false);
    if (!r.ok) { setErr(r.message); return; }
    setErr(null); setCode(''); setSent(Date.now());
  };
  return (
    <>
      <Field
        label="학교 이메일" icon={Mail} placeholder="예: name@sen.go.kr" value={email} keyboardType="email-address" textContentType="emailAddress"
        onChangeText={(t) => { setEmail(t); setErr(null); }} state={err ? 'err' : null} help={err}
        right={<Btn small variant="ghost" title={sent ? '재전송' : '코드 받기'} onPress={send} loading={busy} disabled={!emailOk(email)} style={{ width: 92 }} />}
      />
      {sent ? (
        <>
          <Notice style={{ marginTop: 12 }}>인증 코드를 보냈어요. 시연용 코드는 {DEMO_CODE}이에요.</Notice>
          <T w={700} size={13} color="#4a5570" style={{ marginTop: 16, marginBottom: 6 }}>인증 코드</T>
          <CodeBoxes value={code} onChange={setCode} disabled={timer.left === 0} />
          <T size={12.5} color={C.textSub} style={{ marginTop: 6 }}>{timer.left ? `남은 시간 ${timer.text}` : '시간이 지났어요. 재전송을 눌러 주세요.'}</T>
        </>
      ) : null}
    </>
  );
}

// 아이디 찾기
export function FindId({ nav }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [found, setFound] = useState(null);

  if (found) {
    return (
      <Screen
        top={<TopBar title="아이디 찾기" onBack={nav.back} />}
        footer={(
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Btn title="비밀번호 찾기" variant="line" onPress={() => nav.replace('findPw', { id: found.id })} style={{ flex: 1 }} />
            <Btn title="로그인하기" onPress={() => nav.reset('login', { id: found.id })} style={{ flex: 1.3 }} />
          </View>
        )}
      >
        <FadeIn from={16} style={[s.body, { alignItems: 'center', paddingTop: 70 }]}>
          <View style={[s.bigIcon, { backgroundColor: C.okBg }]}><ShieldCheck size={44} color={C.ok} /></View>
          <T w={800} size={20} style={{ marginTop: 22 }} accessibilityRole="header">{found.name} 선생님의 아이디예요</T>
          <View style={s.idCard} accessible accessibilityLabel={`아이디 ${maskId(found.id)}, 일부 가림`}>
            <T w={800} size={24} style={{ letterSpacing: 1 }}>{maskId(found.id)}</T>
            <T size={12.5} color={C.textSub} style={{ marginTop: 6 }}>{koDate(found.joinedAt)} 가입 · {found.school}</T>
          </View>
          <T size={12.5} color={C.textSub} style={{ marginTop: 12 }}>개인정보 보호를 위해 일부를 가렸어요.</T>
        </FadeIn>
      </Screen>
    );
  }

  const submit = async () => {
    setBusy(true);
    const r = await findId(name, email, code);
    setBusy(false);
    if (r.ok) setFound(r); else setErr(r.message);
  };
  return (
    <Screen
      top={<TopBar title="아이디 찾기" onBack={nav.back} />}
      footer={<Btn title="아이디 확인" onPress={submit} loading={busy} disabled={!name.trim() || !sent || code.length !== 6} />}
    >
      <View style={s.body}>
        <T size={14.5} color={C.textSub} style={{ lineHeight: 22 }}>가입할 때 쓴 이름과 학교 이메일을 입력하면{'\n'}인증 코드를 보내 드려요.</T>
        <Field label="이름" icon={User} placeholder="예: 이지은" value={name} onChangeText={(t) => { setName(t); setErr(null); }} />
        <EmailCode email={email} setEmail={(t) => { setEmail(t); setErr(null); }} code={code} setCode={(t) => { setCode(t); setErr(null); }} sent={sent} setSent={setSent} />
        {err ? <Notice tone="err" style={{ marginTop: 14 }}>{err}</Notice> : null}
      </View>
    </Screen>
  );
}

// 비밀번호 찾기: verify → new → done
export function FindPw({ nav, params }) {
  const [stage, setStage] = useState('verify');
  const [id, setId] = useState(params.id ?? '');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(0);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [account, setAccount] = useState(null);

  const verify = async () => {
    setBusy(true);
    const r = await verifyForReset(id, email, code);
    setBusy(false);
    if (r.ok) { setAccount(r.id); setStage('new'); setErr(null); } else setErr(r.message);
  };
  const change = async () => {
    setBusy(true);
    const r = await resetPassword(account, pw);
    setBusy(false);
    if (r.ok) setStage('done'); else setErr(r.message);
  };

  if (stage === 'done') {
    return (
      <Screen footer={<Btn title="로그인하기" onPress={() => nav.reset('login', { id: account })} />}>
        <FadeIn from={16} style={[s.body, { alignItems: 'center', paddingTop: 120 }]}>
          <View style={[s.bigIcon, { backgroundColor: C.okBg }]}><CircleCheck size={46} color={C.ok} /></View>
          <T w={800} size={24} style={{ marginTop: 22 }} accessibilityRole="header">비밀번호를 바꿨어요</T>
          <T size={14.5} color={C.textSub} style={{ marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
            새 비밀번호로 로그인해 주세요.
          </T>
        </FadeIn>
      </Screen>
    );
  }

  if (stage === 'new') {
    const pw2State = pw2 ? (pw2 === pw ? 'ok' : 'err') : null;
    return (
      <Screen
        top={<TopBar title="비밀번호 찾기" onBack={() => setStage('verify')} />}
        footer={<Btn title="비밀번호 바꾸기" onPress={change} loading={busy} disabled={!pwOk(pw) || pw !== pw2} />}
      >
        <FadeIn from={10} style={s.body}>
          <View style={s.verified}><CircleCheck size={14} color={C.primaryDeep} /><T w={700} size={12.5} color={C.primaryDeep}>이메일 인증 완료</T></View>
          <T w={800} size={20} style={{ marginTop: 14 }} accessibilityRole="header">새 비밀번호를 정해 주세요</T>
          <T size={14.5} color={C.textSub} style={{ marginTop: 4 }}>아이디 {account}</T>
          <Field label="새 비밀번호" placeholder="새 비밀번호" secure value={pw} onChangeText={setPw} state={pwOk(pw) ? 'ok' : null} textContentType="newPassword" />
          <PwRules pw={pw} />
          <Field
            label="새 비밀번호 확인" placeholder="한 번 더 입력" secure value={pw2} onChangeText={setPw2}
            state={pw2State} help={pw2State === 'ok' ? '비밀번호가 같아요.' : pw2State === 'err' ? '비밀번호가 달라요.' : null}
          />
          {err ? <Notice tone="err" style={{ marginTop: 14 }}>{err}</Notice> : null}
        </FadeIn>
      </Screen>
    );
  }

  return (
    <Screen
      top={<TopBar title="비밀번호 찾기" onBack={nav.back} />}
      footer={<Btn title="다음" onPress={verify} loading={busy} disabled={!id.trim() || !sent || code.length !== 6} />}
    >
      <View style={s.body}>
        <T size={14.5} color={C.textSub} style={{ lineHeight: 22 }}>아이디와 학교 이메일을 확인한 뒤{'\n'}새 비밀번호로 바꿀 수 있어요.</T>
        <Field label="아이디" icon={User} placeholder="아이디" value={id} onChangeText={(t) => { setId(t); setErr(null); }} textContentType="username" />
        <EmailCode email={email} setEmail={(t) => { setEmail(t); setErr(null); }} code={code} setCode={(t) => { setCode(t); setErr(null); }} sent={sent} setSent={setSent} />
        {err ? <Notice tone="err" style={{ marginTop: 14 }}>{err}</Notice> : null}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingTop: 14 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface },
  choiceIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  bigIcon: { width: 88, height: 88, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  idCard: { alignSelf: 'stretch', alignItems: 'center', marginTop: 22, padding: 20, borderRadius: 18, borderWidth: 1.5, borderColor: C.border },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: C.primarySoft, borderWidth: 1.5, borderColor: C.primary },
});
