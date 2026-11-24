import { IPA_SYMBOL_CATALOG } from './ipaCatalog';
import type { IpaCategoryMeta, IpaSymbol } from '../types/learning';

export const IPA_CATEGORIES: IpaCategoryMeta[] = [
  {
    id: 'basic_vowels',
    titleKo: '기본 모음',
    subtitleCoreKo: '짧게 또는 길게 내는 왕초보 핵심 모음 7개',
    subtitleKo: '영어 모음 전체 11개 (핵심 7개 + 확장 4개)',
  },
  {
    id: 'diphthongs',
    titleKo: '합쳐진 모음',
    subtitleCoreKo: '두 소리가 부드럽게 이어지는 이중모음 5개',
    subtitleKo: '두 소리가 부드럽게 이어지는 이중모음 5개',
  },
  {
    id: 'key_consonants',
    titleKo: '입술·혀 모양 자음',
    subtitleCoreKo: '한국어에 없어 헷갈리는 핵심 자음 6개',
    subtitleKo: '입술·혀·목청 조절이 중요한 자음 14개 (핵심 6개 + 확장 8개)',
  },
  {
    id: 'basic_consonants',
    titleKo: '기본 자음',
    subtitleKo: '알파벳과 비슷하지만 영어식으로 깔끔하게 내는 기본 자음 10개',
  },
];

export const IPA_SYMBOLS: IpaSymbol[] = IPA_SYMBOL_CATALOG;

export const CORE_IPA_SYMBOLS: IpaSymbol[] = IPA_SYMBOLS.filter(
  (symbol) => symbol.isCore
);

export const IPA_SYMBOL_BY_ID: Record<string, IpaSymbol> = Object.fromEntries(
  IPA_SYMBOLS.map((symbol) => [symbol.id, symbol])
);

export function getSymbolsByCategory(
  categoryId: IpaCategoryMeta['id'],
  coreOnly = false
): IpaSymbol[] {
  return IPA_SYMBOLS.filter(
    (symbol) =>
      symbol.categoryId === categoryId && (!coreOnly || symbol.isCore)
  );
}
