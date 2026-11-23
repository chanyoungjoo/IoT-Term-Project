// 탭 화면 스크롤을 항상 맨 위에서 시작하게 하는 훅.
// 탭은 한 번 열리면 계속 살아 있어서, 그냥 두면 다른 탭에 갔다 와도 마지막으로 보던 위치가 그대로 남는다.
// - 떠날 때: 탭 전환 애니메이션이 끝나 화면이 완전히 안 보인 뒤에 맨 위로 돌려 둠
//   (보이는 동안 바로 올리면, 사라지는 화면이 위로 튀면서 새 화면과 겹쳐 보였음)
// - 들어올 때: 이미 맨 위라 아무 움직임 없음. 혹시 아직 안 돌려졌으면(아주 빨리 돌아온 경우) 그때 맞춤
// 사용: const scrollRef = useScrollTop(); <ScrollView ref={scrollRef} ...>
import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { TAB_TRANSITION_MS } from './motion';

export function useScrollTop() {
  const ref = useRef(null);
  const timer = useRef(null);
  useFocusEffect(useCallback(() => {
    clearTimeout(timer.current); // 떠나자마자 돌아왔으면 예약해 둔 되돌리기는 취소
    ref.current?.scrollTo({ y: 0, animated: false });
    return () => {
      timer.current = setTimeout(() => ref.current?.scrollTo({ y: 0, animated: false }), TAB_TRANSITION_MS + 80);
    };
  }, []));
  return ref;
}
