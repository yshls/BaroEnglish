import type { StressLevel, SyllableItem } from '../types/learning';

const VOWEL_BASES = new Set([
  'AA',
  'AE',
  'AH',
  'AO',
  'AW',
  'AY',
  'EH',
  'ER',
  'EY',
  'IH',
  'IY',
  'OW',
  'OY',
  'UH',
  'UW',
]);

const VALID_2_ONSETS = new Set([
  'BL', 'BR', 'CH', 'CL', 'CR', 'DR', 'DW', 'FL', 'FR', 'GL', 'GR', 'GW',
  'KL', 'KR', 'KW', 'PL', 'PR', 'SH', 'SK', 'SL', 'SM', 'SN', 'SP', 'ST',
  'SW', 'TH', 'TR', 'TW', 'VR', 'BY', 'FY', 'HY', 'KY', 'MY', 'PY', 'VY',
]);

const VALID_3_ONSETS = new Set(['SKR', 'SKW', 'SPL', 'SPR', 'STR']);

const ARPA_TO_IPA: Record<string, string> = {
  AA: 'ɑː',
  AE: 'æ',
  AH: 'ʌ',
  AO: 'ɔː',
  AW: 'aʊ',
  AY: 'aɪ',
  EH: 'e',
  ER: 'ɜːr',
  EY: 'eɪ',
  IH: 'ɪ',
  IY: 'iː',
  OW: 'oʊ',
  OY: 'ɔɪ',
  UH: 'ʊ',
  UW: 'uː',
  B: 'b',
  CH: 'tʃ',
  D: 'd',
  DH: 'ð',
  F: 'f',
  G: 'ɡ',
  HH: 'h',
  JH: 'dʒ',
  K: 'k',
  L: 'l',
  M: 'm',
  N: 'n',
  NG: 'ŋ',
  P: 'p',
  R: 'r',
  S: 's',
  SH: 'ʃ',
  T: 't',
  TH: 'θ',
  V: 'v',
  W: 'w',
  Y: 'j',
  Z: 'z',
  ZH: 'ʒ',
};

// Tab 1 핵심 18개 발음기호 ID 매핑
const ARPA_TO_SYMBOL_ID: Record<string, string> = {
  AE: 'sym_ae',
  IH: 'sym_ih',
  IY: 'sym_iy',
  AA: 'sym_aa',
  UW: 'sym_uw',
  EY: 'sym_ey',
  AY: 'sym_ay',
  OW: 'sym_ow',
  AW: 'sym_aw',
  OY: 'sym_oy',
  TH: 'sym_th_voiceless',
  DH: 'sym_th_voiced',
  F: 'sym_f',
  V: 'sym_v',
  R: 'sym_r',
  L: 'sym_l',
};

// 한글 음절 조합 상수
const CHO_INDEX: Record<string, number> = {
  G: 0,   // ㄱ
  N: 2,   // ㄴ
  D: 3,   // ㄷ
  DH: 3,  // ㄷ
  R: 5,   // ㄹ
  L: 5,   // ㄹ
  M: 6,   // ㅁ
  B: 7,   // ㅂ
  V: 7,   // ㅂ
  S: 9,   // ㅅ
  SH: 9,  // ㅅ
  TH: 10, // ㅆ
  '': 11, // ㅇ
  W: 11,  // ㅇ (모음과 결합)
  Y: 11,  // ㅇ (모음과 결합)
  Z: 12,  // ㅈ
  JH: 12, // ㅈ
  ZH: 12, // ㅈ
  CH: 14, // ㅊ
  K: 15,  // ㅋ
  T: 16,  // ㅌ
  P: 17,  // ㅍ
  F: 17,  // ㅍ
  HH: 18, // ㅎ
};

// 중성 인덱스: ㅏ=0, ㅐ=1, ㅓ=4, ㅔ=5, ㅕ=6, ㅗ=8, ㅘ=9, ㅙ=10, ㅛ=12, ㅜ=13, ㅝ=14, ㅞ=15, ㅟ=16, ㅠ=17, ㅡ=18, ㅣ=20
const VOWEL_KO: Record<string, { jung: number; tail?: string }> = {
  AA: { jung: 0 },             // 아
  AE: { jung: 1 },             // 애
  AH: { jung: 4 },             // 어
  AO: { jung: 8 },             // 오
  EH: { jung: 5 },             // 에
  ER: { jung: 4, tail: '르' },  // 어르
  IH: { jung: 20 },            // 이
  IY: { jung: 20 },            // 이
  UH: { jung: 13 },            // 우
  UW: { jung: 13 },            // 우
  EY: { jung: 5, tail: '이' },  // 에이
  AY: { jung: 0, tail: '이' },  // 아이
  OW: { jung: 8, tail: '우' },  // 오우
  AW: { jung: 0, tail: '우' },  // 아우
  OY: { jung: 8, tail: '이' },  // 오이
};

