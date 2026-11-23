export type StressLevel = 'primary' | 'secondary' | 'none';

export interface SyllableItem {
  text: string;
  ipa: string;
  stress: StressLevel;
  isSchwa?: boolean;
  koHint: string;
}

export interface CoreWord {
  id: string;
  word: string;
  meaningKo: string;
  ipa: string;
  syllables: SyllableItem[];
  koPronunciation: string;
  symbolIds: string[];
  audioAsset?: string;
}

export type IpaCategoryId = 'basic_vowels' | 'diphthongs' | 'key_consonants';

export interface SymbolExampleWord {
  word: string;
  meaningKo: string;
  ipa: string;
  wordId?: string;
}

export interface IpaSymbol {
  id: string;
  categoryId: IpaCategoryId;
  ipa: string;
  titleKo: string;
  mouthGuideKo: string;
  koHint: string;
  examples: SymbolExampleWord[];
}

export interface IpaCategoryMeta {
  id: IpaCategoryId;
  titleKo: string;
  subtitleKo: string;
}
