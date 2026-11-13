// AirClass 공용 판정·제어 규칙 (웹·앱 공통)
// 서버의 Rule 엔진과 같은 로직을 프론트에서도 써서, 더미 데이터로도 화면 상태를 일관되게 보여 준다.

// ─────────────────────────────────────────────
// 기준값
// ─────────────────────────────────────────────
export const THRESHOLDS = {
  indoorPm25Bad: 35, // 실내 PM2.5 이상이면 경고
  co2High: 1000, // CO₂ 이상이면 환기 필요
  outdoorPm25Bad: 36, // 실외 PM2.5 이상이면 나쁨
  outdoorHumidityHigh: 80, // 실외 습도 이상이면 센서 대신 API 값 사용
  apiMaxAgeMinutes: 120, // API 값이 이보다 오래되면 버림
  comfortTemp: [18, 26], // 적정 온도(℃), 앱 수치 카드 표시용
  comfortHumidity: [40, 60], // 적정 습도(%), 앱 수치 카드 표시용
};

// ─────────────────────────────────────────────
// 1. 교실 상태 판정
// return: { level: 'ok'|'warn'|'bad', label, reason }
// ─────────────────────────────────────────────
export function judgeRoom({ pm25, co2 }) {
  if (pm25 >= THRESHOLDS.indoorPm25Bad) {
    return { level: 'bad', label: '경고', reason: 'PM2.5 높음' };
  }
  if (co2 >= THRESHOLDS.co2High) {
    return { level: 'warn', label: '주의', reason: 'CO₂ 높음' };
  }
  return { level: 'ok', label: '정상', reason: null };
}

// ─────────────────────────────────────────────
// 2. 실외 PM2.5 값 고르기 (센서 + 공공 API 보완)
// - 센서 정상 + 습도 낮음 → 센서 값
// - 센서 이상 또는 고습 → API 값
// - 둘 다 없음 → null (알 수 없음)
// return: { pm25: number|null, source: 'sensor'|'api'|'unknown' }
// ─────────────────────────────────────────────
export function pickOutdoorPm({ sensor, api }) {
  const sensorOk =
    sensor && sensor.online && sensor.pm25 != null &&
    (sensor.humidity ?? 0) < THRESHOLDS.outdoorHumidityHigh;
  if (sensorOk) return { pm25: sensor.pm25, source: 'sensor' };

  const apiOk = api && api.pm25 != null && (api.ageMinutes ?? 0) <= THRESHOLDS.apiMaxAgeMinutes;
  if (apiOk) return { pm25: api.pm25, source: 'api' };

  return { pm25: null, source: 'unknown' };
}

// 실외 상태: 'good' | 'bad' | 'unknown'
export function outdoorStatus(outdoorPm25) {
  if (outdoorPm25 == null) return 'unknown';
  return outdoorPm25 >= THRESHOLDS.outdoorPm25Bad ? 'bad' : 'good';
}

// ─────────────────────────────────────────────
// 3. 자동 제어 규칙 (규칙 1·2·3·5, 규칙 4는 이번 범위 제외)
// 창문은 자동으로 움직이지 않는다. 열기·닫기 추천은 recommendWindow()가 따로 계산한다.
// input:
//   sensor: { pm25, co2 }
//   outdoor: 'good' | 'bad' | 'unknown'
//   purifierMode: 'auto' | 'manual'
// return: {
//   rule: 1|2|3|5,
//   purifier: 'on'|'off'|'keep',   // 공기청정기 명령 (수동 모드면 'keep')
//   notify: null | 'ventilate' | 'keepClosed',  // 담임 알림 종류
//   title, message               // 화면에 보여 줄 문구
// }
// ─────────────────────────────────────────────
export function decide({ sensor, outdoor, purifierMode = 'auto' }) {
  const pmBad = sensor.pm25 >= THRESHOLDS.indoorPm25Bad;
  const co2High = sensor.co2 >= THRESHOLDS.co2High;
  // 실외 상태를 모르면 안전한 쪽(나쁨)으로 판단 → 환기 권장 대신 공기청정기
  const outBad = outdoor !== 'good';

  let result;
  if (pmBad) {
    result = {
      rule: 1, purifier: 'on', notify: null,
      title: '공기청정기로 정화하고 있어요',
      message: '실내 PM2.5가 35 이상이에요. 35 아래로 내려가면 자동으로 꺼져요.',
    };
  } else if (co2High && !outBad) {
    result = {
      rule: 2, purifier: 'off', notify: 'ventilate',
      title: '환기가 필요해요',
      message: 'CO₂가 1,000ppm 이상이고 실외 공기는 양호해요.',
    };
  } else if (co2High && outBad) {
    result = {
      rule: 3, purifier: 'on', notify: 'keepClosed',
      title: '창문을 닫고\n실내 공기를 정화할게요',
      message: outdoor === 'unknown'
        ? 'CO₂가 높지만 실외 상태를 확인할 수 없어 창문을 닫아 두는 쪽을 권장해요.'
        : 'CO₂가 1,000ppm 이상이지만 실외 공기가 나빠요.',
    };
  } else {
    result = {
      rule: 5, purifier: 'off', notify: null,
      title: '공기가 깨끗해요',
      message: '모든 수치가 기준 안에 있어요. 공기청정기는 절전 대기 중이에요.',
    };
  }

  // 수동 모드 장치는 자동 규칙이 공기청정기를 건드리지 않는다
  if (purifierMode === 'manual') result = { ...result, purifier: 'keep' };
  return result;
}