const W_VOWEL_JUNG: Partial<Record<string, number>> = {
  AA: 9,  // 와
  AO: 14, // 워
  AH: 14, // 워
  AE: 10, // 왜
  EH: 15, // 웨
  EY: 15, // 웨이
  IH: 16, // 위
  IY: 16, // 위
};

const Y_VOWEL_JUNG: Partial<Record<string, number>> = {
  UW: 17, // 유
  UH: 17, // 유
  AH: 6,  // 여
  ER: 6,  // 여르
  OW: 12, // 요우
  AO: 12, // 요
  AA: 2,  // 야
};

const JONG_INDEX: Record<string, number> = {
  '': 0,
  G: 1,
  K: 1,
  N: 4,
  L: 8,
  M: 16,
  B: 17,
  P: 17,
  T: 19, // ㅅ 받침 (cat -> 캣, sit -> 싯)
  NG: 21,
};

const EPENTHETIC_CONSONANT: Record<string, string> = {
  B: '브',
  CH: '치',
  D: '드',
  DH: '드',
  F: '프',
  G: '그',
  HH: '흐',
  JH: '지',
  K: '크',
  L: '을',
  M: '므',
  N: '느',
  NG: '응',
  P: '프',
  R: '르',
  S: '스',
  SH: '시',
  T: '트',
  TH: '쓰',
  V: '브',
  W: '우',
  Y: '이',
  Z: '즈',
  ZH: '지',
};

function composeHangul(cho: number, jung: number, jong = 0): string {
  return String.fromCharCode(0xac00 + cho * 21 * 28 + jung * 28 + jong);
}

interface ParsedPhoneme {
  raw: string;
  base: string;
  stress: StressLevel | null; // null이면 자음
  isSchwa: boolean;
}

function parseArpaTokens(arpaPron: string): ParsedPhoneme[] {
  return arpaPron
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => {
      const match = /^([A-Z]+)([012])?$/.exec(raw.toUpperCase());
      if (!match) {
        return { raw, base: raw.toUpperCase(), stress: null, isSchwa: false };
      }
      const base = match[1];
      const digit = match[2];
      if (!VOWEL_BASES.has(base)) {
        return { raw, base, stress: null, isSchwa: false };
      }
      const stress: StressLevel =
        digit === '1' ? 'primary' : digit === '2' ? 'secondary' : 'none';
      const isSchwa = (base === 'AH' || base === 'ER') && digit === '0';
      return { raw, base, stress, isSchwa };
    });
}

function splitConsonantCluster(consonants: ParsedPhoneme[]): {
  coda: ParsedPhoneme[];
  onset: ParsedPhoneme[];
} {
  if (consonants.length === 0) return { coda: [], onset: [] };
  if (consonants.length === 1) return { coda: [], onset: consonants };

  if (consonants.length >= 3) {
    const last3 = consonants
      .slice(-3)
      .map((c) => c.base)
      .join('');
    if (VALID_3_ONSETS.has(last3)) {
      return {
        coda: consonants.slice(0, -3),
        onset: consonants.slice(-3),
      };
    }
  }

  const last2 = consonants
    .slice(-2)
    .map((c) => c.base)
    .join('');
  if (VALID_2_ONSETS.has(last2)) {
    return {
      coda: consonants.slice(0, -2),
      onset: consonants.slice(-2),
    };
  }

  return {
    coda: consonants.slice(0, -1),
    onset: consonants.slice(-1),
  };
}

interface RawSyllableGroup {
  onset: ParsedPhoneme[];
  nucleus: ParsedPhoneme;
  coda: ParsedPhoneme[];
}

