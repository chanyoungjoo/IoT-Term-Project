// 데이터 접근은 이 파일만 거친다. 지금은 더미 데이터, 나중에 FastAPI 호출로 교체.
import * as d from '../../shared/dummyData';
import { judgeRoom, decide, pickOutdoorPm, outdoorStatus, recommendWindow } from '../../shared/rules';

export const { school, currentTeacher, outdoor, SPEEDS, appHomeStates, controlLog } = d;

export const getRoom = (id) => d.rooms.find((r) => r.id === id);
export const getPurifier = (roomId) => d.purifiers.find((p) => p.roomId === roomId);
export const getWindow = (roomId) => d.windows.find((w) => w.roomId === roomId);

// 홈·제어 화면 값. demo(normal|co2|outdoorBad)가 있고 그 교실이 시연 대상이면 시연값을 쓴다.
// windowOpen: 앱에서 직접 여닫은 상태 (없으면 장치가 보고한 값 또는 시연값)
export function getRoomView(roomId, demo, windowOpen) {
  const room = getRoom(roomId);
  const preset = demo && d.appHomeStates[demo];
  const usePreset = preset && preset.roomId === roomId;
  const sensor = usePreset ? preset.sensor : room.sensor;
  const outPm = usePreset ? preset.outdoorPm25 : pickOutdoorPm(d.outdoor).pm25;
  const outState = outdoorStatus(outPm);
  const win = getWindow(roomId);
  const open = windowOpen ?? (usePreset ? preset.windowOpen : win.open);
  const window = { ...win, open };
  return {
    room,
    sensor,
    outPm,
    outState,
    judge: judgeRoom(sensor),
    decision: decide({ sensor, outdoor: outState, purifierMode: getPurifier(roomId).mode }),
    window,
    // 반자동: 추천만 하고 실행은 사람이 버튼으로
    windowRec: window.online ? recommendWindow({ sensor, outdoor: outState, windowOpen: open }) : null,
    isDemo: usePreset,
  };
}
