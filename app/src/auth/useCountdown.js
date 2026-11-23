// 인증 코드 남은 시간. startedAt(보낸 시각, ms)부터 seconds초를 거꾸로 셈. startedAt이 0이면 멈춤.
// 반환: { left: 남은 초, text: 'm:ss' }
import { useEffect, useState } from 'react';

export function useCountdown(startedAt, seconds) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  const left = startedAt ? Math.max(0, seconds - Math.floor((Math.max(now, startedAt) - startedAt) / 1000)) : 0;
  return { left, text: `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` };
}
