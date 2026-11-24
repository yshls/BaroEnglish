import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { safeAsyncStorage } from './safeAsyncStorage';

const MAX_ACTIVE_HISTORY_DAYS = 60;
const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;

export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getPreviousDateKey(dateKey: string): string {
  const parts = dateKey.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return getLocalDateKey(new Date(Date.now() - 86_400_000));
  }
  const prev = new Date(parts[0], parts[1] - 1, parts[2] - 1);
  return getLocalDateKey(prev);
}

export interface RecentDayItem {
  key: string;
  weekdayKo: string;
  dayNum: number;
  isToday: boolean;
}

export function getRecentWeekDays(
  days = 7,
  baseDate: Date = new Date()
): RecentDayItem[] {
  const result: RecentDayItem[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const d = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate() - offset
    );
    result.push({
      key: getLocalDateKey(d),
      weekdayKo: WEEKDAY_KO[d.getDay()],
      dayNum: d.getDate(),
      isToday: offset === 0,
    });
  }
  return result;
}

export function formatStudyDuration(totalSeconds: number): string {
  const safeSec = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  if (safeSec === 0) return '0분';
  if (safeSec < 60) return `${safeSec}초`;
  const totalMinutes = Math.floor(safeSec / 60);
  if (totalMinutes < 60) return `${totalMinutes}분`;
  const hours = Math.floor(totalMinutes / 60);
  const remMinutes = totalMinutes % 60;
  return remMinutes > 0 ? `${hours}시간 ${remMinutes}분` : `${hours}시간`;
}

function appendActiveDate(history: string[], dateKey: string): string[] {
  const safe = Array.isArray(history) ? history : [];
  if (safe.includes(dateKey)) return safe.slice(-MAX_ACTIVE_HISTORY_DAYS);
  return [...safe, dateKey].sort().slice(-MAX_ACTIVE_HISTORY_DAYS);
}

export interface LearningState {
  learnedSymbolIds: string[];
  bookmarkedSymbolIds: string[];
  showKoPronunciation: boolean;
  hasDismissedWelcomeBanner: boolean;

  // 마이페이지: 프로필 · 이용 시간 통계 · 연속 실행 기록
  nickname: string;
  totalStudySeconds: number;
  todayDateKey: string;
  todayStudySeconds: number;
  currentStreakDays: number;
  longestStreakDays: number;
  lastActiveDate: string | null;
  activeDateHistory: string[];

  hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
  toggleSymbolLearned: (symbolId: string) => void;
  isSymbolLearned: (symbolId: string) => boolean;
  toggleSymbolBookmark: (symbolId: string) => void;
  isSymbolBookmarked: (symbolId: string) => boolean;
  setShowKoPronunciation: (show: boolean) => void;
  toggleShowKoPronunciation: () => void;
  dismissWelcomeBanner: () => void;
  setNickname: (nickname: string) => void;
  recordAppVisit: (now?: Date) => void;
  addStudySeconds: (seconds: number, now?: Date) => void;
  resetProgress: () => void;
}

