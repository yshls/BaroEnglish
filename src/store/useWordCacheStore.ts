import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CoreWord } from '../types/learning';
import { safeAsyncStorage } from './safeAsyncStorage';

const MAX_CACHED_WORDS = 300;
const MAX_RECENT_WORDS = 12;

/**
 * 첫 화면 추천 검색어 키워드 (하드코딩된 단어 DB가 아니라, 터치 시 상업용 무료 API로 실시간 조회 후 캐싱)
 */
export const STARTER_SEARCH_CHIPS = [
  { word: 'banana', labelKo: '바나나' },
  { word: 'family', labelKo: '가족' },
  { word: 'coffee', labelKo: '커피' },
  { word: 'hospital', labelKo: '병원' },
  { word: 'tomorrow', labelKo: '내일' },
  { word: 'water', labelKo: '물' },
  { word: 'together', labelKo: '함께' },
  { word: 'delicious', labelKo: '맛있는' },
] as const;

export interface WordCacheState {
  cachedWords: Record<string, CoreWord>;
  recentWords: string[];
  bookmarkedWordKeys: string[];
  activeWord: CoreWord | null;
  hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
  setActiveWord: (word: CoreWord | null) => void;
  saveWord: (word: CoreWord) => void;
  toggleWordBookmark: (word: CoreWord) => void;
  isWordBookmarked: (englishWord: string) => boolean;
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
      activeWord: null,
      hasHydrated: false,

      setHasHydrated: (hydrated: boolean) => {
        set({ hasHydrated: hydrated });
      },

      setActiveWord: (word: CoreWord | null) => {
        set({ activeWord: word });
      },

      saveWord: (word: CoreWord) => {
        const key = word.word.toLowerCase();
        const prevMap = get().cachedWords;
        const prevRecent = get().recentWords.filter((k) => k !== key);
        const nextRecent = [key, ...prevRecent].slice(0, MAX_RECENT_WORDS);

        const nextMap: Record<string, CoreWord> = {
          ...prevMap,
          [key]: word,
        };

        // LRU 캐시 상한 유지 (최근 검색어 + 북마크 단어는 절대 삭제하지 않음)
        const keys = Object.keys(nextMap);
        if (keys.length > MAX_CACHED_WORDS) {
          const keepSet = new Set([
            ...nextRecent,
            ...get().bookmarkedWordKeys,
          ]);
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

      toggleWordBookmark: (word: CoreWord) => {
        if (!get().hasHydrated) return;
        const key = word.word.toLowerCase();
        const current = get().bookmarkedWordKeys;
        const exists = current.includes(key);
        const nextBookmarks = exists
          ? current.filter((k) => k !== key)
          : [key, ...current];

        const prevMap = get().cachedWords;
        const nextMap =
          exists || prevMap[key]
            ? prevMap
            : { ...prevMap, [key]: word };

        set({
          bookmarkedWordKeys: nextBookmarks,
          cachedWords: nextMap,
        });
      },

      isWordBookmarked: (englishWord: string) => {
        return get().bookmarkedWordKeys.includes(englishWord.trim().toLowerCase());
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
        const bookmarkedKeys = get().bookmarkedWordKeys;
        const prevMap = get().cachedWords;
        const preservedMap: Record<string, CoreWord> = {};
        for (const key of bookmarkedKeys) {
          if (prevMap[key]) {
            preservedMap[key] = prevMap[key];
          }
        }
        set({ cachedWords: preservedMap, recentWords: [] });
      },
    }),
    {
      name: 'baro-english-word-cache-v1',
      version: 1,
      storage: createJSONStorage(() => safeAsyncStorage),
      partialize: (state) => ({
        cachedWords: state.cachedWords,
        recentWords: state.recentWords,
        bookmarkedWordKeys: state.bookmarkedWordKeys,
      }),
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          void safeAsyncStorage.removeItem('baro-english-word-cache-v1');
        }
        useWordCacheStore.getState().setHasHydrated(true);
      },
    }
  )
);
