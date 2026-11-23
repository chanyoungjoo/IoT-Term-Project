// 키보드 상태 훅 (AirChat 입력창 위치, 탭바 숨김에 사용)
// 키보드가 움직이는 시간(duration)도 같이 알려 줘서, 화면 요소를 키보드와 "같이" 움직일 수 있게 한다.
import { useEffect, useState } from 'react';
import { Easing, Keyboard, Platform } from 'react-native';

// iOS 키보드가 올라오고 내려갈 때 쓰는 곡선(처음에 빠르게, 끝에서 천천히)과 비슷한 값
// 탭바·입력창을 키보드와 맞춰 움직일 때 사용
export const KEYBOARD_EASING = Easing.bezier(0.38, 0.7, 0.125, 1);
const DEFAULT_DURATION = 250; // 안드로이드는 이벤트에 시간이 없어서 기본값 사용

export function useKeyboard() {
  const [state, setState] = useState({ visible: false, height: 0, duration: DEFAULT_DURATION });
  useEffect(() => {
    // iOS는 키보드가 뜨기 직전(Will), 안드로이드는 뜬 뒤(Did) 이벤트만 있다
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const on = (visible) => (e) => setState({
      visible,
      height: visible ? e?.endCoordinates?.height ?? 0 : 0, // 키보드 높이 (화면 맨 아래부터, 홈 인디케이터 영역 포함)
      duration: e?.duration || DEFAULT_DURATION,
    });
    const a = Keyboard.addListener(showEvt, on(true));
    const b = Keyboard.addListener(hideEvt, on(false));
    return () => { a.remove(); b.remove(); };
  }, []);
  return state;
}

// 예전 이름 호환: 보이는지만 필요할 때
export const useKeyboardVisible = () => useKeyboard().visible;
