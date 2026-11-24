import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CoreWord } from '../types/learning';
import { safeAsyncStorage } from './safeAsyncStorage';

const MAX_CACHED_WORDS = 300;
const MAX_RECENT_WORDS = 12;

export interface WordCacheState {
  cachedWords: Record<string, CoreWord>;
  recentWords: string[];
  bookmarkedWordKeys: string[];
  hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
  saveWord: (word: CoreWord) => void;
  toggleBookmark: (word: CoreWord) => void;
  isBookmarked: (englishWord: string) => boolean;
  getCachedWord: (englishWord: string) => CoreWord | undefined;
  findCachedByQuery: (query: string) => CoreWord | undefined;
  clearCache: () => void;
}

export const useWordCacheStore = create<WordCacheState>()(
  persist(
    (set, get) => ({
      cachedWords: {},
      recentWords: [],
      bookmarkedWordKeys: [],
      hasHydrated: false,

      setHasHydrated: (hydrated: boolean) => {
        set({ hasHydrated: hydrated });
      },

      saveWord: (word: CoreWord) => {
        const key = word.word.toLowerCase();
        const prevMap = get().cachedWords;
        const prevRecent = get().recentWords.filter((k) => k !== key);
        const nextRecent = [key, ...prevRecent].slice(0, MAX_RECENT_WORDS);
        const bookmarked = get().bookmarkedWordKeys ?? [];

        const nextMap: Record<string, CoreWord> = {
          ...prevMap,
          [key]: word,
        };

        // LRU 캐시 상한 유지 (최근 단어 및 북마크된 단어는 절대 자동 삭제하지 않음)
        const keys = Object.keys(nextMap);
        if (keys.length > MAX_CACHED_WORDS) {
          const keepSet = new Set([...nextRecent, ...bookmarked]);
          for (const candidate of keys) {
            if (Object.keys(nextMap).length <= MAX_CACHED_WORDS) break;
            if (!keepSet.has(candidate) && candidate !== key) {
              delete nextMap[candidate];
            }
          }
        }

        set({
          cachedWords: nextMap,
          recentWords: nextRecent,
        });
      },

      toggleBookmark: (word: CoreWord) => {
        if (!get().hasHydrated) return;
        const key = word.word.toLowerCase();
        const prevBookmarks = Array.isArray(get().bookmarkedWordKeys)
          ? get().bookmarkedWordKeys
          : [];
        const exists = prevBookmarks.includes(key);

        const nextBookmarks = exists
          ? prevBookmarks.filter((k) => k !== key)
          : [key, ...prevBookmarks];

        set({
          bookmarkedWordKeys: nextBookmarks,
          cachedWords: {
            ...get().cachedWords,
            [key]: word,
          },
        });
      },

      isBookmarked: (englishWord: string) => {
        const key = englishWord.trim().toLowerCase();
        const list = get().bookmarkedWordKeys;
        return Array.isArray(list) ? list.includes(key) : false;
      },

      getCachedWord: (englishWord: string) => {
        return get().cachedWords[englishWord.trim().toLowerCase()];
      },

      findCachedByQuery: (query: string) => {
        const q = query.trim().toLowerCase();
        if (!q) return undefined;
        const map = get().cachedWords;
        if (map[q]) return map[q];
        return Object.values(map).find(
          (item) => item.meaningKo.toLowerCase() === q
        );
      },

      clearCache: () => {
        set({ cachedWords: {}, recentWords: [], bookmarkedWordKeys: [] });
      },
    }),
    {
      name: 'baro-english-word-cache-v3',
      version: 4,
      storage: createJSONStorage(() => safeAsyncStorage),
      migrate: (persistedState, version) => {
        const state = (persistedState ?? {}) as Partial<WordCacheState>;
        if (version >= 4 || !state.cachedWords) {
          return state as WordCacheState;
        }

        // v3 -> v4: CMUdict 약모음 합류로 캐시된 re-/be-/de-/pre- 등의 /ə/ 표기를 보존 북마크 유지한 채 자동 보정
        const prefixPatch: Record<string, { ipa: string; koHint: string }> = {
          re: { ipa: 'rɪ', koHint: '리' },
          be: { ipa: 'bɪ', koHint: '비' },
          de: { ipa: 'dɪ', koHint: '디' },
          pre: { ipa: 'prɪ', koHint: '프리' },
        };

        const nextCached: Record<string, CoreWord> = {};
        for (const [key, item] of Object.entries(state.cachedWords)) {
          if (!item || !Array.isArray(item.syllables)) continue;
          let changed = false;
          const nextSyllables = item.syllables.map((syl, idx) => {
            const part = syl.text.toLowerCase().replace(/[^a-z]/g, '');
            if (idx === 0 && syl.isSchwa && prefixPatch[part]) {
              changed = true;
              const patch = prefixPatch[part];
              return {
                ...syl,
                ipa: patch.ipa,
                koHint: patch.koHint,
                isSchwa: false,
              };
            }
            return syl;
          });
          nextCached[key] = changed
            ? {
                ...item,
                syllables: nextSyllables,
                koPronunciation: nextSyllables.map((s) => s.koHint).join('-'),
              }
            : item;
        }

        return {
          ...state,
          cachedWords: nextCached,
        } as WordCacheState;
      },
      partialize: (state) => ({
        cachedWords: state.cachedWords,
        recentWords: state.recentWords,
        bookmarkedWordKeys: state.bookmarkedWordKeys,
      }),
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          void safeAsyncStorage.removeItem('baro-english-word-cache-v3');
        }
        useWordCacheStore.getState().setHasHydrated(true);
      },
    }
  )
);
