import type {
  CoreWord,
  ExampleDifficultyLevel,
  ExampleWordSegment,
  IpaSymbol,
  SymbolExampleWord,
  WordExample,
} from '../types/learning';
import {
  buildFallbackPhonetics,
  buildPhoneticsFromArpa,
} from './phoneticsParser';

const REQUEST_TIMEOUT_MS = 4500;
const OPTIONAL_API_TIMEOUT_MS = 2000;

let tatoebaConsecutiveFailures = 0;
let tatoebaCooldownUntil = 0;
let myMemoryCooldownUntil = 0;

const POS_KO_MAP: Record<string, string> = {
  noun: '명사',
  verb: '동사',
  adjective: '형용사',
  adverb: '부사',
  pronoun: '대명사',
  preposition: '전치사',
  conjunction: '접속사',
  interjection: '감탄사',
  exclamation: '감탄사',
  determiner: '한정사',
};

export interface WordSuggestion {
  word: string;
  score?: number;
}

export interface LookupResult {
  word: CoreWord | null;
  resolvedEnglishQuery: string;
  suggestions: string[];
  errorType?: 'not_found' | 'network';
}

interface FetchJsonOptions {
  timeoutMs?: number;
  onStatus?: (status: number) => void;
}

async function fetchJsonWithTimeout<T>(
  url: string,
  options?: FetchJsonOptions
): Promise<T | null> {
  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    options?.onStatus?.(res.status);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function containsKorean(text: string): boolean {
  return /[가-힣]/.test(text);
}

export function sanitizeEnglishWord(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z'-]/g, '')
    .replace(/^['-]+|['-]+$/g, '');
}

// 1. Datamuse 실시간 영단어 자동완성/유사 추천 (무료, 100k req/day, 상업용 허용)
export async function fetchWordSuggestions(
  prefix: string,
  max = 6
): Promise<string[]> {
  const clean = sanitizeEnglishWord(prefix);
  if (clean.length < 2) return [];

  const data = await fetchJsonWithTimeout<WordSuggestion[]>(
    `https://api.datamuse.com/sug?s=${encodeURIComponent(clean)}&max=${max}`
  );
  if (!Array.isArray(data)) return [];

  return data
    .map((item) => item.word)
    .filter((w) => /^[a-z]+$/i.test(w))
    .slice(0, max);
}

interface DatamuseWordItem {
  word: string;
  numSyllables?: number;
  tags?: string[];
}

async function fetchDatamusePhonetics(word: string): Promise<{
  arpaPron?: string;
  ipaPron?: string;
} | null> {
  const data = await fetchJsonWithTimeout<DatamuseWordItem[]>(
    `https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=sr&ipa=1&max=1`
  );
  if (!Array.isArray(data) || data.length === 0) return null;

  const entry = data.find((d) => d.word.toLowerCase() === word.toLowerCase()) ?? data[0];
  const tags = entry.tags ?? [];
  const pronTag = tags.find((t) => t.startsWith('pron:'));
  const ipaTag = tags.find((t) => t.startsWith('ipa_pron:'));

  return {
    arpaPron: pronTag ? pronTag.replace(/^pron:/, '').trim() : undefined,
    ipaPron: ipaTag ? ipaTag.replace(/^ipa_pron:/, '').trim() : undefined,
  };
}

interface DictionaryApiEntry {
  word?: string;
  phonetic?: string;
  phonetics?: {
    text?: string;
    audio?: string;
  }[];
  meanings?: {
    partOfSpeech?: string;
    definitions?: {
      definition?: string;
      example?: string;
    }[];
  }[];
}

async function fetchDictionaryDev(word: string): Promise<{
  ipa?: string;
  audioUrl?: string;
  partOfSpeech?: string;
  examplesEn: string[];
} | null> {
  const data = await fetchJsonWithTimeout<DictionaryApiEntry[]>(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
  );
  if (!Array.isArray(data) || data.length === 0) return null;

  const entry = data[0];
  const phonetics = entry.phonetics ?? [];

  // 미국식(-us.mp3) 원어민 음원 우선, 없으면 가용한 첫 mp3 선택
  const usAudio = phonetics.find(
    (p) => p.audio && /(-us|us\.mp3)/i.test(p.audio)
  );
  const anyAudio = phonetics.find((p) => p.audio && p.audio.startsWith('http'));
  const audioUrl = usAudio?.audio || anyAudio?.audio;

  const usIpa =
    usAudio?.text ||
    phonetics.find((p) => p.text && p.text.trim().length > 0)?.text ||
    entry.phonetic;

  const firstMeaning = entry.meanings?.[0];
  const rawPos = firstMeaning?.partOfSpeech?.toLowerCase();
  const partOfSpeech = rawPos ? (POS_KO_MAP[rawPos] ?? rawPos) : undefined;

  const examplesEn: string[] = [];
  for (const m of entry.meanings ?? []) {
    for (const def of m.definitions ?? []) {
      const ex = def.example?.trim();
      if (
        ex &&
        ex.length >= 10 &&
        ex.length <= 110 &&
        !examplesEn.includes(ex)
      ) {
        examplesEn.push(ex);
        if (examplesEn.length >= 3) break;
      }
    }
    if (examplesEn.length >= 3) break;
  }

  return {
    ipa: usIpa,
    audioUrl,
    partOfSpeech,
    examplesEn,
  };
}

interface FreeDictionaryTranslation {
  language?: { code?: string };
  word?: string;
  tags?: string[];
}

interface FreeDictionarySense {
  definition?: string;
  tags?: string[];
  examples?: string[];
  translations?: FreeDictionaryTranslation[];
  subsenses?: FreeDictionarySense[];
}

interface FreeDictionaryV1Response {
  entries?: {
    partOfSpeech?: string;
    pronunciations?: {
      type?: string;
      text?: string;
      tags?: string[];
    }[];
    senses?: FreeDictionarySense[];
  }[];
}

const JARGON_DEF_PATTERN =
  /^\s*\([^)]*(linguistics|biology|taxonomy|botany|zoology|mathematics|math|chemistry|physics|geology|astronomy|heraldry|law|legal|archaic|obsolete|slang|vulgar|dialect|nautical|military|chess|poker|computing|programming|baseball|cricket|golf|anatomy|medicine|grammar|phonetics|historical|dated|rare|figurative)[^)]*\)/i;

