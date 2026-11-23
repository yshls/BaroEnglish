import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CoreWord } from '../types/learning';

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
  saveWord: (word: CoreWord) => void;
  getCachedWord: (englishWord: string) => CoreWord | undefined;
  findCachedByQuery: (query: string) => CoreWord | undefined;
  clearCache: () => void;
}

export const useWordCacheStore = create<WordCacheState>()(
  persist(
    (set, get) => ({
      cachedWords: {},
      recentWords: [],

      saveWord: (word: CoreWord) => {
        const key = word.word.toLowerCase();
        const prevMap = get().cachedWords;
        const prevRecent = get().recentWords.filter((k) => k !== key);
        const nextRecent = [key, ...prevRecent].slice(0, MAX_RECENT_WORDS);

        const nextMap: Record<string, CoreWord> = {
          ...prevMap,
          [key]: word,
        };

        // LRU 캐시 상한 유지
        const keys = Object.keys(nextMap);
        if (keys.length > MAX_CACHED_WORDS) {
          const keepSet = new Set(nextRecent);
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
        set({ cachedWords: {}, recentWords: [] });
      },
    }),
    {
      name: 'baro-english-word-cache-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        cachedWords: state.cachedWords,
        recentWords: state.recentWords,
      }),
    }
  )
);
