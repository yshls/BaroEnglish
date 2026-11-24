import {
  ArrowsClockwise,
  CheckCircle,
  Play,
  Sparkle,
  SpeakerHigh,
  SpeakerLow,
} from './PlumpIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { IPA_SYMBOL_BY_ID } from '../data/categories';
import { useSpeechAudio } from '../hooks/useSpeechAudio';
import { fetchSymbolExamplesByLevel } from '../services/wordApi';
import { COLORS, RADIUS, SHADOW, SPACING, TOUCH, TYPOGRAPHY } from '../theme/tokens';
import type { IpaSymbol, SymbolExampleWord } from '../types/learning';
import {
  triggerErrorHaptic,
  triggerLightHaptic,
  triggerSuccessHaptic,
} from '../utils/haptics';
import { HorizontalChipScroll } from './HorizontalChipScroll';
import { InfoTipBox, InfoTipButton } from './InfoTip';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

interface ConfusingPairDef {
  id: string;
  leftId: string;
  rightId: string;
  shortDiffKo: string;
}

const CONFUSING_PAIRS: ConfusingPairDef[] = [
  {
    id: 'r_l',
    leftId: 'sym_r',
    rightId: 'sym_l',
    shortDiffKo: '혀 안 닿게 vs 윗니 뒤',
  },
  {
    id: 'ae_eh',
    leftId: 'sym_ae',
    rightId: 'sym_eh',
    shortDiffKo: "입 크게 '애' vs 가볍게 '에'",
  },
  {
    id: 'th_s',
    leftId: 'sym_th_voiceless',
    rightId: 'sym_s',
    shortDiffKo: "혀끝 물고 '쓰' vs 맑은 '스'",
  },
  {
    id: 'f_p',
    leftId: 'sym_f',
    rightId: 'sym_p',
    shortDiffKo: '윗니+아랫입술 vs 두 입술',
  },
  {
    id: 'iy_ih',
    leftId: 'sym_iy',
    rightId: 'sym_ih',
    shortDiffKo: "길게 '이—' vs 짧게 '이'",
  },
];

type TrainerMode = 'compare' | 'quiz';
type Side = 'left' | 'right';

