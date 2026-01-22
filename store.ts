
import { create } from 'zustand';

// AppStore를 단순화합니다. 현재는 AppView 제어만 주로 필요할 수 있지만, 
// 추후 확장성을 위해 기본 구조는 유지하되 불필요한 필드를 제거합니다.
interface AppStore {
  // 현재는 별다른 전역 상태가 필요하지 않을 수 있지만, 확장성을 위해 남겨둡니다.
  resetAll: () => void;
}

const initialState = {};

export const useStore = create<AppStore>((set) => ({
  ...initialState,
  resetAll: () => set({ ...initialState }),
}));
