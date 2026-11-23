import ipaSymbolsRaw from './ipaSymbols.json';
import type { IpaCategoryMeta, IpaSymbol } from '../types/learning';

export const IPA_CATEGORIES: IpaCategoryMeta[] = [
  {
    id: 'basic_vowels',
    titleKo: '기본 모음',
    subtitleKo: '짧게 또는 길게 내는 핵심 모음 7개',
  },
  {
    id: 'diphthongs',
    titleKo: '합쳐진 모음',
    subtitleKo: '두 소리가 부드럽게 이어지는 이중모음 5개',
  },
  {
    id: 'key_consonants',
    titleKo: '입술·혀 모양 자음',
    subtitleKo: '한국어에 없어 헷갈리는 핵심 자음 6개',
  },
];

export const IPA_SYMBOLS: IpaSymbol[] = ipaSymbolsRaw as IpaSymbol[];

export const IPA_SYMBOL_BY_ID: Record<string, IpaSymbol> = Object.fromEntries(
  IPA_SYMBOLS.map((symbol) => [symbol.id, symbol])
);

export function getSymbolsByCategory(categoryId: IpaCategoryMeta['id']): IpaSymbol[] {
  return IPA_SYMBOLS.filter((symbol) => symbol.categoryId === categoryId);
}
