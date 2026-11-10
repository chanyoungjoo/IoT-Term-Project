// 탭끼리 같이 보는 상태: 선택한 교실, 홈 시연 상태, 공기청정기 설정
import { createContext, useContext } from 'react';

export const AppState = createContext(null);
export const useAppState = () => useContext(AppState);