const JARGON_TAG_PATTERN =
  /(linguistics|biology|taxonomy|botany|zoology|mathematics|chemistry|physics|geology|astronomy|heraldry|law|legal|archaic|obsolete|slang|vulgar|dialect|dated|rare|north korea|china|yanbian)/i;

function isJargonSense(sense: FreeDictionarySense): boolean {
  const def = sense.definition ?? '';
  if (JARGON_DEF_PATTERN.test(def)) return true;
  const tags = (sense.tags ?? []).join(' ');
  return JARGON_TAG_PATTERN.test(tags);
}

function collectFreeDictDetails(
  senses: FreeDictionarySense[] | undefined,
  koBucket: string[],
  examplesBucket: string[],
  depth = 0
) {
  if (!Array.isArray(senses)) return;
  for (let i = 0; i < senses.length; i += 1) {
    const sense = senses[i];
    for (const ex of sense.examples ?? []) {
      const cleanedEx = ex.trim();
      if (
        cleanedEx.length >= 10 &&
        cleanedEx.length <= 110 &&
        examplesBucket.length < 3 &&
        !examplesBucket.includes(cleanedEx)
      ) {
        examplesBucket.push(cleanedEx);
      }
    }

    // 일상 핵심 뜻만 수집: 최상위 1~2번째 의미이면서 전문 학술/고어/방언 태그가 아닌 경우만 채택
    const allowTranslations = depth === 0 && i < 2 && !isJargonSense(sense);
    if (allowTranslations) {
      for (const tr of sense.translations ?? []) {
        if (tr.language?.code !== 'ko' || !tr.word || !containsKorean(tr.word)) {
          continue;
        }
        const tags = (tr.tags ?? []).join(' ').toLowerCase();
        if (JARGON_TAG_PATTERN.test(tags)) {
          continue;
        }
        const cleaned = tr.word.trim();
        if (cleaned && !koBucket.includes(cleaned)) {
          koBucket.push(cleaned);
        }
      }
    }

    if (sense.subsenses) {
      collectFreeDictDetails(sense.subsenses, koBucket, examplesBucket, depth + 1);
    }
  }
}

async function fetchFreeDictionaryKorean(word: string): Promise<{
  meaningKo?: string;
  usIpa?: string;
  partOfSpeech?: string;
  examplesEn: string[];
} | null> {
  const data = await fetchJsonWithTimeout<FreeDictionaryV1Response>(
    `https://freedictionaryapi.com/api/v1/entries/en/${encodeURIComponent(word)}?translations=true`
  );
  if (!data?.entries || data.entries.length === 0) return null;

  const koWords: string[] = [];
  const examplesEn: string[] = [];
  let usIpa: string | undefined;
  let partOfSpeech: string | undefined;

  for (let entryIdx = 0; entryIdx < data.entries.length; entryIdx += 1) {
    const entry = data.entries[entryIdx];
    if (!partOfSpeech && entry.partOfSpeech) {
      const key = entry.partOfSpeech.toLowerCase();
      partOfSpeech = POS_KO_MAP[key] ?? entry.partOfSpeech;
    }

    if (!usIpa && Array.isArray(entry.pronunciations)) {
      const us = entry.pronunciations.find(
        (p) =>
          p.type === 'ipa' &&
          p.text &&
          p.tags?.some((t) => /American|US|General American/i.test(t))
      );
      const anyIpa = entry.pronunciations.find((p) => p.type === 'ipa' && p.text);
      usIpa = us?.text || anyIpa?.text;
    }

    // 첫 번째 대표 품사 엔트리에서만 핵심 한글 뜻을 우선 수집하고, 예문은 모든 엔트리에서 보강
    collectFreeDictDetails(entry.senses, entryIdx === 0 ? koWords : [], examplesEn, 0);
  }

  // Wiktionary 기본 뜻 순서를 유지하되 '~색' 파생 명칭만 뒤로 보냄
  const nonColor = koWords.filter((w) => !w.endsWith('색'));
  const colorOnly = koWords.filter((w) => w.endsWith('색'));
  const prioritized = nonColor.length > 0 ? nonColor : colorOnly;

  return {
    meaningKo:
      prioritized.length > 0 ? prioritized.slice(0, 2).join(' · ') : undefined,
    usIpa,
    partOfSpeech,
    examplesEn,
  };
}

interface KoWiktionaryResponse {
  query?: {
    pages?: Record<
      string,
      {
        extract?: string;
      }
    >;
  };
}

export function extractCleanKoWiktionaryMeaning(
  extract: string,
  englishWord: string
): string | undefined {
  // "== 영어 ==" 섹션만 추출
  const enSectionMatch = /==\s*영어\s*==([\s\S]*?)(?:\n==[^=]|$)/.exec(extract);
  if (!enSectionMatch) return undefined;

  const escapedWord = englishWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const startsWithEnglishWord = new RegExp(`^${escapedWord}\\b`, 'i');

  const lines = enSectionMatch[1]
    .split('\n')
    .map((l) => l.trim())
    .filter(
      (l) =>
        l.length > 0 &&
        !l.startsWith('=') &&
        !startsWithEnglishWord.test(l) &&
        !/^[a-zA-Z]/.test(l) &&
        !/\bIPA\b|\/[^/\s]+\//.test(l) &&
        !/(가산명사|불가산명사|복수형|단수형|비교급|최상급|과거분사|현재분사)/.test(l) &&
        !/^(발음|어원|참조|유의어|반의어|관용구|파생어|합성어|속담|용법|부록|어형)/.test(l) &&
        containsKorean(l)
    );

  for (const rawLine of lines) {
    let cleaned = rawLine.replace(/^\d+[.)]\s*/, '').trim();
    while (/^\([^)]*\)\s*/.test(cleaned)) {
      cleaned = cleaned.replace(/^\([^)]*\)\s*/, '').trim();
    }
    if (/(에서|으로|하는|되는|있는|없는|말한다|뜻한다|가리킨다)/.test(cleaned)) {
      continue;
    }
    cleaned = cleaned
      .replace(/\s*\([^)]*\).*$/, '')
      .replace(/[.;].*$/, '')
      .trim();

    if (!cleaned || !containsKorean(cleaned) || /[a-zA-Z]/.test(cleaned)) {
      continue;
    }

    const parts = cleaned
      .split(/[,/·]+/)
      .map((p) => p.trim())
      .filter(
        (p) =>
          p.length >= 1 &&
          p.length <= 12 &&
          containsKorean(p) &&
          !/또는/.test(p)
      );

    if (parts.length > 0) {
      const joined = parts.slice(0, 2).join(' · ');
      if (joined.length <= 20) {
        return joined;
      }
    }
  }

  return undefined;
}