// ─────────────────────────────────────────────
// 3-1. 창문 추천 (반자동: 시스템은 추천만, 실행은 사람이 앱·웹에서 버튼을 눌러서)
// - 실외가 나쁘거나 알 수 없는데 창문이 열려 있음 → 닫기 추천
// - CO₂ 높음 + 실외 양호 + 실내 PM2.5 정상 + 창문 닫힘 → 열기 추천
// - 그 밖에는 추천 없음 (사람이 원하면 직접 여닫을 수 있음)
// input: sensor { pm25, co2 }, outdoor 'good'|'bad'|'unknown', windowOpen boolean
// return: null | { action: 'open'|'close', title, reason }
// ─────────────────────────────────────────────
export function recommendWindow({ sensor, outdoor, windowOpen }) {
  const co2High = sensor.co2 >= THRESHOLDS.co2High;
  const pmBad = sensor.pm25 >= THRESHOLDS.indoorPm25Bad;
  if (windowOpen && outdoor !== 'good') {
    return {
      action: 'close',
      title: '창문 닫기를 권장해요',
      reason: outdoor === 'unknown'
        ? '바깥 공기 상태를 확인할 수 없어요.\n닫아 두는 쪽이 안전해요.'
        : '바깥 미세먼지가 나빠요.\n닫으면 공기청정기가 실내를 정화해요.',
    };
  }
  if (!windowOpen && co2High && outdoor === 'good' && !pmBad) {
    return {
      action: 'open',
      title: '창문 열기를 권장해요',
      reason: `CO₂가 ${sensor.co2.toLocaleString('ko-KR')}ppm으로 높고 바깥 공기는 괜찮아요.\n10분 정도 환기하면 기준 아래로 내려가요.`,
    };
  }
  return null;
}

// ─────────────────────────────────────────────
// 4. 시나리오 적용 헬퍼 (관리자 웹 시연 버튼용)
// dummyData의 rooms/outdoor에 scenario 패치를 덮어써서 새 객체를 돌려준다.
// ─────────────────────────────────────────────
export function applyScenario({ rooms, outdoor }, scenario) {
  const patchedRooms = rooms.map((r) =>
    scenario.roomPatch[r.id]
      ? { ...r, sensor: { ...r.sensor, ...scenario.roomPatch[r.id] } }
      : r,
  );
  const op = scenario.outdoorPatch || {};
  const patchedOutdoor = {
    ...outdoor,
    sensor: { ...outdoor.sensor, ...(op.sensor || {}) },
    api: { ...outdoor.api, ...(op.api || {}) },
  };
  return { rooms: patchedRooms, outdoor: patchedOutdoor };
}

// ─────────────────────────────────────────────
// 5. 요약 통계 (관리자 대시보드 상단 카드)
// ─────────────────────────────────────────────
export function summarize(rooms, purifiers) {
  const count = { ok: 0, warn: 0, bad: 0 };
  let co2Sum = 0;
  rooms.forEach((r) => {
    count[judgeRoom(r.sensor).level] += 1;
    co2Sum += r.sensor.co2;
  });
  return {
    total: rooms.length,
    ...count,
    avgCo2: Math.round(co2Sum / rooms.length),
    purifiersOn: purifiers.filter((p) => p.online && p.power).length,
    purifiersAuto: purifiers.filter((p) => p.mode === 'auto').length,
  };
}
