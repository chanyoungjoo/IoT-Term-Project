// 데이터 접근은 이 파일만 거친다. 지금은 더미 데이터, 나중에 FastAPI 호출로 교체.
import * as d from '../../shared/dummyData';
import { judgeRoom, decide, pickOutdoorPm, outdoorStatus } from '../../shared/rules';

export const { school, currentTeacher, outdoor, SPEEDS, appHomeStates, controlLog } = d;

export const getRoom = (id) => d.rooms.find((r) => r.id === id);
export const getPurifier = (roomId) => d.purifiers.find((p) => p.roomId === roomId);

// 홈 화면 값. demo(normal|co2|outdoorBad)가 있고 그 교실이 시연 대상이면 시연값을 쓴다.
export function getRoomView(roomId, demo) {
  const room = getRoom(roomId);
  const preset = demo && d.appHomeStates[demo];
  const usePreset = preset && preset.roomId === roomId;
  const sensor = usePreset ? preset.sensor : room.sensor;
  const outPm = usePreset ? preset.outdoorPm25 : pickOutdoorPm(d.outdoor).pm25;
  const outState = outdoorStatus(outPm);
  return {
    room,
    sensor,
    outPm,
    outState,
    judge: judgeRoom(sensor),
    decision: decide({ sensor, outdoor: outState, purifierMode: getPurifier(roomId).mode }),
    isDemo: usePreset,
  };
}