export const useLearningStore = create<LearningState>()(
  persist(
    (set, get) => ({
      learnedSymbolIds: [],
      bookmarkedSymbolIds: [],
      showKoPronunciation: true,
      hasDismissedWelcomeBanner: false,

      nickname: '',
      totalStudySeconds: 0,
      todayDateKey: '',
      todayStudySeconds: 0,
      currentStreakDays: 0,
      longestStreakDays: 0,
      lastActiveDate: null,
      activeDateHistory: [],

      hasHydrated: false,

      setHasHydrated: (hydrated: boolean) => {
        set({ hasHydrated: hydrated });
      },

      toggleSymbolLearned: (symbolId: string) => {
        if (!get().hasHydrated) return;
        const current = Array.isArray(get().learnedSymbolIds)
          ? get().learnedSymbolIds
          : [];
        const exists = current.includes(symbolId);
        const next = exists
          ? current.filter((id) => id !== symbolId)
          : [...current, symbolId];
        set({ learnedSymbolIds: next });
      },

      isSymbolLearned: (symbolId: string) => {
        const list = get().learnedSymbolIds;
        return Array.isArray(list) ? list.includes(symbolId) : false;
      },

      toggleSymbolBookmark: (symbolId: string) => {
        if (!get().hasHydrated) return;
        const current = Array.isArray(get().bookmarkedSymbolIds)
          ? get().bookmarkedSymbolIds
          : [];
        const exists = current.includes(symbolId);
        const next = exists
          ? current.filter((id) => id !== symbolId)
          : [symbolId, ...current];
        set({ bookmarkedSymbolIds: next });
      },

      isSymbolBookmarked: (symbolId: string) => {
        const list = get().bookmarkedSymbolIds;
        return Array.isArray(list) ? list.includes(symbolId) : false;
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

      setNickname: (nickname: string) => {
        if (!get().hasHydrated) return;
        const cleaned = nickname.trim().slice(0, 16);
        set({ nickname: cleaned });
      },

      recordAppVisit: (now: Date = new Date()) => {
        if (!get().hasHydrated) return;
        const today = getLocalDateKey(now);
        const state = get();
        const prevDate = state.lastActiveDate;
        const prevStreak =
          typeof state.currentStreakDays === 'number' && state.currentStreakDays > 0
            ? state.currentStreakDays
            : 0;
        const prevLongest =
          typeof state.longestStreakDays === 'number' && state.longestStreakDays > 0
            ? state.longestStreakDays
            : 0;

        if (prevDate === today) {
          const safeStreak = Math.max(1, prevStreak);
          const safeLongest = Math.max(prevLongest, safeStreak);
          const nextHistory = appendActiveDate(state.activeDateHistory, today);
          if (
            state.todayDateKey === today &&
            state.currentStreakDays === safeStreak &&
            state.longestStreakDays === safeLongest &&
            nextHistory.length === (state.activeDateHistory?.length ?? 0)
          ) {
            return;
          }
          set({
            todayDateKey: today,
            currentStreakDays: safeStreak,
            longestStreakDays: safeLongest,
            activeDateHistory: nextHistory,
          });
          return;
        }

        const yesterday = getPreviousDateKey(today);
        const nextStreak = prevDate === yesterday ? Math.max(1, prevStreak) + 1 : 1;
        const nextLongest = Math.max(prevLongest, nextStreak);
        const nextHistory = appendActiveDate(state.activeDateHistory, today);

        set({
          lastActiveDate: today,
          todayDateKey: today,
          todayStudySeconds: state.todayDateKey === today ? state.todayStudySeconds : 0,
          currentStreakDays: nextStreak,
          longestStreakDays: nextLongest,
          activeDateHistory: nextHistory,
        });
      },

      addStudySeconds: (seconds: number, now: Date = new Date()) => {
        if (!get().hasHydrated) return;
        if (!Number.isFinite(seconds) || seconds <= 0) return;
        const clamped = Math.min(Math.round(seconds), 120);
        if (clamped <= 0) return;

        // 날짜가 바뀌었으면 먼저 연속 실행 및 오늘 시간 초기화 반영
        get().recordAppVisit(now);

        const today = getLocalDateKey(now);
        set((state) => {
          const prevTotal =
            typeof state.totalStudySeconds === 'number' && state.totalStudySeconds >= 0
              ? state.totalStudySeconds
              : 0;
          const prevToday =
            state.todayDateKey === today &&
            typeof state.todayStudySeconds === 'number' &&
            state.todayStudySeconds >= 0
              ? state.todayStudySeconds
              : 0;
          return {
            todayDateKey: today,
            totalStudySeconds: prevTotal + clamped,
            todayStudySeconds: prevToday + clamped,
          };
        });
      },

      resetProgress: () => {
        set({
          learnedSymbolIds: [],
          bookmarkedSymbolIds: [],
          showKoPronunciation: true,
          hasDismissedWelcomeBanner: false,
          nickname: '',
          totalStudySeconds: 0,
          todayDateKey: '',
          todayStudySeconds: 0,
          currentStreakDays: 0,
          longestStreakDays: 0,
          lastActiveDate: null,
          activeDateHistory: [],
        });
      },
    }),
    {
      name: 'baro-english-learning-storage-v1',
      version: 1,
      storage: createJSONStorage(() => safeAsyncStorage),
      partialize: (state) => ({
        learnedSymbolIds: state.learnedSymbolIds,
        bookmarkedSymbolIds: state.bookmarkedSymbolIds,
        showKoPronunciation: state.showKoPronunciation,
        hasDismissedWelcomeBanner: state.hasDismissedWelcomeBanner,
        nickname: state.nickname,
        totalStudySeconds: state.totalStudySeconds,
        todayDateKey: state.todayDateKey,
        todayStudySeconds: state.todayStudySeconds,
        currentStreakDays: state.currentStreakDays,
        longestStreakDays: state.longestStreakDays,
        lastActiveDate: state.lastActiveDate,
        activeDateHistory: state.activeDateHistory,
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
