import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface LearningState {
  learnedSymbolIds: string[];
  showKoPronunciation: boolean;
  hasDismissedWelcomeBanner: boolean;
  toggleSymbolLearned: (symbolId: string) => void;
  isSymbolLearned: (symbolId: string) => boolean;
  setShowKoPronunciation: (show: boolean) => void;
  toggleShowKoPronunciation: () => void;
  dismissWelcomeBanner: () => void;
  resetProgress: () => void;
}

export const useLearningStore = create<LearningState>()(
  persist(
    (set, get) => ({
      learnedSymbolIds: [],
      showKoPronunciation: true,
      hasDismissedWelcomeBanner: false,

      toggleSymbolLearned: (symbolId: string) => {
        const current = get().learnedSymbolIds;
        const exists = current.includes(symbolId);
        const next = exists
          ? current.filter((id) => id !== symbolId)
          : [...current, symbolId];
        set({ learnedSymbolIds: next });
      },

      isSymbolLearned: (symbolId: string) => {
        return get().learnedSymbolIds.includes(symbolId);
      },

      setShowKoPronunciation: (show: boolean) => {
        set({ showKoPronunciation: show });
      },

      toggleShowKoPronunciation: () => {
        set((state) => ({ showKoPronunciation: !state.showKoPronunciation }));
      },

      dismissWelcomeBanner: () => {
        set({ hasDismissedWelcomeBanner: true });
      },

      resetProgress: () => {
        set({
          learnedSymbolIds: [],
          showKoPronunciation: true,
          hasDismissedWelcomeBanner: false,
        });
      },
    }),
    {
      name: 'baro-english-learning-storage-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        learnedSymbolIds: state.learnedSymbolIds,
        showKoPronunciation: state.showKoPronunciation,
        hasDismissedWelcomeBanner: state.hasDismissedWelcomeBanner,
      }),
    }
  )
);