export function MinimalPairTrainer() {
  const [expanded, setExpanded] = useState(false);
  const [selectedPairId, setSelectedPairId] = useState<string>(CONFUSING_PAIRS[0].id);
  const [mode, setMode] = useState<TrainerMode>('compare');
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [showInfo, setShowInfo] = useState(false);

  const [loadedPair, setLoadedPair] = useState<{
    key: string;
    left: SymbolExampleWord | null;
    right: SymbolExampleWord | null;
  }>({ key: '', left: null, right: null });

  const [quizAnswer, setQuizAnswer] = useState<Side | null>(null);
  const [quizPicked, setQuizPicked] = useState<Side | null>(null);
  const [quizStreak, setQuizStreak] = useState(0);

  const { playNormal, playSlow, stop, activeKey } = useSpeechAudio();

  const [leftScale] = useState(() => new Animated.Value(1));
  const [rightScale] = useState(() => new Animated.Value(1));
  const [leftShake] = useState(() => new Animated.Value(0));
  const [rightShake] = useState(() => new Animated.Value(0));

  const activePair = useMemo(
    () => CONFUSING_PAIRS.find((p) => p.id === selectedPairId) ?? CONFUSING_PAIRS[0],
    [selectedPairId]
  );

  const leftSymbol: IpaSymbol | undefined = IPA_SYMBOL_BY_ID[activePair.leftId];
  const rightSymbol: IpaSymbol | undefined = IPA_SYMBOL_BY_ID[activePair.rightId];
  const requestKey = `${activePair.id}:${refreshSeed}`;
  const isLoading = expanded && loadedPair.key !== requestKey;
  const leftExample = loadedPair.key === requestKey ? loadedPair.left : null;
  const rightExample = loadedPair.key === requestKey ? loadedPair.right : null;

  // 펼쳐진 상태에서만 Datamuse 기반 동적 단어 쌍 실시간 로드 (하드코딩 0개)
  useEffect(() => {
    if (!expanded || !leftSymbol || !rightSymbol) return;
    let cancelled = false;
    const currentKey = `${activePair.id}:${refreshSeed}`;

    Promise.all([
      fetchSymbolExamplesByLevel(leftSymbol, 'beginner', refreshSeed),
      fetchSymbolExamplesByLevel(rightSymbol, 'beginner', refreshSeed),
    ])
      .then(([leftItems, rightItems]) => {
        if (cancelled) return;
        const leftPick = leftItems[0] ?? null;
        const rightPick =
          rightItems.find(
            (item) =>
              !leftPick ||
              item.word.toLowerCase() !== leftPick.word.toLowerCase()
          ) ??
          rightItems[0] ??
          null;
        setLoadedPair({ key: currentKey, left: leftPick, right: rightPick });
      })
      .catch(() => {
        if (cancelled) return;
        setLoadedPair({ key: currentKey, left: null, right: null });
      });

    return () => {
      cancelled = true;
    };
  }, [activePair.id, expanded, leftSymbol, rightSymbol, refreshSeed]);

  const bounceSide = useCallback(
    (side: Side) => {
      const target = side === 'left' ? leftScale : rightScale;
      target.stopAnimation();
      target.setValue(0.94);
      Animated.spring(target, {
        toValue: 1,
        friction: 4.5,
        tension: 180,
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();
    },
    [leftScale, rightScale]
  );

  const shakeSide = useCallback(
    (side: Side) => {
      const target = side === 'left' ? leftShake : rightShake;
      target.stopAnimation();
      target.setValue(0);
      Animated.sequence([
        Animated.timing(target, { toValue: -7, duration: 50, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(target, { toValue: 7, duration: 50, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(target, { toValue: -5, duration: 45, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(target, { toValue: 0, duration: 45, useNativeDriver: USE_NATIVE_DRIVER }),
      ]).start();
    },
    [leftShake, rightShake]
  );

  const playWordExample = useCallback(
    (example: SymbolExampleWord | null, key: string, slow = false) => {
      if (!example) return;
      if (slow) {
        void playSlow(example.word, { key });
      } else {
        void playNormal(example.word, { key });
      }
    },
    [playNormal, playSlow]
  );

  const startQuizRound = useCallback(() => {
    if (!leftExample || !rightExample) return;
    const nextAnswer: Side = Math.random() < 0.5 ? 'left' : 'right';
    setQuizAnswer(nextAnswer);
    setQuizPicked(null);
    const ex = nextAnswer === 'left' ? leftExample : rightExample;
    playWordExample(ex, `pair:quiz:${activePair.id}:${ex.word}`);
  }, [activePair.id, leftExample, playWordExample, rightExample]);

  const handleSelectPairChip = (pairId: string) => {
    triggerLightHaptic();
    stop();
    setSelectedPairId(pairId);
    setRefreshSeed(0);
    setMode('compare');
    setQuizAnswer(null);
    setQuizPicked(null);
    setExpanded(true);
  };

  const handleSwitchMode = (nextMode: TrainerMode) => {
    triggerLightHaptic();
    stop();
    setMode(nextMode);
    if (nextMode === 'quiz' && leftExample && rightExample) {
      const nextAnswer: Side = Math.random() < 0.5 ? 'left' : 'right';
      setQuizAnswer(nextAnswer);
      setQuizPicked(null);
      const ex = nextAnswer === 'left' ? leftExample : rightExample;
      setTimeout(() => {
        playWordExample(ex, `pair:quiz:${activePair.id}:${ex.word}`);
      }, 100);
    } else {
      setQuizAnswer(null);
      setQuizPicked(null);
    }
  };

  const handleCardPress = (side: Side) => {
    const example = side === 'left' ? leftExample : rightExample;
    if (!example) return;

    if (mode === 'compare') {
      triggerLightHaptic();
      bounceSide(side);
      playWordExample(example, `pair:${activePair.id}:${side}:${example.word}`);
      return;
    }

    // 퀴즈 모드
    if (!quizAnswer) {
      startQuizRound();
      return;
    }
    if (quizPicked !== null) {
      // 이미 답을 맞춘 상태에서는 소리 다시 듣기
      bounceSide(side);
      playWordExample(example, `pair:${activePair.id}:${side}:${example.word}`);
      return;
    }

    setQuizPicked(side);
    if (side === quizAnswer) {
      triggerSuccessHaptic();
      setQuizStreak((prev) => prev + 1);
      bounceSide(side);
    } else {
      triggerErrorHaptic();
      setQuizStreak(0);
      shakeSide(side);
      bounceSide(quizAnswer);
    }
  };

  if (!leftSymbol || !rightSymbol) return null;

  const isQuizSolved = mode === 'quiz' && quizPicked !== null;
  const isQuizCorrect = isQuizSolved && quizPicked === quizAnswer;
  const leftPlayingKey = `pair:${activePair.id}:left:${leftExample?.word ?? ''}`;
  const rightPlayingKey = `pair:${activePair.id}:right:${rightExample?.word ?? ''}`;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={styles.badgeIcon}>
            <Sparkle size={16} color={COLORS.purpleText} weight="fill" />
          </View>
          <Text style={styles.title} maxFontSizeMultiplier={1.35}>
            헷갈리는 소리 A/B 비교
          </Text>
          <InfoTipButton
            open={showInfo}
            onToggle={() => setShowInfo((prev) => !prev)}
            accessibilityLabel="헷갈리는 소리 비교 설명 보기"
          />
        </View>

        <Pressable
          onPress={() => {
            triggerLightHaptic();
            setExpanded((prev) => !prev);
          }}
          style={({ pressed }) => [styles.toggleBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={expanded ? '소리 비교 접기' : '소리 비교 펼치기'}
        >
          <Text style={styles.toggleBtnText} maxFontSizeMultiplier={1.2}>
            {expanded ? '접기' : '열어보기'}
          </Text>
        </Pressable>
      </View>

      <InfoTipBox
        visible={showInfo}
        text="비슷하게 들리는 두 발음기호를 번갈아 눌러 비교하고, 3초 귀 트임 퀴즈로 구별해 보세요."
        onClose={() => setShowInfo(false)}
      />

      {/* 헷갈리는 5개 소리 쌍 선택 칩 (칩을 누르면 바로 펼쳐짐) */}
      <HorizontalChipScroll contentContainerStyle={styles.pairChipsRow}>
        {CONFUSING_PAIRS.map((pair) => {
          const l = IPA_SYMBOL_BY_ID[pair.leftId];
          const r = IPA_SYMBOL_BY_ID[pair.rightId];
          if (!l || !r) return null;
          const isSelected = expanded && pair.id === activePair.id;
          return (
            <Pressable
              key={pair.id}
              onPress={() => handleSelectPairChip(pair.id)}
              style={({ pressed }) => [
                styles.pairChip,
                isSelected && styles.pairChipActive,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${l.ipa}와 ${r.ipa} 발음 비교`}
            >
              <Text
                style={[
                  styles.pairChipText,
                  isSelected && styles.pairChipTextActive,
                ]}
                maxFontSizeMultiplier={1.25}
              >
                {l.ipa} vs {r.ipa}
              </Text>
            </Pressable>
          );
        })}
      </HorizontalChipScroll>

      {expanded ? (
        <View style={styles.body}>
          {/* 모드 전환 + 차이 요약 + 다른 단어 */}
          <View style={styles.toolbarRow}>
            <View style={styles.modeSwitch}>
              <Pressable
                onPress={() => handleSwitchMode('compare')}
                style={({ pressed }) => [
                  styles.modePill,
                  mode === 'compare' && styles.modePillActive,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === 'compare' }}
              >
                <Text
                  style={[
                    styles.modePillText,
                    mode === 'compare' && styles.modePillTextActive,
                  ]}
                  maxFontSizeMultiplier={1.2}
                >
                  A/B 비교
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleSwitchMode('quiz')}
                style={({ pressed }) => [
                  styles.modePill,
                  mode === 'quiz' && styles.modePillQuizActive,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === 'quiz' }}
              >
                <Text
                  style={[
                    styles.modePillText,
                    mode === 'quiz' && styles.modePillTextActive,
                  ]}
                  maxFontSizeMultiplier={1.2}
                >
                  귀 트임 퀴즈
                </Text>
              </Pressable>
            </View>

            <View style={styles.toolbarRight}>
              {mode === 'quiz' && quizStreak > 0 ? (
                <View style={styles.streakPill}>
                  <Text style={styles.streakPillText} maxFontSizeMultiplier={1.2}>
                    연속 {quizStreak}
                  </Text>
                </View>
              ) : null}
              <Pressable
                onPress={() => {
                  triggerLightHaptic();
                  stop();
                  setQuizAnswer(null);
                  setQuizPicked(null);
                  setRefreshSeed((prev) => prev + 1);
                }}
                style={({ pressed }) => [styles.refreshBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="다른 비교 단어 불러오기"
              >
                <ArrowsClockwise size={15} color={COLORS.textMuted} />
                <Text style={styles.refreshBtnText} maxFontSizeMultiplier={1.2}>
                  다른 단어
                </Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.diffCaption} maxFontSizeMultiplier={1.3}>
            차이 포인트 · {activePair.shortDiffKo}
          </Text>

          {isLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={COLORS.purple} />
              <Text style={styles.loadingText} maxFontSizeMultiplier={1.3}>
                비교할 단어를 실시간으로 찾고 있어요...
              </Text>
            </View>
          ) : !leftExample || !rightExample ? (
            <View style={styles.loadingRow}>
              <Text style={styles.loadingText} maxFontSizeMultiplier={1.3}>
                비교 단어를 불러오지 못했어요. &apos;다른 단어&apos;를 눌러 보세요.
              </Text>
            </View>
          ) : (
            <>
              {/* 퀴즈 모드 상단 문제 듣기 / 결과 바 */}
              {mode === 'quiz' ? (
                <View
                  style={[
                    styles.quizPromptBar,
                    isQuizSolved &&
                      (isQuizCorrect
                        ? styles.quizPromptBarSuccess
                        : styles.quizPromptBarWrong),
                  ]}
                >
                  <View style={styles.quizPromptTextRow}>
                    {isQuizCorrect ? (
                      <CheckCircle size={18} color={COLORS.successText} weight="fill" />
                    ) : (
                      <Play size={16} color={COLORS.purpleText} />
                    )}
                    <Text
                      style={[
                        styles.quizPromptText,
                        isQuizCorrect && styles.quizPromptTextSuccess,
                        isQuizSolved && !isQuizCorrect && styles.quizPromptTextWrong,
                      ]}
                      maxFontSizeMultiplier={1.3}
                    >
                      {!quizAnswer
                        ? '소리를 듣고 A와 B 중 어느 발음인지 골라 보세요'
                        : !isQuizSolved
                          ? '방금 들린 소리는 A와 B 중 무엇일까요?'
                          : isQuizCorrect
                            ? `정답! ${quizAnswer === 'left' ? leftSymbol.ipa : rightSymbol.ipa} (${quizAnswer === 'left' ? leftExample.word : rightExample.word}) 소리예요.`
                            : `정답은 ${quizAnswer === 'left' ? leftSymbol.ipa : rightSymbol.ipa} (${quizAnswer === 'left' ? leftExample.word : rightExample.word})예요! 두 카드를 눌러 비교해 보세요.`}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => {
                      triggerLightHaptic();
                      if (!quizAnswer || isQuizSolved) {
                        startQuizRound();
                      } else {
                        const targetEx =
                          quizAnswer === 'left' ? leftExample : rightExample;
                        playWordExample(
                          targetEx,
                          `pair:quiz:${activePair.id}:${targetEx.word}`
                        );
                      }
                    }}
                    style={({ pressed }) => [
                      styles.quizActionBtn,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={isQuizSolved ? '다음 문제 듣기' : '문제 소리 다시 듣기'}
                  >
                    <Text style={styles.quizActionBtnText} maxFontSizeMultiplier={1.2}>
                      {isQuizSolved ? '다음 문제' : '다시 듣기'}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {/* 좌우 A / B 인터랙티브 비교 카드 */}
              <View style={styles.abGrid}>
                {(
                  [
                    {
                      side: 'left' as const,
                      label: 'A',
                      symbol: leftSymbol,
                      example: leftExample,
                      scale: leftScale,
                      shake: leftShake,
                      isPlaying: activeKey === leftPlayingKey,
                    },
                    {
                      side: 'right' as const,
                      label: 'B',
                      symbol: rightSymbol,
                      example: rightExample,
                      scale: rightScale,
                      shake: rightShake,
                      isPlaying: activeKey === rightPlayingKey,
                    },
                  ] as const
                ).map((col) => {
                  const isCorrectHighlight = isQuizSolved && quizAnswer === col.side;
                  const isWrongHighlight =
                    isQuizSolved && quizPicked === col.side && quizAnswer !== col.side;

                  return (
                    <Animated.View
                      key={col.side}
                      style={[
                        styles.abCardWrap,
                        {
                          transform: [
                            { translateX: col.shake },
                            { scale: col.scale },
                          ],
                        },
                      ]}
                    >
                      <Pressable
                        onPress={() => handleCardPress(col.side)}
                        style={({ pressed }) => [
                          styles.abCard,
                          col.side === 'left' ? styles.abCardLeft : styles.abCardRight,
                          col.isPlaying && styles.abCardPlaying,
                          isCorrectHighlight && styles.abCardCorrect,
                          isWrongHighlight && styles.abCardWrong,
                          pressed && styles.pressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`${col.label} 발음 ${col.symbol.ipa} ${col.example.word}`}
                      >
                        <View style={styles.abCardTopRow}>
                          <View
                            style={[
                              styles.abLetterPill,
                              col.side === 'left'
                                ? styles.abLetterPillLeft
                                : styles.abLetterPillRight,
                              isCorrectHighlight && styles.abLetterPillCorrect,
                            ]}
                          >
                            <Text
                              style={[
                                styles.abLetterText,
                                col.side === 'left'
                                  ? styles.abLetterTextLeft
                                  : styles.abLetterTextRight,
                                isCorrectHighlight && styles.abLetterTextCorrect,
                              ]}
                              maxFontSizeMultiplier={1.2}
                            >
                              {col.label}
                            </Text>
                          </View>

                          {col.isPlaying ? (
                            <SpeakerHigh size={17} color={COLORS.primary} />
                          ) : (
                            <SpeakerLow size={17} color={COLORS.textMuted} />
                          )}
                        </View>

                        <Text style={styles.abIpa} maxFontSizeMultiplier={1.3}>
                          {col.symbol.ipa}
                        </Text>

                        <Text
                          style={styles.abHint}
                          numberOfLines={1}
                          maxFontSizeMultiplier={1.25}
                        >
                          {col.symbol.koHint}
                        </Text>

                        {/* 퀴즈 풀이 중엔 단어 스포일러를 가리고 풀이 후/비교 모드에서 표시 */}
                        <View style={styles.abWordBox}>
                          {mode === 'quiz' && !isQuizSolved ? (
                            <Text style={styles.abWordHidden} maxFontSizeMultiplier={1.25}>
                              눌러서 선택
                            </Text>
                          ) : (
                            <>
                              <Text
                                style={styles.abWord}
                                numberOfLines={1}
                                maxFontSizeMultiplier={1.3}
                              >
                                {col.example.word}
                              </Text>
                              {col.example.meaningKo ? (
                                <Text
                                  style={styles.abMeaning}
                                  numberOfLines={1}
                                  maxFontSizeMultiplier={1.2}
                                >
                                  {col.example.meaningKo}
                                </Text>
                              ) : null}
                            </>
                          )}
                        </View>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </View>
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    gap: SPACING.sm,
    ...SHADOW.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  badgeIcon: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.text,
  },
  toggleBtn: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.background,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  pairChipsRow: {
    flexDirection: 'row',
    gap: 7,
    paddingVertical: 2,
  },
  pairChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.background,
  },
  pairChipActive: {
    backgroundColor: COLORS.purple,
  },
  pairChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  pairChipTextActive: {
    color: COLORS.white,
  },
  body: {
    gap: SPACING.sm,
    paddingTop: 2,
  },
  toolbarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.pill,
    padding: 3,
    gap: 3,
  },
  modePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  modePillActive: {
    backgroundColor: COLORS.text,
  },
  modePillQuizActive: {
    backgroundColor: COLORS.primary,
  },
  modePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  modePillTextActive: {
    color: COLORS.white,
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.successSoft,
  },
  streakPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.successText,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.background,
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  diffCaption: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  quizPromptBar: {
    backgroundColor: COLORS.purpleSoft,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  quizPromptBarSuccess: {
    backgroundColor: COLORS.successSoft,
  },
  quizPromptBarWrong: {
    backgroundColor: COLORS.roseSoft,
  },
  quizPromptTextRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quizPromptText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.purpleText,
    lineHeight: 18,
  },
  quizPromptTextSuccess: {
    color: COLORS.successText,
  },
  quizPromptTextWrong: {
    color: COLORS.roseText,
  },
  quizActionBtn: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.card,
  },
  quizActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  abGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  abCardWrap: {
    flex: 1,
  },
  abCard: {
    borderRadius: RADIUS.lg,
    padding: 12,
    gap: 4,
    minHeight: TOUCH.recommendedHeight + 60,
    justifyContent: 'space-between',
  },
  abCardLeft: {
    backgroundColor: COLORS.tint,
  },
  abCardRight: {
    backgroundColor: COLORS.tealSoft,
  },
  abCardPlaying: {
    backgroundColor: COLORS.accentSoft,
  },
  abCardCorrect: {
    backgroundColor: COLORS.successSoft,
  },
  abCardWrong: {
    backgroundColor: COLORS.roseSoft,
  },
  abCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  abLetterPill: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abLetterPillLeft: {
    backgroundColor: COLORS.card,
  },
  abLetterPillRight: {
    backgroundColor: COLORS.card,
  },
  abLetterPillCorrect: {
    backgroundColor: COLORS.success,
  },
  abLetterText: {
    fontSize: 12,
    fontWeight: '700',
  },
  abLetterTextLeft: {
    color: COLORS.primaryDark,
  },
  abLetterTextRight: {
    color: COLORS.tealText,
  },
  abLetterTextCorrect: {
    color: COLORS.white,
  },
  abIpa: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  abHint: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  abWordBox: {
    marginTop: 6,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 2,
  },
  abWord: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  abWordHidden: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.purpleText,
    textAlign: 'center',
  },
  abMeaning: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  pressed: {
    opacity: 0.84,
  },
});
