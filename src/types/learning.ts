export type StressLevel = 'primary' | 'secondary' | 'none';

export interface SyllableItem {
  text: string;
  ipa: string;
  stress: StressLevel;
  isSchwa?: boolean;
  koHint: string;
}

export interface WordExample {
  en: string;
  ko?: string;
}

export interface CoreWord {
  id: string;
  word: string;
  meaningKo: string;
  ipa: string;
  syllables: SyllableItem[];
  koPronunciation: string;
  symbolIds: string[];
  audioUrl?: string;
  audioAsset?: string;
  partOfSpeech?: string;
  exampleEn?: string;
  examples?: WordExample[];
  sourceAttribution?: string;
}

export type IpaCategoryId =
  | 'basic_vowels'
  | 'diphthongs'
  | 'key_consonants'
  | 'basic_consonants';

export type ExampleSegmentRole = 'stress' | 'weak' | 'normal';

export interface ExampleWordSegment {
  text: string;
  role: ExampleSegmentRole;
}

export type ExampleDifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface SymbolExampleWord {
  word: string;
  meaningKo: string;
  ipa: string;
  wordId?: string;
  segments?: ExampleWordSegment[];
  isSyllableSplit?: boolean;
  emphasisTipKo?: string;
}

export interface IpaSymbol {
  id: string;
  categoryId: IpaCategoryId;
  /** 왕초보 핵심 18개 기호 여부 */
  isCore: boolean;
  ipa: string;
  titleKo: string;
  mouthGuideKo: string;
  koHint: string;
  /** CMUdict ARPAbet 대상 음소 목록 (실시간 동적 단어 검색 필터) */
  arpaTargets: string[];
  /** Datamuse 철자 와일드카드 패턴 (하드코딩 단어 없이 동적 발굴) */
  spellingPatterns: string[];
}

export interface IpaCategoryMeta {
  id: IpaCategoryId;
  titleKo: string;
  subtitleKo: string;
  subtitleCoreKo?: string;
}
