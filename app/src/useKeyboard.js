// 키보드가 올라와 있는지 알려 주는 훅 (AirChat 입력창 위치, 탭바 숨김에 사용)
import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

export function useKeyboardVisible() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    // iOS는 키보드가 뜨기 직전(Will), 안드로이드는 뜬 뒤(Did) 이벤트만 있다
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const a = Keyboard.addListener(showEvt, () => setShown(true));
    const b = Keyboard.addListener(hideEvt, () => setShown(false));
    return () => { a.remove(); b.remove(); };
  }, []);
  return shown;
}