function groupIntoSyllables(phonemes: ParsedPhoneme[]): RawSyllableGroup[] {
  const vowelIndices: number[] = [];
  phonemes.forEach((p, idx) => {
    if (p.stress !== null) vowelIndices.push(idx);
  });

  if (vowelIndices.length === 0) return [];

  const groups: RawSyllableGroup[] = vowelIndices.map((vIdx) => ({
    onset: [],
    nucleus: phonemes[vIdx],
    coda: [],
  }));

  // 첫 모음 앞 자음은 첫 음절 onset
  groups[0].onset = phonemes.slice(0, vowelIndices[0]);

  // 두 모음 사이 자음은 Maximal Onset 원칙으로 분배
  for (let i = 0; i < vowelIndices.length - 1; i++) {
    const between = phonemes.slice(vowelIndices[i] + 1, vowelIndices[i + 1]);
    const { coda, onset } = splitConsonantCluster(between);
    groups[i].coda = coda;
    groups[i + 1].onset = onset;
  }

  // 마지막 모음 뒤 자음은 마지막 음절 coda
  groups[groups.length - 1].coda = phonemes.slice(
    vowelIndices[vowelIndices.length - 1] + 1
  );

  return groups;
}

function phonemeToIpa(p: ParsedPhoneme): string {
  if (p.isSchwa) {
    return p.base === 'ER' ? 'ər' : 'ə';
  }
  return ARPA_TO_IPA[p.base] ?? p.base.toLowerCase();
}

function syllableToKoHint(group: RawSyllableGroup): string {
  const { onset, nucleus, coda } = group;
  let prefix = '';
  let mainOnset = '';
  let glide: 'W' | 'Y' | null = null;

  if (onset.length > 0) {
    const last = onset[onset.length - 1].base;
    if ((last === 'W' || last === 'Y') && onset.length >= 2) {
      glide = last;
      mainOnset = onset[onset.length - 2].base;
      for (let i = 0; i < onset.length - 2; i++) {
        prefix += EPENTHETIC_CONSONANT[onset[i].base] ?? '';
      }
    } else if (last === 'W' || last === 'Y') {
      glide = last;
      mainOnset = '';
    } else {
      mainOnset = last;
      for (let i = 0; i < onset.length - 1; i++) {
        prefix += EPENTHETIC_CONSONANT[onset[i].base] ?? '';
      }
    }
  }

  const vowelSpec = VOWEL_KO[nucleus.base] ?? { jung: 4 };
  let jung = vowelSpec.jung;
  let tail = vowelSpec.tail ?? '';

  if (glide === 'W' && W_VOWEL_JUNG[nucleus.base] !== undefined) {
    jung = W_VOWEL_JUNG[nucleus.base]!;
  } else if (glide === 'Y' && Y_VOWEL_JUNG[nucleus.base] !== undefined) {
    jung = Y_VOWEL_JUNG[nucleus.base]!;
  } else if (glide === 'W') {
    prefix += '우';
  } else if (glide === 'Y') {
    prefix += '이';
  }

  // SH + non-i vowel -> '셔/샤/슈' 느낌 보정
  if (mainOnset === 'SH' && nucleus.base === 'AH') {
    jung = 6; // 셔
  }

  const cho = CHO_INDEX[mainOnset] ?? 11;

  // Coda 처리: 단모음 + 받침 가능 자음이면 자연스럽게 받침 결합, 아니면 뒤 소리 붙임
  let mainJong = 0;
  let codaSuffix = '';

  if (coda.length > 0) {
    const firstCoda = coda[0].base;
    const attachable = new Set(['M', 'N', 'NG', 'L']);
    const softStopAttachable = new Set(['T', 'K', 'P', 'B', 'G']);

    if (!tail && attachable.has(firstCoda)) {
      mainJong = JONG_INDEX[firstCoda] ?? 0;
      for (let i = 1; i < coda.length; i++) {
        codaSuffix += EPENTHETIC_CONSONANT[coda[i].base] ?? '';
      }
    } else if (!tail && coda.length === 1 && softStopAttachable.has(firstCoda)) {
      mainJong = JONG_INDEX[firstCoda] ?? 0;
    } else {
      for (const c of coda) {
        codaSuffix += EPENTHETIC_CONSONANT[c.base] ?? '';
      }
    }
  }

  const coreChar = composeHangul(cho, jung, mainJong);
  return `${prefix}${coreChar}${tail}${codaSuffix}`;
}

/**
 * 영단어 철자를 음절 수에 맞춰 자연스럽게 분리
 * (예: "banana", 3 -> ["ba", "na", "na"], "hospital", 3 -> ["hos", "pi", "tal"])
 */