async function fetchKoWiktionaryMeaning(word: string): Promise<string | undefined> {
  const data = await fetchJsonWithTimeout<KoWiktionaryResponse>(
    `https://ko.wiktionary.org/w/api.php?action=query&titles=${encodeURIComponent(
      word
    )}&prop=extracts&explaintext=1&exchars=700&format=json&origin=*`
  );
  const pages = data?.query?.pages;
  if (!pages) return undefined;

  const firstPage = Object.values(pages)[0];
  const extract = firstPage?.extract;
  if (!extract) return undefined;

  return extractCleanKoWiktionaryMeaning(extract, word);
}

interface MyMemoryResponse {
  responseData?: {
    translatedText?: string;
  };
  matches?: {
    translation?: string;
    quality?: string | number;
  }[];
}

const translationCache = new Map<string, string>();
const MAX_TRANSLATION_CACHE_SIZE = 400;

function rememberTranslation(cacheKey: string, value: string): void {
  if (translationCache.size >= MAX_TRANSLATION_CACHE_SIZE) {
    const oldestKey = translationCache.keys().next().value;
    if (oldestKey) {
      translationCache.delete(oldestKey);
    }
  }
  translationCache.set(cacheKey, value);
}

async function translateViaGoogleGtx(
  text: string,
  pair: 'en|ko' | 'ko|en'
): Promise<string | undefined> {
  const [sl, tl] = pair.split('|');
  const data = await fetchJsonWithTimeout<unknown[]>(
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`,
    { timeoutMs: 3500 }
  );
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    return undefined;
  }
  const translated = (data[0] as unknown[])
    .map((part) => (Array.isArray(part) && typeof part[0] === 'string' ? part[0] : ''))
    .join('')
    .trim();

  if (!translated || translated.toLowerCase() === text.toLowerCase()) {
    return undefined;
  }
  return translated;
}

async function translateViaMyMemory(
  text: string,
  pair: 'en|ko' | 'ko|en'
): Promise<string | undefined> {
  if (Date.now() < myMemoryCooldownUntil) {
    return undefined;
  }
  const data = await fetchJsonWithTimeout<MyMemoryResponse>(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${pair}`,
    {
      timeoutMs: OPTIONAL_API_TIMEOUT_MS,
      onStatus: (status) => {
        if (status === 429) {
          myMemoryCooldownUntil = Date.now() + 5 * 60 * 1000;
        }
      },
    }
  );
  const translated = data?.responseData?.translatedText?.trim();
  if (
    !translated ||
    translated.toLowerCase() === text.toLowerCase() ||
    /MYMEMORY WARNING/i.test(translated)
  ) {
    return undefined;
  }
  return translated;
}

async function translateText(
  text: string,
  pair: 'en|ko' | 'ko|en'
): Promise<string | undefined> {
  const trimmed = text.trim();
  if (!trimmed) return undefined;

  const cacheKey = `${pair}:${trimmed.toLowerCase()}`;
  const cached = translationCache.get(cacheKey);
  if (cached) return cached;

  const fromGoogle = await translateViaGoogleGtx(trimmed, pair);
  if (fromGoogle) {
    rememberTranslation(cacheKey, fromGoogle);
    return fromGoogle;
  }

  const fromMyMemory = await translateViaMyMemory(trimmed, pair);
  if (fromMyMemory) {
    rememberTranslation(cacheKey, fromMyMemory);
    return fromMyMemory;
  }

  return undefined;
}

/**
 * 영어 예문을 자연스러운 한국어 해석으로 번역합니다.
 * (Google GTX 우선 -> MyMemory 폴백, 메모리 캐시 지원)
 */
export async function translateEnglishSentenceToKorean(
  sentence: string
): Promise<string | undefined> {
  const translated = await translateText(sentence, 'en|ko');
  if (!translated || !containsKorean(translated)) {
    return undefined;
  }
  return translated.trim();
}

/**
 * 한글 검색어 -> 영단어 변환 (예: "딸기" -> "strawberry", "병원" -> "hospital")
 */
export async function resolveKoreanQueryToEnglish(
  koreanQuery: string
): Promise<string | null> {
  const translated = await translateText(koreanQuery.trim(), 'ko|en');
  if (!translated) return null;

  // "the hospital" / "a strawberry" 등 관사 제거 후 핵심 영단어 추출
  const cleaned = translated
    .toLowerCase()
    .replace(/^(a|an|the|to)\s+/i, '')
    .split(/[\s,/.;!?]+/)[0];

  const word = sanitizeEnglishWord(cleaned);
  return word.length >= 2 ? word : null;
}

interface TatoebaTranslation {
  lang?: string;
  text?: string;
}

interface TatoebaSentenceItem {
  text?: string;
  translations?: (TatoebaTranslation | TatoebaTranslation[])[];
}

interface TatoebaResponse {
  data?: TatoebaSentenceItem[];
}

function normalizeSentenceKey(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
}

/**
 * Tatoeba 상업용 무료 오픈 예문 API (CC BY 2.0 FR, CORS 허용):
 * 짧은 영어 생활 문장 + 자연스러운 한국어 해석 쌍을 최대 max개 선별합니다.
 */
