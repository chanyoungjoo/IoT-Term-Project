// AirChat 상태: 대화 · 예약 · 규칙 + 예약 실행기
// 탭을 옮겨도 대화와 예약이 유지되도록 _layout(AppState)에서 한 번만 만든다.
// 지금은 앱 안에서 1초마다 예약을 확인해 실행한다. 서버(라즈베리파이 규칙 엔진)가 붙으면
// 실행은 서버가 하고, 앱은 결과만 받아 보여 주게 바꾼다.
import { useEffect, useRef, useState } from 'react';
import { getPurifier, getRoomView } from './api';
import { DEVICE_OBJ, GREETING, PAST, RESULT_NAME, hhmm } from './airchat';

const PM_BAD = 35;
let seq = 0;
const uid = (p) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;

export function useAirChatStore({ demo, edits, setEdits, windowEdits, setWindowOpen }) {
  const [messages, setMessages] = useState(() => [{ ...GREETING, at: Date.now() }]);
  const [schedules, setSchedules] = useState([]);
  const [rules, setRules] = useState([]);

  // 예약 실행기(setInterval) 안에서 항상 최신 값을 보도록 ref에 담아 둔다
  const live = useRef({});
  live.current = { demo, edits, windowEdits, schedules, setEdits, setWindowOpen };
  const ran = useRef(new Set()); // 같은 예약을 두 번 실행하지 않게

  const addMessages = (...items) =>
    setMessages((list) => [...list, ...items.map((m) => ({ id: uid('m'), at: Date.now(), ...m }))]);
  const updateMessage = (id, patch) =>
    setMessages((list) => list.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  // 예약 카드에서 [예약하기]를 누르면 등록 (사람이 승인한 것만 등록됨)
  const addSchedule = (card) => {
    const s = { ...card, id: uid('s'), status: 'pending', createdAt: Date.now() };
    setSchedules((list) => [...list, s]);
    return s;
  };
  const cancelSchedule = (id) =>
    setSchedules((list) => list.map((s) => (s.id === id && s.status === 'pending' ? { ...s, status: 'canceled' } : s)));

  // 같은 이름(id)의 규칙은 새 버전으로 교체
  const addRule = (card) =>
    setRules((list) => [...list.filter((r) => r.id !== card.id), { ...card, on: true, createdAt: Date.now() }]);
  const toggleRule = (id) => setRules((list) => list.map((r) => (r.id === id ? { ...r, on: !r.on } : r)));

  // 예약 실행기: 1초마다 실행할 때가 된 예약을 찾아 처리
  useEffect(() => {
    const timer = setInterval(() => {
      const L = live.current;
      const now = Date.now();
      const due = L.schedules.filter((s) => s.status === 'pending' && s.at <= now && !ran.current.has(s.id));
      due.forEach((s) => {
        ran.current.add(s.id);
        // 실행 직전에 한 번 더 확인: 장치 연결 상태, 안전 기준
        const view = getRoomView(s.roomId, L.demo, L.windowEdits[s.roomId]);
        const purifier = { ...getPurifier(s.roomId), ...L.edits[s.roomId] };
        const online = s.device === 'window' ? view.window.online : purifier.online;
        const pm = view.sensor.pm25;
        let status = 'done';
        let reason = null;
        if (!online) {
          status = 'skipped';
          reason = '장치 연결이 끊겨 있어서 실행하지 않았어요';
        } else if (s.device === 'purifier' && s.action === 'off' && pm >= PM_BAD) {
          status = 'skipped';
          reason = `PM2.5가 ${pm}이라 안전을 위해 끄지 않았어요`;
        }
        if (status === 'done') {
          // 사람이 정한 동작이므로 공기청정기는 수동 모드로 바뀐다 (자동 규칙이 덮어쓰지 않게)
          if (s.device === 'purifier') {
            L.setEdits((e) => ({ ...e, [s.roomId]: { ...e[s.roomId], power: s.action === 'on', mode: 'manual' } }));
          } else {
            L.setWindowOpen(s.roomId, s.action === 'open');
          }
        }
        const result = { ...s, status, reason, ranAt: now, pmAtRun: pm };
        setSchedules((list) => list.map((x) => (x.id === s.id ? result : x)));
        addMessages({
          role: 'event',
          ok: status === 'done',
          text: status === 'done' ? `예약대로 ${DEVICE_OBJ[s.device]} ${PAST[s.action]}` : '예약을 실행하지 않았어요',
          sub: status === 'done' ? `${hhmm(now)} · 장치가 ‘${RESULT_NAME[s.action]}’을 보고했어요` : `${hhmm(now)} · ${reason}`,
        });
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { messages, addMessages, updateMessage, schedules, addSchedule, cancelSchedule, rules, addRule, toggleRule };
}
