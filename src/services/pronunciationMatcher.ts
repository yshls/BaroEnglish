export type PronunciationGrade = 'excellent' | 'good' | 'close' | 'retry';

export interface PronunciationEvaluation {
  /** 0 ~ 100 유사도 점수 */
  score: number;
  grade: PronunciationGrade;
  /** 음성 인식으로 가장 가깝게 들린 영단어/문구 */
  heardText: string;
  /** 쉽고 친절한 한글 피드백 제목 */
  headlineKo: string;
  /** 구체적인 발음 연습 팁 */
  tipKo: string;
  /** 실제 음성 인식(STT) 기반 비교인지, 리듬/길이 기반 보조 안내인지 구분 */
  mode: 'speech_recognition' | 'audio_rhythm';
}

function normalizeForCompare(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z\s']/g, ' ')
    .replace(/'/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 영단어의 대략적인 발음 골격(Phonetic Skeleton)을 생성합니다.
 * 철자가 조금 달라도 소리가 같거나 매우 비슷한 경우(예: sea/see, phone/fone, schedule/skedule)
 * 공정하게 높은 유사도를 부여하기 위함입니다.
 */
export function toPhoneticSkeleton(rawWord: string): string {
  let w = normalizeForCompare(rawWord).replace(/\s+/g, '');
  if (!w) return '';

  // 묵음 및 이중자음 발음 정규화
  w = w
    .replace(/^kn/, 'n')
    .replace(/^wr/, 'r')
    .replace(/^gn/, 'n')
    .replace(/^ps/, 's')
    .replace(/ph/g, 'f')
    .replace(/ght/g, 't')
    .replace(/gh/g, '')
    .replace(/tion/g, 'shun')
    .replace(/sion/g, 'shun')
    .replace(/sch/g, 'sk')
    .replace(/ch/g, 'C')
    .replace(/sh/g, 'S')
    .replace(/th/g, 'T')
    .replace(/ck/g, 'k')
    .replace(/qu/g, 'kw')
    .replace(/c(?=[eiy])/g, 's')
    .replace(/c/g, 'k')
    .replace(/x/g, 'ks')
    .replace(/z/g, 's')
    .replace(/v/g, 'f')
    .replace(/ee|ea|ie/g, 'i')
    .replace(/oo|ou|ow/g, 'u')
    .replace(/ai|ay|ei|ey/g, 'e')
    .replace(/y/g, 'i')
    .replace(/e$/, '');

  // 연속 중복 문자 축약 (apple -> aple, coffee -> kofi)
  w = w.replace(/(.)\1+/g, '$1');
  return w;
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) prev[j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j];
  }
  return prev[b.length];
}

function normalizedSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshteinDistance(a, b);
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * 목표 영단어와 음성 인식 후보들(alternatives)을 비교해 0~100 유사도와 한글 코칭을 산출합니다.
 */
