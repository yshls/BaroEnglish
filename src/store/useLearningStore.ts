import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { safeAsyncStorage } from './safeAsyncStorage';

export interface LearningState {
  learnedSymbolIds: string[];
  showKoPronunciation: boolean;
  hasDismissedWelcomeBanner: boolean;
  hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
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
      hasHydrated: false,

      setHasHydrated: (hydrated: boolean) => {
        set({ hasHydrated: hydrated });
      },

      toggleSymbolLearned: (symbolId: string) => {
        if (!get().hasHydrated) return;
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
        if (!get().hasHydrated) return;
        set({ showKoPronunciation: show });
      },

      toggleShowKoPronunciation: () => {
        if (!get().hasHydrated) return;
        set((state) => ({ showKoPronunciation: !state.showKoPronunciation }));
      },

      dismissWelcomeBanner: () => {
        if (!get().hasHydrated) return;
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
      version: 1,
      storage: createJSONStorage(() => safeAsyncStorage),
      partialize: (state) => ({
        learnedSymbolIds: state.learnedSymbolIds,
        showKoPronunciation: state.showKoPronunciation,
        hasDismissedWelcomeBanner: state.hasDismissedWelcomeBanner,
      }),
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          void safeAsyncStorage.removeItem('baro-english-learning-storage-v1');
        }
        useLearningStore.getState().setHasHydrated(true);
      },
    }
  )
);
