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

export function addDaysToDateKey(dateKey: string, days: number): string {
  const parts = dateKey.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return getLocalDateKey(new Date(Date.now() + days * 86_400_000));
  }
  const next = new Date(parts[0], parts[1] - 1, parts[2] + days);
  return getLocalDateKey(next);
}

function diffDateKeyDays(fromKey: string, toKey: string): number {
  const a = fromKey.split('-').map(Number);
  const b = toKey.split('-').map(Number);
  if (a.length !== 3 || b.length !== 3 || a.some(Number.isNaN) || b.some(Number.isNaN)) {
    return 0;
  }
  const t1 = new Date(a[0], a[1] - 1, a[2]).getTime();
  const t2 = new Date(b[0], b[1] - 1, b[2]).getTime();
  return Math.round((t2 - t1) / 86_400_000);
}

/**
 * Leitner 4단계 간격 반복 스케줄:
 * - stage 0: 오늘 다시 (1일 뒤)
 * - stage 1: 1일 뒤 복습
 * - stage 2: 3일 뒤 복습
 * - stage 3: 7일 뒤 복습
 * - stage 4: 입에 붙음 완료 (14일 뒤 가벼운 리마인드)
 */
export type ReviewStage = 0 | 1 | 2 | 3 | 4;

export interface WordReviewSchedule {
  stage: ReviewStage;
  nextReviewDate: string;
  lastReviewedDate: string;
  completedMissions: number;
}

const STAGE_INTERVAL_DAYS: Record<ReviewStage, number> = {
  0: 1,
  1: 1,
  2: 3,
  3: 7,
  4: 14,
};

export function normalizeReviewWordKey(word: string): string {
  return word.trim().toLowerCase();
}

export function getNextStageIntervalLabel(
  schedule: WordReviewSchedule | undefined
): string {
  const currentStage = schedule?.stage ?? 0;
  const nextStage = Math.min(4, currentStage + 1) as ReviewStage;
  if (nextStage >= 4) return '입에 붙음';
  return `${STAGE_INTERVAL_DAYS[nextStage]}일 뒤`;
}

export function isWordDueForReview(
  schedule: WordReviewSchedule | undefined,
  todayKey: string = getLocalDateKey()
): boolean {
  if (!schedule) return true;
  return schedule.nextReviewDate <= todayKey;
}