export function evaluatePronunciationTranscripts(
  targetWord: string,
  alternatives: { transcript: string; confidence?: number }[]
): PronunciationEvaluation {
  const cleanTarget = normalizeForCompare(targetWord);
  const targetPhonetic = toPhoneticSkeleton(cleanTarget);

  let bestScore = 0;
  let bestHeard = '';

  for (const alt of alternatives) {
    const cleanAlt = normalizeForCompare(alt.transcript);
    if (!cleanAlt) continue;

    // 사용자가 문장/여러 단어로 인식됐을 경우 각 단어 중 가장 가까운 토큰도 함께 검사
    const tokens = cleanAlt.split(' ').filter(Boolean);
    const candidatesToCheck = tokens.length > 1 ? [cleanAlt, ...tokens] : [cleanAlt];

    for (const candidate of candidatesToCheck) {
      let scoreFloat = 0;
      if (candidate === cleanTarget) {
        // 정확히 일치: 인식 신뢰도가 있으면 92~100 사이로 반영, 없으면 96점
        const conf = typeof alt.confidence === 'number' && alt.confidence > 0 ? alt.confidence : 0.94;
        scoreFloat = 0.91 + Math.min(1, conf) * 0.09;
      } else {
        const textSim = normalizedSimilarity(cleanTarget, candidate);
        const phoneticSim = normalizedSimilarity(
          targetPhonetic,
          toPhoneticSkeleton(candidate)
        );
        // 발음 골격 유사도에 더 높은 가중치(65%) 부여
        scoreFloat = phoneticSim * 0.65 + textSim * 0.35;
        if (phoneticSim === 1) {
          scoreFloat = Math.max(scoreFloat, 0.93);
        }
      }

      const pct = Math.max(0, Math.min(100, Math.round(scoreFloat * 100)));
      if (pct > bestScore || (!bestHeard && candidate)) {
        bestScore = pct;
        bestHeard = candidate;
      }
    }
  }

  if (!bestHeard) {
    return {
      score: 0,
      grade: 'retry',
      heardText: '',
      headlineKo: '목소리가 잘 들리지 않았어요',
      tipKo: '마이크 가까이에서 조금 더 또렷하게 말해 보세요.',
      mode: 'speech_recognition',
    };
  }

  if (bestScore >= 88) {
    return {
      score: bestScore,
      grade: 'excellent',
      heardText: bestHeard,
      headlineKo: '아주 좋아요! 원어민과 아주 비슷해요',
      tipKo: '내 목소리와 원어민 소리를 번갈아 들으며 자신감을 다져 보세요!',
      mode: 'speech_recognition',
    };
  }

  if (bestScore >= 68) {
    return {
      score: bestScore,
      grade: 'good',
      heardText: bestHeard,
      headlineKo: '잘하셨어요! 거의 비슷하게 들렸어요',
      tipKo: '강세(큰 점) 음절만 살짝 더 힘주어 말하면 완벽해요.',
      mode: 'speech_recognition',
    };
  }

  if (bestScore >= 45) {
    return {
      score: bestScore,
      grade: 'close',
      heardText: bestHeard,
      headlineKo: '비슷해요! 한 번만 더 천천히 따라해 볼까요?',
      tipKo: `기계에는 '${bestHeard}'처럼 들렸어요. 천천히(0.6x) 듣고 강세에 맞춰 말해 보세요.`,
      mode: 'speech_recognition',
    };
  }

  return {
    score: bestScore,
    grade: 'retry',
    heardText: bestHeard,
    headlineKo: '조금 다르게 들렸어요. 다시 도전해 보세요!',
    tipKo: `기계에는 '${bestHeard}'(으)로 인식됐어요. 원어민 소리를 한 번 더 듣고 따라 말해 보세요.`,
    mode: 'speech_recognition',
  };
}

/**
 * 음성 인식(STT)을 지원하지 않는 환경(일부 모바일/브라우저)에서
 * 녹음 길이와 목소리 크기(음성 활성도)를 바탕으로 정직한 리듬 비교 피드백을 제공합니다.
 */
export function evaluateAudioRhythmFallback(
  syllableCount: number,
  durationMs: number,
  peakLevel: number
): PronunciationEvaluation {
  if (durationMs < 220 || peakLevel < 0.06) {
    return {
      score: 0,
      grade: 'retry',
      heardText: '',
      headlineKo: '목소리가 너무 작거나 짧게 녹음됐어요',
      tipKo: '마이크 버튼을 누르고 단어를 끝까지 또렷하게 말해 보세요.',
      mode: 'audio_rhythm',
    };
  }

  // 음절 수 기반 기대 발화 길이(ms): 1음절 ~450ms, 2음절 ~680ms, 3음절 ~920ms ...
  const expectedMs = Math.max(450, 260 + Math.max(1, syllableCount) * 230);
  const ratio = durationMs / expectedMs;
  const rhythmFit =
    ratio >= 0.65 && ratio <= 1.75
      ? 1
      : ratio < 0.65
        ? Math.max(0.35, ratio / 0.65)
        : Math.max(0.45, 1.75 / ratio);

  const volumeFit = Math.min(1, peakLevel / 0.28);
  const score = Math.max(40, Math.min(95, Math.round((rhythmFit * 0.7 + volumeFit * 0.3) * 95)));

  return {
    score,
    grade: score >= 75 ? 'good' : 'close',
    heardText: '',
    headlineKo: '녹음 완료! 원어민 발음과 직접 비교해 들어보세요',
    tipKo:
      '아래 [원어민 → 내 발음 비교] 버튼을 누르면 두 소리가 연달아 나와 차이를 바로 느낄 수 있어요.',
    mode: 'audio_rhythm',
  };
}