async function fetchTatoebaExamples(
  word: string,
  max = 3
): Promise<WordExample[]> {
  if (Date.now() < tatoebaCooldownUntil) {
    return [];
  }

  const data = await fetchJsonWithTimeout<TatoebaResponse>(
    `https://api.tatoeba.org/unstable/sentences?lang=eng&q=${encodeURIComponent(
      word
    )}&trans:lang=kor&sort=words&limit=15`,
    { timeoutMs: OPTIONAL_API_TIMEOUT_MS }
  );
  if (!data) {
    tatoebaConsecutiveFailures += 1;
    if (tatoebaConsecutiveFailures >= 2) {
      tatoebaCooldownUntil = Date.now() + 3 * 60 * 1000;
    }
    return [];
  }
  tatoebaConsecutiveFailures = 0;

  if (!Array.isArray(data.data) || data.data.length === 0) return [];

  const candidates: { en: string; ko: string; wordCount: number }[] = [];

  for (const item of data.data) {
    const en = item.text?.trim();
    if (!en || en.length < 8 || en.length > 110) continue;

    const flatTranslations: TatoebaTranslation[] = [];
    for (const group of item.translations ?? []) {
      if (Array.isArray(group)) {
        flatTranslations.push(...group);
      } else if (group) {
        flatTranslations.push(group);
      }
    }

    const koEntry = flatTranslations.find(
      (t) => t.lang === 'kor' && t.text && containsKorean(t.text)
    );
    const ko = koEntry?.text?.trim();
    if (!ko) continue;

    const wordCount = en.split(/\s+/).filter(Boolean).length;
    candidates.push({ en, ko, wordCount });
  }

  // 3단어 이상의 완성된 짧은 생활 문장을 우선 선별하고, 부족할 때만 2단어 문장 보충
  const ordered = [
    ...candidates.filter((c) => c.wordCount >= 3),
    ...candidates.filter((c) => c.wordCount === 2),
  ];

  const picked: WordExample[] = [];
  const seenEn = new Set<string>();
  const seenKo = new Set<string>();

  for (const item of ordered) {
    const enKey = normalizeSentenceKey(item.en);
    const koKey = normalizeSentenceKey(item.ko);
    if (!enKey || !koKey || seenEn.has(enKey) || seenKo.has(koKey)) {
      continue;
    }
    seenEn.add(enKey);
    seenKo.add(koKey);
    picked.push({ en: item.en, ko: item.ko });
    if (picked.length >= max) break;
  }

  return picked;
}

export interface LookupWordOptions {
  /** 쇼츠 무한 피드용 고속 모드: 느린 예문 번역·Tatoeba 대기를 생략해 ~0.5초 내 응답 */
  fastFeedMode?: boolean;
}

/**
 * 상업용 무료 멀티 API 통합 단어 조회:
 * 1) 한글 입력 시 MyMemory(ko->en)로 영단어 매칭
 * 2) dictionaryapi.dev (원어민 MP3 + IPA + 예문)
 *    + Datamuse (CMUdict 강세/음절)
 *    + freedictionaryapi.com (Wiktionary 한글 뜻 + 미국식 IPA + 예문)
 *    + Tatoeba (영어·한국어 쌍 생활 예문, CC BY 2.0 FR) 병렬 호출
 * 3) 한글 뜻/예문 해석 보강 폴백: ko.wiktionary.org -> MyMemory(en->ko)
 */
export async function lookupWordFromApis(
  rawQuery: string,
  options?: LookupWordOptions
): Promise<LookupResult> {
  const fastFeedMode = Boolean(options?.fastFeedMode);
  const trimmed = rawQuery.trim();
  if (!trimmed) {
    return { word: null, resolvedEnglishQuery: '', suggestions: [] };
  }

  let englishWord = '';
  let originalKoreanHint: string | undefined;

  if (containsKorean(trimmed)) {
    originalKoreanHint = trimmed;
    const translated = await resolveKoreanQueryToEnglish(trimmed);
    if (!translated) {
      return {
        word: null,
        resolvedEnglishQuery: trimmed,
        suggestions: [],
        errorType: 'not_found',
      };
    }
    englishWord = translated;
  } else {
    englishWord = sanitizeEnglishWord(trimmed);
    if (!englishWord) {
      return {
        word: null,
        resolvedEnglishQuery: trimmed,
        suggestions: [],
        errorType: 'not_found',
      };
    }
  }

  const [dictDev, datamuse, freeDictKo, tatoebaExamples] = await Promise.all([
    fetchDictionaryDev(englishWord),
    fetchDatamusePhonetics(englishWord),
    fetchFreeDictionaryKorean(englishWord),
    fastFeedMode ? Promise.resolve([]) : fetchTatoebaExamples(englishWord, 3),
  ]);

  // 세 사전/발음 API 모두 응답이 없으면 네트워크/미등록 처리 + Datamuse 유사 단어 추천
  if (!dictDev && !datamuse && !freeDictKo) {
    const suggestions = fastFeedMode
      ? []
      : await fetchWordSuggestions(englishWord, 5);
    return {
      word: null,
      resolvedEnglishQuery: englishWord,
      suggestions,
      errorType: suggestions.length > 0 ? 'not_found' : 'network',
    };
  }

  // 한글 뜻 확보 파이프라인: FreeDictionaryAPI -> ko.wiktionary -> translateText -> 사용자가 입력한 한글
  let meaningKo = freeDictKo?.meaningKo;
  const looksDerivedColor = Boolean(meaningKo && /^[^·]+색$/.test(meaningKo));

  if (!meaningKo || looksDerivedColor) {
    const wikiKo = await fetchKoWiktionaryMeaning(englishWord);
    if (wikiKo) {
      meaningKo = wikiKo;
    }
  }
  const needsMeaningTranslation = !meaningKo || /^[^·]+색$/.test(meaningKo);

  // 관련 생활 예문 최대 3개 조합 (Tatoeba 한영 쌍 우선 -> 사전 예문 보강)
  const examples: WordExample[] = [...tatoebaExamples];
  const seenExampleKeys = new Set(
    examples.map((ex) => normalizeSentenceKey(ex.en))
  );

  const extraEnglishCandidates =
    examples.length < 3
      ? [
          ...(dictDev?.examplesEn ?? []),
          ...(freeDictKo?.examplesEn ?? []),
        ].filter((en) => {
          const key = normalizeSentenceKey(en);
          if (!key || seenExampleKeys.has(key)) return false;
          seenExampleKeys.add(key);
          return true;
        })
      : [];

  const needed = extraEnglishCandidates.slice(0, 3 - examples.length);
  const toTranslateNow = fastFeedMode ? needed.slice(0, 1) : needed;
  const deferredExamples = fastFeedMode ? needed.slice(1) : [];

  const [translatedMeaning, translatedExtras] = await Promise.all([
    needsMeaningTranslation
      ? translateText(englishWord, 'en|ko')
      : Promise.resolve(undefined),
    toTranslateNow.length > 0
      ? Promise.all(
          toTranslateNow.map(async (en): Promise<WordExample> => {
            const ko = await translateEnglishSentenceToKorean(en);
            return { en, ko };
          })
        )
      : Promise.resolve([] as WordExample[]),
  ]);

  if (needsMeaningTranslation && translatedMeaning && containsKorean(translatedMeaning)) {
    meaningKo = translatedMeaning.replace(/[.!?]+$/, '').trim();
  }
  if (!meaningKo && originalKoreanHint) {
    meaningKo = originalKoreanHint;
  }

  if (translatedExtras.length > 0) {
    examples.push(...translatedExtras);
  }
  if (deferredExamples.length > 0) {
    examples.push(...deferredExamples.map((en): WordExample => ({ en })));
  }

  // 음절·강세·IPA·한글 발음 힌트·Tab 1 기호 ID 생성
  const preferredIpa = freeDictKo?.usIpa || dictDev?.ipa || datamuse?.ipaPron;
  const phonetics = datamuse?.arpaPron
    ? buildPhoneticsFromArpa(englishWord, datamuse.arpaPron, preferredIpa)
    : buildFallbackPhonetics(englishWord, preferredIpa);

  const builtWord: CoreWord = {
    id: `word_${englishWord}`,
    word: englishWord,
    meaningKo: meaningKo || '뜻 준비 중 (영문 소리 학습 가능)',
    ipa: phonetics.ipa,
    syllables: phonetics.syllables,
    koPronunciation: phonetics.koPronunciation,
    symbolIds: phonetics.symbolIds,
    audioUrl: dictDev?.audioUrl,
    partOfSpeech: freeDictKo?.partOfSpeech || dictDev?.partOfSpeech,
    exampleEn: examples[0]?.en,
    examples,
    sourceAttribution:
      'Wiktionary (CC BY-SA 4.0) · Tatoeba (CC BY 2.0 FR) · CMUdict / Datamuse · MyMemory',
  };

  return {
    word: builtWord,
    resolvedEnglishQuery: englishWord,
    suggestions: [],
  };
}