export function splitWordSpelling(word: string, syllableCount: number): string[] {
  const clean = word.trim();
  if (syllableCount <= 1 || clean.length <= 2) {
    return [clean];
  }

  const lower = clean.toLowerCase();
  const vowelGroups: { start: number; end: number }[] = [];
  const vowelRegex = /[aeiouy]+/g;
  let m: RegExpExecArray | null;
  while ((m = vowelRegex.exec(lower)) !== null) {
    vowelGroups.push({ start: m.index, end: m.index + m[0].length });
  }

  // 끝의 묵음 e 제거 (예: make, time, cake)
  if (
    vowelGroups.length > syllableCount &&
    lower.endsWith('e') &&
    !lower.endsWith('le') &&
    vowelGroups[vowelGroups.length - 1].start === lower.length - 1
  ) {
    vowelGroups.pop();
  }

  if (vowelGroups.length === syllableCount) {
    const cuts: number[] = [];
    for (let i = 0; i < vowelGroups.length - 1; i++) {
      const gapStart = vowelGroups[i].end;
      const gapEnd = vowelGroups[i + 1].start;
      const gapLen = gapEnd - gapStart;

      if (gapLen <= 1) {
        cuts.push(gapStart);
      } else {
        const pair = lower.slice(gapEnd - 2, gapEnd);
        const keepTogether = new Set([
          'th', 'sh', 'ch', 'ph', 'wh', 'tr', 'dr', 'pr', 'br', 'cr', 'gr', 'fr',
          'pl', 'bl', 'cl', 'gl', 'fl', 'st', 'sp', 'sk',
        ]);
        if (keepTogether.has(pair) && gapLen === 2) {
          cuts.push(gapStart);
        } else {
          cuts.push(gapStart + Math.floor(gapLen / 2));
        }
      }
    }

    const parts: string[] = [];
    let prev = 0;
    for (const cut of cuts) {
      parts.push(clean.slice(prev, cut));
      prev = cut;
    }
    parts.push(clean.slice(prev));
    if (parts.every((p) => p.length > 0)) {
      return parts;
    }
  }

  // 폴백: 균등 분할
  const parts: string[] = [];
  for (let i = 0; i < syllableCount; i++) {
    const start = Math.round((i * clean.length) / syllableCount);
    const end = Math.round(((i + 1) * clean.length) / syllableCount);
    parts.push(clean.slice(start, end) || clean[Math.min(start, clean.length - 1)]);
  }
  return parts;
}

/**
 * Tab 1 18개 발음기호 ID 추출 (역추적 바텀시트용)
 */
