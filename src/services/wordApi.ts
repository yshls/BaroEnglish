import type { CoreWord } from '../types/learning';
import {
  buildFallbackPhonetics,
  buildPhoneticsFromArpa,
} from './phoneticsParser';

const REQUEST_TIMEOUT_MS = 5500;
const USER_AGENT = 'BaroEnglish/1.0 (Senior English Learning App)';

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

async function fetchJsonWithTimeout<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
      signal: controller.signal,
    });
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
  exampleEn?: string;
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

  let exampleEn: string | undefined;
  for (const m of entry.meanings ?? []) {
    for (const def of m.definitions ?? []) {
      if (def.example && def.example.length <= 90) {
        exampleEn = def.example;
        break;
      }
    }
    if (exampleEn) break;
  }

  return {
    ipa: usIpa,
    audioUrl,
    partOfSpeech,
    exampleEn,
  };
}

interface FreeDictionaryTranslation {
  language?: { code?: string };
  word?: string;
  tags?: string[];
}

interface FreeDictionarySense {
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

function collectKoreanTranslations(
  senses: FreeDictionarySense[] | undefined,
  bucket: string[]
) {
  if (!Array.isArray(senses)) return;
  for (const sense of senses) {
    for (const tr of sense.translations ?? []) {
      if (tr.language?.code !== 'ko' || !tr.word || !containsKorean(tr.word)) {
        continue;
      }
      const tags = (tr.tags ?? []).join(' ').toLowerCase();
      if (/north korea|china|yanbian|archaic|obsolete|dialect|dated|slang/.test(tags)) {
        continue;
      }
      const cleaned = tr.word.trim();
      if (cleaned && !bucket.includes(cleaned)) {
        bucket.push(cleaned);
      }
    }
    if (sense.subsenses) {
      collectKoreanTranslations(sense.subsenses, bucket);
    }
  }
}

async function fetchFreeDictionaryKorean(word: string): Promise<{
  meaningKo?: string;
  usIpa?: string;
  partOfSpeech?: string;
} | null> {
  const data = await fetchJsonWithTimeout<FreeDictionaryV1Response>(
    `https://freedictionaryapi.com/api/v1/entries/en/${encodeURIComponent(word)}?translations=true`
  );
  if (!data?.entries || data.entries.length === 0) return null;

  const koWords: string[] = [];
  let usIpa: string | undefined;
  let partOfSpeech: string | undefined;

  for (const entry of data.entries) {
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

    collectKoreanTranslations(entry.senses, koWords);
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

async function fetchKoWiktionaryMeaning(word: string): Promise<string | undefined> {
  const data = await fetchJsonWithTimeout<KoWiktionaryResponse>(
    `https://ko.wiktionary.org/w/api.php?action=query&titles=${encodeURIComponent(
      word
    )}&prop=extracts&explaintext=1&exchars=500&format=json&origin=*`
  );
  const pages = data?.query?.pages;
  if (!pages) return undefined;

  const firstPage = Object.values(pages)[0];
  const extract = firstPage?.extract;
  if (!extract) return undefined;

  // "== 영어 ==" 섹션만 추출
  const enSectionMatch = /==\s*영어\s*==([\s\S]*?)(?:\n==[^=]|$)/.exec(extract);
  if (!enSectionMatch) return undefined;

  const lines = enSectionMatch[1]
    .split('\n')
    .map((l) => l.trim())
    .filter(
      (l) =>
        l.length > 0 &&
        !l.startsWith('=') &&
        !/^(IPA|발음|어원|참조|유의어|반의어|관용구|파생어)/i.test(l) &&
        containsKorean(l)
    );

  if (lines.length === 0) return undefined;

  // 괄호 분류 "(과일) 바나나." 등에서 깔끔한 첫 뜻 추출
  const cleaned = lines[0]
    .replace(/^\([^)]+\)\s*/, '')
    .replace(/\.\s*.*$/, '')
    .replace(/,\s*.*$/, '')
    .trim();

  if (cleaned.length >= 1 && cleaned.length <= 24) {
    return cleaned;
  }
  return undefined;
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

async function translateViaMyMemory(
  text: string,
  pair: 'en|ko' | 'ko|en'
): Promise<string | undefined> {
  const data = await fetchJsonWithTimeout<MyMemoryResponse>(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${pair}`
  );
  const translated = data?.responseData?.translatedText?.trim();
  if (!translated || translated.toLowerCase() === text.toLowerCase()) {
    return undefined;
  }
  return translated;
}

/**
 * 한글 검색어 -> 영단어 변환 (예: "딸기" -> "strawberry", "병원" -> "hospital")
 */
export async function resolveKoreanQueryToEnglish(
  koreanQuery: string
): Promise<string | null> {
  const translated = await translateViaMyMemory(koreanQuery.trim(), 'ko|en');
  if (!translated) return null;

  // "the hospital" / "a strawberry" 등 관사 제거 후 핵심 영단어 추출
  const cleaned = translated
    .toLowerCase()
    .replace(/^(a|an|the|to)\s+/i, '')
    .split(/[\s,/.;!?]+/)[0];

  const word = sanitizeEnglishWord(cleaned);
  return word.length >= 2 ? word : null;
}

/**
 * 상업용 무료 멀티 API 통합 단어 조회:
 * 1) 한글 입력 시 MyMemory(ko->en)로 영단어 매칭
 * 2) dictionaryapi.dev (원어민 MP3 + IPA + 예문)
 *    + Datamuse (CMUdict 강세/음절)
 *    + freedictionaryapi.com (Wiktionary 한글 뜻 + 미국식 IPA) 병렬 호출
 * 3) 한글 뜻 보강 폴백: ko.wiktionary.org -> MyMemory(en->ko)
 */
export async function lookupWordFromApis(rawQuery: string): Promise<LookupResult> {
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

  const [dictDev, datamuse, freeDictKo] = await Promise.all([
    fetchDictionaryDev(englishWord),
    fetchDatamusePhonetics(englishWord),
    fetchFreeDictionaryKorean(englishWord),
  ]);

  // 세 API 모두 응답이 없으면 네트워크/미등록 처리 + Datamuse 유사 단어 추천
  if (!dictDev && !datamuse && !freeDictKo) {
    const suggestions = await fetchWordSuggestions(englishWord, 5);
    return {
      word: null,
      resolvedEnglishQuery: englishWord,
      suggestions,
      errorType: suggestions.length > 0 ? 'not_found' : 'network',
    };
  }

  // 한글 뜻 확보 파이프라인: FreeDictionaryAPI -> ko.wiktionary -> MyMemory -> 사용자가 입력한 한글
  let meaningKo = freeDictKo?.meaningKo;
  const looksDerivedColor = Boolean(meaningKo && /^[^·]+색$/.test(meaningKo));

  if (!meaningKo || looksDerivedColor) {
    const wikiKo = await fetchKoWiktionaryMeaning(englishWord);
    if (wikiKo) {
      meaningKo = wikiKo;
    }
  }
  if (!meaningKo || /^[^·]+색$/.test(meaningKo)) {
    const translated = await translateViaMyMemory(englishWord, 'en|ko');
    if (translated && containsKorean(translated)) {
      meaningKo = translated.replace(/[.!?]+$/, '').trim();
    }
  }
  if (!meaningKo && originalKoreanHint) {
    meaningKo = originalKoreanHint;
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
    exampleEn: dictDev?.exampleEn,
    sourceAttribution: 'Wiktionary (CC BY-SA 4.0) · CMUdict / Datamuse',
  };

  return {
    word: builtWord,
    resolvedEnglishQuery: englishWord,
    suggestions: [],
  };
}