export interface QuickWordInfo {
  word: string;
  meaningKo: string;
  ipa?: string;
  koPronunciation?: string;
  partOfSpeech?: string;
  audioUrl?: string;
}

/**
 * 예문 속 단어를 탭했을 때 빠르게 뜻·발음기호·한글 힌트만 조회합니다.
 * (예문 재조회 없이 사전/발음/번역 API만 병렬 호출해 반응 속도 최적화)
 */
export async function lookupQuickWordMeaning(
  rawWord: string
): Promise<QuickWordInfo | null> {
  const cleanWord = sanitizeEnglishWord(rawWord);
  if (!cleanWord) return null;

  // 축약형(don't, it's, I'm 등)은 사전 조회 실패 가능성을 고려해 번역도 함께 보강
  const isContraction = cleanWord.includes("'");
  const [dictDev, datamuse, freeDictKo, contractionKo] = await Promise.all([
    fetchDictionaryDev(cleanWord),
    fetchDatamusePhonetics(cleanWord),
    fetchFreeDictionaryKorean(cleanWord),
    isContraction ? translateText(cleanWord, 'en|ko') : Promise.resolve(undefined),
  ]);

  let meaningKo = freeDictKo?.meaningKo;
  const looksDerivedColor = Boolean(meaningKo && /^[^·]+색$/.test(meaningKo));

  if (!meaningKo || looksDerivedColor) {
    const wikiKo = await fetchKoWiktionaryMeaning(cleanWord);
    if (wikiKo) {
      meaningKo = wikiKo;
    }
  }
  if (!meaningKo || /^[^·]+색$/.test(meaningKo)) {
    const translated =
      contractionKo ?? (await translateText(cleanWord, 'en|ko'));
    if (translated && containsKorean(translated)) {
      meaningKo = translated.replace(/[.!?]+$/, '').trim();
    }
  }

  if (!meaningKo && !dictDev && !datamuse && !freeDictKo) {
    return null;
  }

  const preferredIpa = freeDictKo?.usIpa || dictDev?.ipa || datamuse?.ipaPron;
  const phonetics = datamuse?.arpaPron
    ? buildPhoneticsFromArpa(cleanWord, datamuse.arpaPron, preferredIpa)
    : preferredIpa
      ? buildFallbackPhonetics(cleanWord, preferredIpa)
      : null;

  return {
    word: cleanWord,
    meaningKo: meaningKo || '사전 뜻을 찾지 못했어요 (소리는 들을 수 있어요)',
    ipa: phonetics?.ipa,
    koPronunciation: phonetics?.koPronunciation,
    partOfSpeech: freeDictKo?.partOfSpeech || dictDev?.partOfSpeech,
    audioUrl: dictDev?.audioUrl,
  };
}

interface DatamuseFreqWordItem {
  word: string;
  tags?: string[];
}

function rankDatamuseCandidates(
  data: DatamuseFreqWordItem[],
  excludeWords: Set<string>,
  minFreq: number
): string[] {
  const ranked = data
    .map((item) => {
      const w = item.word?.toLowerCase().trim() ?? '';
      const tags = item.tags ?? [];
      const freqTag = tags.find((t) => t.startsWith('f:'));
      const freq = freqTag ? Number.parseFloat(freqTag.slice(2)) : 0;
      const isProp = tags.includes('prop');
      const hasContentPos = tags.some(
        (t) => t === 'n' || t === 'v' || t === 'adj' || t === 'adv'
      );
      return { word: w, freq, isProp, hasContentPos };
    })
    .filter(
      ({ word, freq, isProp, hasContentPos }) =>
        /^[a-z]{4,9}$/.test(word) &&
        !isProp &&
        hasContentPos &&
        freq >= minFreq &&
        freq <= 900 &&
        !(
          word.endsWith('s') &&
          !word.endsWith('ss') &&
          !word.endsWith('us') &&
          !word.endsWith('is')
        ) &&
        !excludeWords.has(word)
    )
    .sort((a, b) => b.freq - a.freq)
    .slice(0, 18)
    .map((x) => x.word);

  // 매번 신선한 순서로 나오도록 Fisher-Yates 셔플
  for (let i = ranked.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [ranked[i], ranked[j]] = [ranked[j], ranked[i]];
  }
  return ranked;
}

/**
 * 상업용 무료 Datamuse API로 하드코딩 단어·주제 목록 없이 무한 실생활 영단어를 동적 발굴합니다.
 * - 짝수 커서 + 시드 단어 존재 시: 직전 단어에서 연상어 그래프 탐색 (`rel_trg`)
 * - 그 외 / 연상어 부족 시: 알파벳(a~z) × 글자수(4~8자) 와일드카드 패턴 조회 (`sp=a????`)
 */
