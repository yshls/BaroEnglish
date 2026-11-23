import coreWordsRaw from './coreWords.json';
import type { CoreWord } from '../types/learning';

export const CORE_WORDS: CoreWord[] = coreWordsRaw as CoreWord[];

export const RECOMMENDED_WORD_IDS: string[] = [
  'word_banana',
  'word_family',
  'word_coffee',
  'word_today',
  'word_hospital',
  'word_tomorrow',
  'word_water',
  'word_hello',
];

export const RECOMMENDED_WORDS: CoreWord[] = RECOMMENDED_WORD_IDS.map((id) =>
  CORE_WORDS.find((w) => w.id === id)
).filter((w): w is CoreWord => Boolean(w));

/**
 * 영문 단어 또는 한글 뜻으로 로컬 단어 검색
 */
export function searchCoreWords(query: string, words: CoreWord[] = CORE_WORDS): CoreWord[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const exact: CoreWord[] = [];
  const startsWith: CoreWord[] = [];
  const includes: CoreWord[] = [];

  for (const item of words) {
    const en = item.word.toLowerCase();
    const ko = item.meaningKo.toLowerCase();

    if (en === normalized || ko === normalized) {
      exact.push(item);
    } else if (en.startsWith(normalized) || ko.startsWith(normalized)) {
      startsWith.push(item);
    } else if (en.includes(normalized) || ko.includes(normalized)) {
      includes.push(item);
    }
  }

  return [...exact, ...startsWith, ...includes];
}

/**
 * 미등록 단어 검색 시 비슷한 기초 단어 추천 (최대 limit개)
 */
export function getSimilarFallbackWords(
  query: string,
  words: CoreWord[] = CORE_WORDS,
  limit = 4
): CoreWord[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return RECOMMENDED_WORDS.slice(0, limit);

  const scored = words.map((item) => {
    const en = item.word.toLowerCase();
    const ko = item.meaningKo.toLowerCase();
    let score = 0;

    if (en[0] === normalized[0]) score += 3;
    if (normalized.length >= 2 && en.includes(normalized.slice(0, 2))) score += 4;
    if (ko[0] === normalized[0]) score += 3;

    // 공통 문자 수 점수
    const chars = new Set(normalized.split(''));
    for (const ch of chars) {
      if (en.includes(ch) || ko.includes(ch)) score += 1;
    }

    return { item, score };
  });

  const sorted = scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);

  if (sorted.length >= limit) {
    return sorted.slice(0, limit);
  }

  const seen = new Set(sorted.map((w) => w.id));
  for (const fallback of RECOMMENDED_WORDS) {
    if (!seen.has(fallback.id)) {
      sorted.push(fallback);
      seen.add(fallback.id);
    }
    if (sorted.length >= limit) break;
  }

  return sorted.slice(0, limit);
}
