// 관리자 웹 로그인·회원가입·계정 찾기 (프로토타입: 브라우저 안의 가짜 서버)
// - 앱(app/src/auth/authApi.js)과 같은 규칙을 쓴다: 시연 계정 admin / 1234, 인증 코드 123456, 5번 틀리면 1분 잠금
// - 계정은 메모리에만 있어서 새로고침하면 처음 상태로 돌아간다. (가입 신청한 계정도 사라짐)
// - 나중에 서버 API로 바꿀 때 함수 이름과 반환 모양만 유지하면 화면은 그대로 쓸 수 있다.
import { currentAdmin } from '../api.js'

export const DEMO_CODE = '123456'
export const DEMO_ACCOUNT = { id: 'admin', pw: '1234' } // 로그인 화면 로고를 두 번 누르면 채워짐
export const MAX_FAILS = 5
export const CODE_SECONDS = 5 * 60
const LOCK_MS = 60 * 1000

const wait = (ms) => new Promise((r) => setTimeout(r, ms)) // 서버를 거치는 느낌을 주는 짧은 지연

// 관리자용 직책 (가입할 때 고름)
export const ROLES = ['주무관', '행정실장', '교감', '정보 담당 교사']

// 학교 목록 (앱과 같은 시연용 이름). AirClass가 설치된 곳은 A초등학교뿐
export const SCHOOLS = [
  { id: 'sch-1', name: 'A초등학교', addr: '서울 예시구 학교로 12', ready: true },
  { id: 'sch-2', name: 'B초등학교', addr: '서울 예시구 학교로 34', ready: false },
  { id: 'sch-3', name: 'C중학교', addr: '서울 예시구 학교로 56', ready: false },
]
export const schoolName = (id) => SCHOOLS.find((s) => s.id === id)?.name ?? ''

export function searchSchools(q) {
  const t = q.trim().toLowerCase()
  if (!t) return SCHOOLS
  return SCHOOLS.filter((s) => s.name.toLowerCase().includes(t))
}

// status: approved 승인됨 | pending 승인 대기
const accounts = [
  {
    id: DEMO_ACCOUNT.id, pw: DEMO_ACCOUNT.pw, name: currentAdmin.name, role: currentAdmin.role,
    email: 'minsu@sen.go.kr', schoolId: 'sch-1', joinedAt: '2026-03-02', status: 'approved',
  },
]
const fails = {} // 아이디별 틀린 횟수 { [id]: { n, until } }

// ─── 입력 규칙 ───
export const ID_RULE = /^[a-z][a-z0-9]{3,15}$/ // 영문 소문자로 시작, 4~16자
export const idProblem = (id) => (ID_RULE.test(id) ? null : '영문 소문자로 시작하는 4~16자(영문·숫자)로 정해 주세요.')
export const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())
export const pwRules = (pw) => [
  { label: '8자 이상', ok: pw.length >= 8 },
  { label: '영문+숫자', ok: /[a-zA-Z]/.test(pw) && /\d/.test(pw) },
  { label: '특수문자', ok: /[^a-zA-Z0-9]/.test(pw) },
]
export const pwOk = (pw) => pwRules(pw).every((r) => r.ok)
// leejieun → lee•••un (앞 3자, 뒤 2자만 보여 줌)
export const maskId = (id) => (id.length <= 5 ? `${id[0]}•••` : `${id.slice(0, 3)}•••${id.slice(-2)}`)
export const codeOk = (code) => code.trim() === DEMO_CODE

const publicUser = (a) => ({ id: a.id, name: a.name, role: a.role, email: a.email, schoolId: a.schoolId, school: schoolName(a.schoolId) })

// ─── 로그인 ───
// 결과: { ok: true, user } | { ok: false, code: 'wrong', count, max } | { code: 'locked', seconds } | { code: 'pending' }
export async function login(idRaw, pw) {
  await wait(500)
  const id = idRaw.trim().toLowerCase()
  const f = fails[id] ?? { n: 0, until: 0 }
  if (f.until > Date.now()) return { ok: false, code: 'locked', seconds: Math.ceil((f.until - Date.now()) / 1000) }
  const a = accounts.find((x) => x.id === id)
  if (!a || a.pw !== pw) {
    f.n += 1
    if (f.n >= MAX_FAILS) {
      fails[id] = { n: 0, until: Date.now() + LOCK_MS }
      return { ok: false, code: 'locked', seconds: LOCK_MS / 1000 }
    }
    fails[id] = f
    return { ok: false, code: 'wrong', count: f.n, max: MAX_FAILS }
  }
  fails[id] = { n: 0, until: 0 }
  if (a.status === 'pending') return { ok: false, code: 'pending' }
  return { ok: true, user: publicUser(a) }
}

// ─── 회원가입 ───
export async function checkId(idRaw) {
  await wait(350)
  const id = idRaw.trim().toLowerCase()
  const problem = idProblem(id)
  if (problem) return { ok: false, message: problem }
  if (accounts.some((a) => a.id === id)) return { ok: false, message: '이미 쓰고 있는 아이디예요.' }
  return { ok: true }
}

// 인증 코드 보내기 (실제로는 보내지 않고 화면에서 시연용 코드를 알려 줌)
export async function sendCode(email) {
  await wait(450)
  if (!emailOk(email)) return { ok: false, message: '이메일 주소를 다시 확인해 주세요.' }
  return { ok: true, seconds: CODE_SECONDS }
}

export async function signup({ name, role, id, pw, email, schoolId }) {
  await wait(600)
  accounts.push({
    id: id.trim().toLowerCase(), pw, name: name.trim(), role, email: email.trim(), schoolId,
    joinedAt: new Date().toISOString().slice(0, 10), status: 'pending',
  })
  return { ok: true }
}

// ─── 계정 찾기 ───
export async function findId(name, email, code) {
  await wait(450)
  if (!codeOk(code)) return { ok: false, message: '인증 코드가 맞지 않아요.' }
  const a = accounts.find((x) => x.name === name.trim() && x.email === email.trim())
  if (!a) return { ok: false, message: '입력한 정보와 맞는 계정이 없어요.' }
  return { ok: true, id: a.id, joinedAt: a.joinedAt, school: schoolName(a.schoolId) }
}

export async function verifyForReset(idRaw, email, code) {
  await wait(450)
  if (!codeOk(code)) return { ok: false, message: '인증 코드가 맞지 않아요.' }
  const a = accounts.find((x) => x.id === idRaw.trim().toLowerCase() && x.email === email.trim())
  if (!a) return { ok: false, message: '입력한 정보와 맞는 계정이 없어요.' }
  return { ok: true, id: a.id }
}

export async function resetPassword(id, pw) {
  await wait(500)
  const a = accounts.find((x) => x.id === id)
  if (!a) return { ok: false, message: '계정을 찾을 수 없어요.' }
  a.pw = pw
  fails[id] = { n: 0, until: 0 }
  return { ok: true }
}

// 로그인한 상태에서 비밀번호 바꾸기 (설정 > 계정)
export async function changePassword(id, current, next) {
  await wait(500)
  const a = accounts.find((x) => x.id === id)
  if (!a || a.pw !== current) return { ok: false, message: '현재 비밀번호가 맞지 않아요.' }
  a.pw = next
  return { ok: true }
}