export async function fetchDailyFeedCandidates(
  cursor: number,
  excludeWords: Set<string>,
  seedWord?: string
): Promise<string[]> {
  const safeCursor = Math.abs(Math.floor(cursor));

  // 1) 직전 단어 기반 연상어 랜덤 워크 (자연스러운 맥락 연결)
  if (seedWord && safeCursor % 2 === 1) {
    const cleanSeed = sanitizeEnglishWord(seedWord);
    if (cleanSeed && /^[a-z]{3,12}$/.test(cleanSeed)) {
      const assocData = await fetchJsonWithTimeout<DatamuseFreqWordItem[]>(
        `https://api.datamuse.com/words?rel_trg=${encodeURIComponent(cleanSeed)}&md=f,p&max=60`
      );
      if (Array.isArray(assocData)) {
        const assocWords = rankDatamuseCandidates(assocData, excludeWords, 12);
        if (assocWords.length >= 4) {
          return assocWords;
        }
      }
    }
  }

  // 2) 하드코딩 단어 없는 순수 알파벳(a~z) × 길이(4~8자) 와일드카드 버킷 탐색
  // 흔히 쓰이는 첫 글자 분포를 골고루 돌도록 서로소 스텝(7) 사용
  const letterIndex = (safeCursor * 7) % 26;
  const startChar = String.fromCharCode(97 + letterIndex);
  const wordLength = 4 + (Math.floor(safeCursor / 5) % 5); // 4, 5, 6, 7, 8자 순환
  const pattern = `${startChar}${'?'.repeat(wordLength - 1)}`;

  const data = await fetchJsonWithTimeout<DatamuseFreqWordItem[]>(
    `https://api.datamuse.com/words?sp=${encodeURIComponent(pattern)}&md=f,p&max=90`
  );
  if (!Array.isArray(data)) return [];

  const primary = rankDatamuseCandidates(data, excludeWords, 12);
  if (primary.length >= 4) return primary;

  // 희소 글자(q, x, z 등) 버킷이면 빈도 기준을 살짝 완화해 후보 확보
  return rankDatamuseCandidates(data, excludeWords, 3);
}

export interface RecommendedWordChip {
  word: string;
  labelKo: string;
  level: 'beginner' | 'intermediate';
}

interface KoWiktionaryBatchResponse {
  query?: {
    pages?: Record<
      string,
      {
        title?: string;
        revisions?: {
          slots?: {
            main?: {
              '*'?: string;
            };
          };
        }[];
      }
    >;
  };
}