export function extractSymbolIdsFromArpa(arpaPron: string): string[] {
  const phonemes = parseArpaTokens(arpaPron);
  const seen = new Set<string>();
  const result: string[] = [];

  const push = (id: string) => {
    if (!seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  };

  for (const p of phonemes) {
    if (p.isSchwa) {
      push('sym_schwa');
      if (p.base === 'ER') push('sym_r');
      continue;
    }
    if (p.base === 'AH' && p.stress !== null) {
      push('sym_uh');
      continue;
    }
    if (p.base === 'ER') {
      push('sym_r');
      continue;
    }
    const mapped = ARPA_TO_SYMBOL_ID[p.base];
    if (mapped) push(mapped);
  }

  return result;
}

/**
 * IPA 문자열만으로 18개 기호 ID 추출 (CMUdict 음소 누락 시 폴백)
 */
export function extractSymbolIdsFromIpa(ipa: string): string[] {
  const rules: [RegExp, string][] = [
    [/eɪ/, 'sym_ey'],
    [/aɪ/, 'sym_ay'],
    [/oʊ|əʊ/, 'sym_ow'],
    [/aʊ/, 'sym_aw'],
    [/ɔɪ/, 'sym_oy'],
    [/iː|i(?![a-z])/, 'sym_iy'],
    [/uː|u/, 'sym_uw'],
    [/ɑː|ɑ/, 'sym_aa'],
    [/æ/, 'sym_ae'],
    [/ɪ/, 'sym_ih'],
    [/ʌ/, 'sym_uh'],
    [/ə|ɚ/, 'sym_schwa'],
    [/θ/, 'sym_th_voiceless'],
    [/ð/, 'sym_th_voiced'],
    [/f/, 'sym_f'],
    [/v/, 'sym_v'],
    [/r|ɹ|ɚ/, 'sym_r'],
    [/l/, 'sym_l'],
  ];

  const seen = new Set<string>();
  const ids: string[] = [];
  for (const [regex, id] of rules) {
    if (regex.test(ipa) && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

export interface BuiltPhonetics {
  ipa: string;
  syllables: SyllableItem[];
  koPronunciation: string;
  symbolIds: string[];
}

/**
 * CMUdict ARPAbet 음소 문자열로부터 고품질 강세 리듬 블록 + IPA + 한글 발음 힌트 + 기호 ID 생성
 */
export function buildPhoneticsFromArpa(
  word: string,
  arpaPron: string,
  preferredIpa?: string
): BuiltPhonetics {
  const phonemes = parseArpaTokens(arpaPron);
  const groups = groupIntoSyllables(phonemes);

  if (groups.length === 0) {
    return buildFallbackPhonetics(word, preferredIpa);
  }

  const spellingParts = splitWordSpelling(word, groups.length);

  const syllables: SyllableItem[] = groups.map((group, idx) => {
    const ipaText = [...group.onset, group.nucleus, ...group.coda]
      .map(phonemeToIpa)
      .join('');

    return {
      text: spellingParts[idx] ?? word,
      ipa: ipaText,
      stress: group.nucleus.stress ?? 'none',
      ...(group.nucleus.isSchwa ? { isSchwa: true } : {}),
      koHint: syllableToKoHint(group),
    };
  });

  // 최소 1개 primary 강세 보장
  if (!syllables.some((s) => s.stress === 'primary') && syllables.length > 0) {
    syllables[0].stress = 'primary';
  }

  const builtIpa =
    preferredIpa && preferredIpa.trim().length > 0
      ? normalizeIpaSlashes(preferredIpa)
      : `/${syllables
          .map((s) =>
            s.stress === 'primary'
              ? `ˈ${s.ipa}`
              : s.stress === 'secondary'
                ? `ˌ${s.ipa}`
                : s.ipa
          )
          .join('')}/`;

  const koPronunciation = syllables.map((s) => s.koHint).join('-');
  const symbolIds = extractSymbolIdsFromArpa(arpaPron);

  return {
    ipa: builtIpa,
    syllables,
    koPronunciation,
    symbolIds: symbolIds.length > 0 ? symbolIds : extractSymbolIdsFromIpa(builtIpa),
  };
}

/**
 * CMUdict 음소가 없는 희귀 단어용 IPA 기반 폴백 생성기
 */
export function buildFallbackPhonetics(
  word: string,
  rawIpa?: string
): BuiltPhonetics {
  const cleanIpa = normalizeIpaSlashes(rawIpa || word);
  const inner = cleanIpa.replace(/^\/|\/$/g, '');
  const rawParts = inner
    .split(/(?=[ˈˌ.])|\./)
    .map((p) => p.trim())
    .filter(Boolean);

  const parts = rawParts.length > 0 ? rawParts : [inner];
  const spellingParts = splitWordSpelling(word, parts.length);

  const syllables: SyllableItem[] = parts.map((part, idx) => {
    const isPrimary = part.startsWith('ˈ');
    const isSecondary = part.startsWith('ˌ');
    const stripped = part.replace(/^[ˈˌ]/, '');
    const isSchwa = /ə|ɚ/.test(stripped) && !isPrimary;

    return {
      text: spellingParts[idx] ?? word,
      ipa: stripped || word,
      stress: isPrimary ? 'primary' : isSecondary ? 'secondary' : 'none',
      ...(isSchwa ? { isSchwa: true } : {}),
      koHint: stripped || word,
    };
  });

  if (!syllables.some((s) => s.stress === 'primary') && syllables.length > 0) {
    syllables[0].stress = 'primary';
  }

  return {
    ipa: cleanIpa,
    syllables,
    koPronunciation: syllables.map((s) => s.koHint).join('-'),
    symbolIds: extractSymbolIdsFromIpa(cleanIpa),
  };
}

function normalizeIpaSlashes(ipa: string): string {
  const trimmed = ipa.trim().replace(/^\[|\]$/g, '');
  if (trimmed.startsWith('/') && trimmed.endsWith('/')) return trimmed;
  return `/${trimmed.replace(/^\/|\/$/g, '')}/`;
}