export function getReviewStatusMeta(
  schedule: WordReviewSchedule | undefined,
  todayKey: string = getLocalDateKey()
): { label: string; isDue: boolean; isMastered: boolean } {
  if (!schedule) {
    return { label: '오늘 꺼낼 차례', isDue: true, isMastered: false };
  }
  if (schedule.nextReviewDate <= todayKey) {
    return { label: '오늘 꺼낼 차례', isDue: true, isMastered: false };
  }
  if (schedule.stage >= 4) {
    return { label: '입에 붙음 완료', isDue: false, isMastered: true };
  }
  const remain = Math.max(1, diffDateKeyDays(todayKey, schedule.nextReviewDate));
  return {
    label: remain === 1 ? '내일 다시' : `${remain}일 뒤`,
    isDue: false,
    isMastered: false,
  };
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

export type ShortsMode = 'both' | 'word' | 'sentence';

export interface LearningState {
  learnedSymbolIds: string[];
  bookmarkedSymbolIds: string[];
  showKoPronunciation: boolean;
  hasDismissedWelcomeBanner: boolean;

  // 발음 쇼츠 모드 선택 (함께/단어/문장) — 앱 재실행 시 유지
  shortsMode: ShortsMode;

  // 마이페이지: 프로필 · 이용 시간 통계 · 연속 실행 기록
  nickname: string;
  totalStudySeconds: number;
  todayDateKey: string;
  todayStudySeconds: number;
  currentStreakDays: number;
  longestStreakDays: number;
  lastActiveDate: string | null;
  activeDateHistory: string[];

  // 망각 곡선 기반 간격 반복 (1일 · 3일 · 7일 · 완료)
  wordReviews: Record<string, WordReviewSchedule>;

  hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
  toggleSymbolLearned: (symbolId: string) => void;
  isSymbolLearned: (symbolId: string) => boolean;
  toggleSymbolBookmark: (symbolId: string) => void;
  isSymbolBookmarked: (symbolId: string) => boolean;
  setShowKoPronunciation: (show: boolean) => void;
  toggleShowKoPronunciation: () => void;
  setShortsMode: (mode: ShortsMode) => void;
  dismissWelcomeBanner: () => void;
  setNickname: (nickname: string) => void;
  recordAppVisit: (now?: Date) => void;
  addStudySeconds: (seconds: number, now?: Date) => void;
  recordWordReview: (wordKey: string, outcome: 'pass' | 'again', now?: Date) => void;
  recordMasteryMissionComplete: (wordKey: string, now?: Date) => void;
  resetProgress: () => void;
}

export const useLearningStore = create<LearningState>()(
  persist(
    (set, get) => ({
      learnedSymbolIds: [],
      bookmarkedSymbolIds: [],
      showKoPronunciation: true,
      hasDismissedWelcomeBanner: false,
      shortsMode: 'both',

      nickname: '',
      totalStudySeconds: 0,
      todayDateKey: '',
      todayStudySeconds: 0,
      currentStreakDays: 0,
      longestStreakDays: 0,
      lastActiveDate: null,
      activeDateHistory: [],
      wordReviews: {},

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

      setShortsMode: (mode: ShortsMode) => {
        if (!get().hasHydrated) return;
        set({ shortsMode: mode });
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

      recordWordReview: (wordKey: string, outcome: 'pass' | 'again', now: Date = new Date()) => {
        if (!get().hasHydrated) return;
        const key = normalizeReviewWordKey(wordKey);
        const todayKey = getLocalDateKey(now);
        const reviews = { ...get().wordReviews };
        const current = reviews[key];

        if (outcome === 'pass') {
          const currentStage = current?.stage ?? 0;
          const nextStage = Math.min(4, currentStage + 1) as ReviewStage;
          reviews[key] = {
            stage: nextStage,
            nextReviewDate: addDaysToDateKey(todayKey, STAGE_INTERVAL_DAYS[nextStage]),
            lastReviewedDate: todayKey,
            completedMissions: current?.completedMissions ?? 0,
          };
        } else {
          reviews[key] = {
            stage: 0,
            nextReviewDate: addDaysToDateKey(todayKey, 1),
            lastReviewedDate: todayKey,
            completedMissions: current?.completedMissions ?? 0,
          };
        }

        set({ wordReviews: reviews });
      },

      recordMasteryMissionComplete: (wordKey: string, now: Date = new Date()) => {
        if (!get().hasHydrated) return;
        const key = normalizeReviewWordKey(wordKey);
        const todayKey = getLocalDateKey(now);
        const reviews = { ...get().wordReviews };
        const current = reviews[key];

        reviews[key] = {
          stage: current?.stage ?? 0,
          nextReviewDate: current?.nextReviewDate ?? addDaysToDateKey(todayKey, 1),
          lastReviewedDate: todayKey,
          completedMissions: (current?.completedMissions ?? 0) + 1,
        };

        set({ wordReviews: reviews });
      },

      resetProgress: () => {
        set({
          learnedSymbolIds: [],
          bookmarkedSymbolIds: [],
          showKoPronunciation: true,
          hasDismissedWelcomeBanner: false,
          shortsMode: 'both',
          nickname: '',
          totalStudySeconds: 0,
          todayDateKey: '',
          todayStudySeconds: 0,
          currentStreakDays: 0,
          longestStreakDays: 0,
          lastActiveDate: null,
          activeDateHistory: [],
          wordReviews: {},
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
        shortsMode: state.shortsMode,
        nickname: state.nickname,
        totalStudySeconds: state.totalStudySeconds,
        todayDateKey: state.todayDateKey,
        todayStudySeconds: state.todayStudySeconds,
        currentStreakDays: state.currentStreakDays,
        longestStreakDays: state.longestStreakDays,
        lastActiveDate: state.lastActiveDate,
        activeDateHistory: state.activeDateHistory,
        wordReviews: state.wordReviews,
      }),
      merge: (persistedState, currentState) => {
        const raw =
          persistedState && typeof persistedState === 'object'
            ? (persistedState as Partial<LearningState>)
            : {};
        const validMode: ShortsMode =
          raw.shortsMode === 'both' ||
          raw.shortsMode === 'word' ||
          raw.shortsMode === 'sentence'
            ? raw.shortsMode
            : currentState.shortsMode;
        const safeNonNeg = (v: unknown, fallback: number) =>
          typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback;
        const safeReviews =
          raw.wordReviews &&
          typeof raw.wordReviews === 'object' &&
          !Array.isArray(raw.wordReviews)
            ? raw.wordReviews
            : currentState.wordReviews;

        return {
          ...currentState,
          learnedSymbolIds: Array.isArray(raw.learnedSymbolIds)
            ? raw.learnedSymbolIds.filter((x): x is string => typeof x === 'string')
            : currentState.learnedSymbolIds,
          bookmarkedSymbolIds: Array.isArray(raw.bookmarkedSymbolIds)
            ? raw.bookmarkedSymbolIds.filter((x): x is string => typeof x === 'string')
            : currentState.bookmarkedSymbolIds,
          showKoPronunciation:
            typeof raw.showKoPronunciation === 'boolean'
              ? raw.showKoPronunciation
              : currentState.showKoPronunciation,
          hasDismissedWelcomeBanner:
            typeof raw.hasDismissedWelcomeBanner === 'boolean'
              ? raw.hasDismissedWelcomeBanner
              : currentState.hasDismissedWelcomeBanner,
          shortsMode: validMode,
          nickname: typeof raw.nickname === 'string' ? raw.nickname : currentState.nickname,
          totalStudySeconds: safeNonNeg(raw.totalStudySeconds, currentState.totalStudySeconds),
          todayDateKey:
            typeof raw.todayDateKey === 'string' ? raw.todayDateKey : currentState.todayDateKey,
          todayStudySeconds: safeNonNeg(raw.todayStudySeconds, currentState.todayStudySeconds),
          currentStreakDays: safeNonNeg(raw.currentStreakDays, currentState.currentStreakDays),
          longestStreakDays: safeNonNeg(raw.longestStreakDays, currentState.longestStreakDays),
          lastActiveDate:
            typeof raw.lastActiveDate === 'string' || raw.lastActiveDate === null
              ? raw.lastActiveDate
              : currentState.lastActiveDate,
          activeDateHistory: Array.isArray(raw.activeDateHistory)
            ? raw.activeDateHistory.filter((x): x is string => typeof x === 'string')
            : currentState.activeDateHistory,
          wordReviews: safeReviews,
        };
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          void safeAsyncStorage.removeItem('baro-english-learning-storage-v1');
        }
        useLearningStore.getState().setHasHydrated(true);
      },
    }
  )
);