function cleanWiktionaryDefLine(rawLine: string): string | null {
  const cleaned = rawLine
    .replace(/^#+\s*/, '')
    .replace(/\[\[(?:파일|File|Image):[^\]]+\]\]/gi, '')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1')
    .replace(/'''?/g, '')
    .replace(/^\d+\.\s*/, '')
    .replace(/[㉹㉶㉸]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/<[^>]+>/g, '')
    .trim();

  const parts = cleaned
    .split(/[,;·./]/)
    .map((p) => p.trim())
    .filter(
      (p) =>
        /[가-힣]/.test(p) &&
        !/[A-Za-z]/.test(p) &&
        p.length >= 1 &&
        p.length <= 9 &&
        !/^(?:의|을|를|이|가|에|로|과|와)$/.test(p)
    );

  return parts[0] ?? null;
}

async function fetchBatchKoWiktionaryLabels(
  words: string[]
): Promise<Record<string, string>> {
  if (words.length === 0) return {};
  const data = await fetchJsonWithTimeout<KoWiktionaryBatchResponse>(
    `https://ko.wiktionary.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&titles=${encodeURIComponent(words.join('|'))}&format=json&origin=*`
  );

  const pages = data?.query?.pages;
  if (!pages) return {};

  const result: Record<string, string> = {};
  for (const page of Object.values(pages)) {
    const title = page.title?.toLowerCase().trim();
    const content = page.revisions?.[0]?.slots?.main?.['*'];
    if (!title || !content) continue;

    const engSectionMatch = /==\s*영어\s*==([\s\S]*?)(?:\n==[^=]|$)/.exec(content);
    const section = engSectionMatch ? engSectionMatch[1] : content;
    const defLines = section
      .split('\n')
      .filter((line) => /^#\s+[^*:#]/.test(line))
      .slice(0, 4);

    for (const line of defLines) {
      const label = cleanWiktionaryDefLine(line);
      if (label) {
        result[title] = label;
        break;
      }
    }
  }
  return result;
}

const COMMON_START_LETTERS = 'abcdefghiklmnoprstw';

async function fetchEverydayBucketByLength(
  letter: string,
  length: number,
  minFreq: number,
  excludeWords: Set<string>
): Promise<string[]> {
  const pattern = `${letter}${'?'.repeat(length - 1)}`;
  const data = await fetchJsonWithTimeout<DatamuseFreqWordItem[]>(
    `https://api.datamuse.com/words?sp=${encodeURIComponent(pattern)}&md=f,p&max=90`
  );
  if (!Array.isArray(data)) return [];
  return rankDatamuseCandidates(data, excludeWords, minFreq);
}

/**
 * 단어 바로 읽기 화면의 '바로 눌러보는 일상 추천 단어'를 실시간 동적 생성합니다.
 * 하드코딩 단어 목록 없이 Datamuse 고빈도 일상 초급(4~5자) + 중급(6~8자) 단어를
 * 서로 다른 4개 알파벳 버킷에서 골고루 뽑아 섞고, 단일 배치 ko.wiktionary 요청으로 한글 뜻을 붙입니다.
 */
export async function fetchRecommendedDailyWords(
  cursor: number,
  excludeWords: Set<string> = new Set()
): Promise<RecommendedWordChip[]> {
  const safeCursor = Math.abs(Math.floor(cursor));
  const lenLetters = COMMON_START_LETTERS.length;
  const pickLetter = (offset: number) =>
    COMMON_START_LETTERS[(safeCursor * 5 + offset) % lenLetters];

  const begLetterA = pickLetter(0);
  const begLetterB = pickLetter(4);
  const midLetterA = pickLetter(9);
  const midLetterB = pickLetter(14);

  const begLenA = 4 + (safeCursor % 2); // 4 또는 5글자
  const begLenB = 5 - (safeCursor % 2); // 5 또는 4글자
  const midLenA = 6 + (safeCursor % 3); // 6, 7 또는 8글자
  const midLenB = 6 + ((safeCursor + 1) % 3);

  const [begA, begB, midA, midB] = await Promise.all([
    fetchEverydayBucketByLength(begLetterA, begLenA, 25, excludeWords),
    fetchEverydayBucketByLength(begLetterB, begLenB, 25, excludeWords),
    fetchEverydayBucketByLength(midLetterA, midLenA, 15, excludeWords),
    fetchEverydayBucketByLength(midLetterB, midLenB, 15, excludeWords),
  ]);

  const seenPool = new Set<string>();
  const takeUnique = (list: string[], limit: number) => {
    const picked: string[] = [];
    for (const w of list) {
      if (picked.length >= limit) break;
      if (!seenPool.has(w)) {
        seenPool.add(w);
        picked.push(w);
      }
    }
    return picked;
  };

  // 각 알파벳 버킷에서 2개씩 번갈아 뽑아 알파벳 다양성 확보 (총 16 후보 → 뜻이 깔끔한 8개 선별)
  const begPoolA = takeUnique(begA, 4);
  const begPoolB = takeUnique(begB, 4);
  const midPoolA = takeUnique(midA, 4);
  const midPoolB = takeUnique(midB, 4);

  const begPool: string[] = [];
  for (let i = 0; i < 4; i += 1) {
    if (begPoolA[i]) begPool.push(begPoolA[i]);
    if (begPoolB[i]) begPool.push(begPoolB[i]);
  }
  const midPool: string[] = [];
  for (let i = 0; i < 4; i += 1) {
    if (midPoolA[i]) midPool.push(midPoolA[i]);
    if (midPoolB[i]) midPool.push(midPoolB[i]);
  }

  const combinedPool = [...begPool, ...midPool];
  if (combinedPool.length === 0) return [];

  const labelsByWord = await fetchBatchKoWiktionaryLabels(combinedPool);

  const begChips: RecommendedWordChip[] = [];
  for (const word of begPool) {
    if (begChips.length >= 4) break;
    const labelKo = labelsByWord[word];
    if (labelKo) {
      begChips.push({ word, labelKo, level: 'beginner' });
    }
  }

  const midChips: RecommendedWordChip[] = [];
  for (const word of midPool) {
    if (midChips.length >= 4) break;
    const labelKo = labelsByWord[word];
    if (labelKo) {
      midChips.push({ word, labelKo, level: 'intermediate' });
    }
  }

  // 초급·중급이 자연스럽게 번갈아 섞이도록 인터리빙
  const mixed: RecommendedWordChip[] = [];
  const maxLen = Math.max(begChips.length, midChips.length);
  for (let i = 0; i < maxLen; i += 1) {
    if (begChips[i]) mixed.push(begChips[i]);
    if (midChips[i]) mixed.push(midChips[i]);
  }

  return mixed.slice(0, 8);
}

interface SymbolPhonemeCandidate {
  word: string;
  freq: number;
  syllablesCount: number;
  arpaPron: string;
  ipaPron?: string;
}

interface SymbolTieredPool {
  beginner: SymbolPhonemeCandidate[];
  intermediate: SymbolPhonemeCandidate[];
  advanced: SymbolPhonemeCandidate[];
}

const symbolPoolCache = new Map<string, SymbolTieredPool>();
const symbolExamplesResultCache = new Map<string, SymbolExampleWord[]>();

function isCleanLearningWord(word: string, tags: string[]): boolean {
  if (!/^[a-z]{3,12}$/.test(word)) return false;
  if (tags.includes('prop')) return false;
  const hasContentPos = tags.some(
    (t) => t === 'n' || t === 'v' || t === 'adj' || t === 'adv'
  );
  if (!hasContentPos) return false;
  // 단순 복수형(-s) 제외하여 원형 단어 우선 노출
  if (
    word.endsWith('s') &&
    !word.endsWith('ss') &&
    !word.endsWith('us') &&
    !word.endsWith('is')
  ) {
    return false;
  }
  return true;
}

async function loadSymbolTieredPool(
  symbol: IpaSymbol
): Promise<SymbolTieredPool> {
  const cached = symbolPoolCache.get(symbol.id);
  if (cached) return cached;

  const targetSet = new Set(symbol.arpaTargets);
  const responses = await Promise.all(
    symbol.spellingPatterns.map((pattern) =>
      fetchJsonWithTimeout<DatamuseWordItem[]>(
        `https://api.datamuse.com/words?sp=${encodeURIComponent(pattern)}&md=r,f,p,s&ipa=1&max=70`
      )
    )
  );

  const dedup = new Map<string, SymbolPhonemeCandidate>();
  for (const list of responses) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const w = item.word?.toLowerCase().trim() ?? '';
      const tags = item.tags ?? [];
      if (!isCleanLearningWord(w, tags)) continue;

      const pronTag = tags.find((t) => t.startsWith('pron:'));
      if (!pronTag) continue;
      const arpaPron = pronTag.slice(5).trim();
      const phonemes = arpaPron.split(/\s+/);
      if (!phonemes.some((ph) => targetSet.has(ph))) continue;

      const freqTag = tags.find((t) => t.startsWith('f:'));
      const freq = freqTag ? Number.parseFloat(freqTag.slice(2)) : 0;
      if (freq < 2) continue;

      if (!dedup.has(w)) {
        const ipaTag = tags.find((t) => t.startsWith('ipa_pron:'));
        dedup.set(w, {
          word: w,
          freq,
          syllablesCount: item.numSyllables ?? 1,
          arpaPron,
          ipaPron: ipaTag ? ipaTag.slice(9).trim() : undefined,
        });
      }
    }
  }

  const allSorted = [...dedup.values()].sort((a, b) => b.freq - a.freq);
  const reserveCap = Math.max(3, Math.min(8, Math.floor(allSorted.length / 3)));
  const usedBeginner = new Set<string>();
  const usedIntermediate = new Set<string>();

  // 초급(기초): 짧고(3~6자) 1~2음절의 일상 고빈도 단어 우선
  let beginner = allSorted
    .filter((c) => c.word.length <= 6 && c.syllablesCount <= 2 && c.freq >= 15)
    .slice(0, 15);
  if (beginner.length < 6) {
    const extra = allSorted.filter(
      (c) => !beginner.some((b) => b.word === c.word)
    );
    beginner = [...beginner, ...extra].slice(0, Math.max(6, reserveCap));
  }
  for (const c of beginner.slice(0, reserveCap)) usedBeginner.add(c.word);

  // 중급: 5~9자 실생활 핵심 단어
  let intermediate = allSorted
    .filter(
      (c) =>
        !usedBeginner.has(c.word) &&
        c.word.length >= 5 &&
        c.word.length <= 9 &&
        c.freq >= 4
    )
    .slice(0, 15);
  if (intermediate.length < 6) {
    const extra = allSorted.filter(
      (c) =>
        !usedBeginner.has(c.word) &&
        !intermediate.some((m) => m.word === c.word)
    );
    intermediate = [...intermediate, ...extra].slice(0, Math.max(6, reserveCap));
  }
  for (const c of intermediate.slice(0, reserveCap)) usedIntermediate.add(c.word);

  // 고급: 7자 이상 또는 3음절 이상 심화 단어 (부족 시 가장 긴 단어부터 보충)
  let advanced = allSorted
    .filter(
      (c) =>
        !usedBeginner.has(c.word) &&
        !usedIntermediate.has(c.word) &&
        (c.word.length >= 7 || c.syllablesCount >= 3)
    )
    .slice(0, 15);
  if (advanced.length < 6) {
    const extra = allSorted
      .filter(
        (c) =>
          !usedBeginner.has(c.word) &&
          !usedIntermediate.has(c.word) &&
          !advanced.some((a) => a.word === c.word)
      )
      .sort((a, b) => b.word.length - a.word.length || b.freq - a.freq);
    advanced = [...advanced, ...extra].slice(0, 12);
  }
  if (advanced.length < 3) {
    const longestFallback = [...allSorted]
      .filter((c) => !advanced.some((a) => a.word === c.word))
      .sort((a, b) => b.word.length - a.word.length || a.freq - b.freq);
    advanced = [...advanced, ...longestFallback].slice(0, 6);
  }

  const pool: SymbolTieredPool = { beginner, intermediate, advanced };
  if (allSorted.length > 0) {
    symbolPoolCache.set(symbol.id, pool);
  }
  return pool;
}

function buildDynamicSymbolExample(
  symbol: IpaSymbol,
  candidate: SymbolPhonemeCandidate,
  meaningKo: string
): SymbolExampleWord {
  // Datamuse 원시 ipa_pron(ɫ/약모음 ʌ 표기) 대신 표준 미국식 IPA를 ARPAbet에서 직접 생성
  const phonetics = buildPhoneticsFromArpa(candidate.word, candidate.arpaPron);

  const syllables = phonetics.syllables;
  const joinedSyllables = syllables.map((s) => s.text).join('').toLowerCase();
  const isSplitValid =
    syllables.length >= 2 && joinedSyllables === candidate.word.toLowerCase();

  let segments: ExampleWordSegment[];
  let isSyllableSplit = false;
  let emphasisTipKo: string;

  if (isSplitValid) {
    isSyllableSplit = true;
    segments = syllables.map((syl) => ({
      text: syl.text,
      role:
        syl.stress === 'primary'
          ? 'stress'
          : syl.isSchwa
            ? 'weak'
            : 'normal',
    }));

    // 최소 1개 강세 보장
    if (!segments.some((s) => s.role === 'stress') && segments.length > 0) {
      segments[0] = { ...segments[0], role: 'stress' };
    }

    const stressedSyl =
      syllables.find((s) => s.stress === 'primary') ?? syllables[0];
    const weakSyl = syllables.find((s) => s.isSchwa);

    if (symbol.id === 'sym_schwa' && weakSyl) {
      emphasisTipKo = `강세 '${stressedSyl.koHint}(${stressedSyl.text})'를 세게! '${weakSyl.text}'는 힘 빼고 약하게 '${weakSyl.koHint}'`;
    } else {
      emphasisTipKo = `강세 '${stressedSyl.koHint}(${stressedSyl.text})' 부분을 크고 또렷하게! (${phonetics.koPronunciation})`;
    }
  } else {
    segments = [{ text: candidate.word, role: 'stress' }];
    emphasisTipKo = `'${phonetics.koPronunciation}' — ${symbol.koHint} 느낌을 살려 또렷하게!`;
  }

  return {
    word: candidate.word,
    meaningKo,
    ipa: phonetics.ipa,
    segments,
    isSyllableSplit,
    emphasisTipKo,
  };
}

/**
 * 발음기호 상세 시트의 초급(기초) / 중급 / 고급 대표 단어 3개를
 * 하드코딩 없이 Datamuse(CMUdict 음소 검증) + Wiktionary(한국어 뜻 배치 조회)로 실시간 동적 생성합니다.
 */
export async function fetchSymbolExamplesByLevel(
  symbol: IpaSymbol,
  level: ExampleDifficultyLevel,
  refreshSeed = 0
): Promise<SymbolExampleWord[]> {
  const safeSeed = Math.max(0, Math.floor(refreshSeed));
  const cacheKey = `${symbol.id}:${level}:${safeSeed}`;
  const cached = symbolExamplesResultCache.get(cacheKey);
  if (cached && cached.length > 0) {
    return cached;
  }

  const pool = await loadSymbolTieredPool(symbol);
  const bucket = pool[level];
  if (!bucket || bucket.length === 0) return [];

  // refreshSeed에 따라 버킷을 순환시켜 '다른 단어' 버튼 시 새로운 3단어 제공
  const offset = (safeSeed * 3) % bucket.length;
  const rotated = [...bucket.slice(offset), ...bucket.slice(0, offset)];
  const windowCandidates = rotated.slice(0, 10);

  const labelsByWord = await fetchBatchKoWiktionaryLabels(
    windowCandidates.map((c) => c.word)
  );

  const chosen: { candidate: SymbolPhonemeCandidate; meaningKo: string }[] = [];
  const missingMeaning: SymbolPhonemeCandidate[] = [];

  for (const candidate of windowCandidates) {
    if (chosen.length >= 3) break;
    const label = labelsByWord[candidate.word];
    if (label) {
      chosen.push({ candidate, meaningKo: label });
    } else {
      missingMeaning.push(candidate);
    }
  }

  // Wiktionary에서 3개를 다 못 채웠으면 번역 API로 보강
  if (chosen.length < 3 && missingMeaning.length > 0) {
    const needed = missingMeaning.slice(0, 3 - chosen.length);
    const fallbackResults = await Promise.all(
      needed.map(async (candidate) => {
        const translated = await translateText(candidate.word, 'en|ko');
        const cleaned =
          translated && containsKorean(translated)
            ? translated.replace(/[.!?]+$/, '').trim()
            : '일상 영단어';
        return { candidate, meaningKo: cleaned };
      })
    );
    chosen.push(...fallbackResults);
  }

  const built = chosen
    .slice(0, 3)
    .map(({ candidate, meaningKo }) =>
      buildDynamicSymbolExample(symbol, candidate, meaningKo)
    );

  if (built.length > 0) {
    symbolExamplesResultCache.set(cacheKey, built);
  }
  return built;
}

