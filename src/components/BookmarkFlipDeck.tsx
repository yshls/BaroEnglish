import {
  ArrowsClockwise,
  Check,
  CheckCircle,
  Gauge,
  Sparkle,
  SpeakerHigh,
} from './PlumpIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSpeechAudio } from '../hooks/useSpeechAudio';
import { Tap } from './Tap';
import { COLORS, RADIUS, SHADOW, SPACING, TOUCH, TYPOGRAPHY } from '../theme/tokens';
import type { CoreWord } from '../types/learning';
import { triggerLightHaptic, triggerSuccessHaptic } from '../utils/haptics';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

type DeckMode = 'standard' | 'recall';

interface BookmarkFlipDeckProps {
  words: CoreWord[];
  showKoHint: boolean;
  onOpenInReader: (word: string) => void;
  onReviewWord?: (wordKey: string, outcome: 'pass' | 'again') => void;
}

export function BookmarkFlipDeck({
  words,
  showKoHint,
  onOpenInReader,
  onReviewWord,
}: BookmarkFlipDeckProps) {
  const [queue, setQueue] = useState<CoreWord[]>(words);
  const [knownCount, setKnownCount] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [deckMode, setDeckMode] = useState<DeckMode>('standard');

  const [flipAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(0));
  const [cardOpacity] = useState(() => new Animated.Value(1));

  const { playNormal, playSlow, stop, activeKey } = useSpeechAudio();

  const currentWord = queue[0] ?? null;
  const totalWords = Math.max(1, words.length);
  const progressPct = Math.min(100, Math.round((knownCount / totalWords) * 100));
  const isRecall = deckMode === 'recall';

  // 뜻→말하기 모드: 뒷면(정답) 공개 시 자동 재생 (카드 전환·언마운트 시 자동 정리)
  useEffect(() => {
    if (!isFlipped || deckMode !== 'recall' || !currentWord || isTransitioning) return;
    const timer = setTimeout(() => {
      void playNormal(currentWord.word, {
        audioUrl: currentWord.audioUrl,
        audioAsset: currentWord.audioAsset,
        key: `deck:normal:${currentWord.id}`,
      });
    }, 250);
    return () => {
      clearTimeout(timer);
    };
  }, [currentWord, deckMode, isFlipped, isTransitioning, playNormal]);

  const handleFlip = useCallback(() => {
    if (!currentWord || isTransitioning) return;
    triggerLightHaptic();
    const nextFlipped = !isFlipped;
    setIsFlipped(nextFlipped);

    Animated.spring(flipAnim, {
      toValue: nextFlipped ? 1 : 0,
      friction: 7.5,
      tension: 80,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, [currentWord, flipAnim, isFlipped, isTransitioning]);

  const transitionToNext = useCallback(
    (direction: 'known' | 'again', fromSwipe = false) => {
      if (!currentWord || isTransitioning) return;
      setIsTransitioning(true);
      stop();
      onReviewWord?.(currentWord.word, direction === 'known' ? 'pass' : 'again');

      if (direction === 'known') {
        triggerSuccessHaptic();
      } else {
        triggerLightHaptic();
      }

      const exitX = direction === 'known' ? (fromSwipe ? 280 : 42) : fromSwipe ? -280 : -42;

      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: exitX,
          duration: 160,
          easing: Easing.out(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]).start(({ finished }) => {
        if (!finished) {
          setIsTransitioning(false);
          return;
        }
        setIsFlipped(false);
        flipAnim.setValue(0);

        setQueue((prev) => {
          if (prev.length === 0) return prev;
          const [head, ...rest] = prev;
          return direction === 'again' ? [...rest, head] : rest;
        });

        if (direction === 'known') {
          setKnownCount((prev) => prev + 1);
        }

        slideAnim.setValue(direction === 'known' ? -24 : 24);
        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: 0,
            friction: 7,
            tension: 110,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(cardOpacity, {
            toValue: 1,
            duration: 180,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]).start(() => {
          setIsTransitioning(false);
        });
      });
    },
    [cardOpacity, currentWord, flipAnim, isTransitioning, onReviewWord, slideAnim, stop]
  );

  const handleResetDeck = useCallback(() => {
    triggerLightHaptic();
    setIsTransitioning(false);
    stop();
    setQueue(words);
    setKnownCount(0);
    setIsFlipped(false);
    flipAnim.setValue(0);
    slideAnim.setValue(0);
    cardOpacity.setValue(1);
  }, [cardOpacity, flipAnim, slideAnim, stop, words]);

  const handleSwitchDeckMode = useCallback(
    (nextMode: DeckMode) => {
      if (nextMode === deckMode) return;
      triggerLightHaptic();
      stop();
      setIsFlipped(false);
      flipAnim.setValue(0);
      setDeckMode(nextMode);
    },
    [deckMode, flipAnim, stop]
  );

  // 좌우 드래그 스와이프로 넘기기 (오른쪽=알아요, 왼쪽=한 번 더). RN 내장 PanResponder — 의존성 0.
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          !isTransitioning && Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, g) => {
          slideAnim.setValue(g.dx);
        },
        onPanResponderRelease: (_, g) => {
          if (g.dx > 90) {
            transitionToNext('known', true);
          } else if (g.dx < -90) {
            transitionToNext('again', true);
          } else {
            Animated.spring(slideAnim, {
              toValue: 0,
              friction: 7,
              tension: 120,
              useNativeDriver: USE_NATIVE_DRIVER,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(slideAnim, {
            toValue: 0,
            friction: 7,
            tension: 120,
            useNativeDriver: USE_NATIVE_DRIVER,
          }).start();
        },
      }),
    [isTransitioning, slideAnim, transitionToNext]
  );

  if (words.length === 0) return null;

  if (!currentWord) {
    return (
      <View style={styles.doneCard}>
        <View style={styles.doneIconCircle}>
          <CheckCircle size={34} color={COLORS.success} weight="fill" />
        </View>
        <Text style={styles.doneTitle} maxFontSizeMultiplier={1.35}>
          저장한 단어 {words.length}개 복습 완료!
        </Text>
        <Text style={styles.doneSub} maxFontSizeMultiplier={1.35}>
          입으로 한 번 더 소리 내어 복습하면 훨씬 오래 기억돼요.
        </Text>
        <Pressable
          onPress={handleResetDeck}
          style={({ pressed }) => [styles.restartBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="카드 복습 처음부터 다시 하기"
        >
          <ArrowsClockwise size={18} color={COLORS.white} />
          <Text style={styles.restartBtnText} maxFontSizeMultiplier={1.25}>
            처음부터 다시 복습
          </Text>
        </Pressable>
      </View>
    );
  }

  const normalKey = `deck:normal:${currentWord.id}`;
  const slowKey = `deck:slow:${currentWord.id}`;
  const isNormalPlaying = activeKey === normalKey;
  const isSlowPlaying = activeKey === slowKey;

  const frontRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  const backRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });
  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 0.499, 0.501, 1],
    outputRange: [1, 1, 0, 0],
  });
  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 0.499, 0.501, 1],
    outputRange: [0, 0, 1, 1],
  });
  const dragRotate = slideAnim.interpolate({
    inputRange: [-240, 0, 240],
    outputRange: ['-7deg', '0deg', '7deg'],
  });

  return (
    <View style={styles.deckWrap}>
      {/* 모드 토글: 일반 복습 / 뜻→말하기 */}
      <View style={styles.modeToggleRow}>
        <Pressable
          onPress={() => handleSwitchDeckMode('standard')}
          style={[styles.modeTogglePill, !isRecall && styles.modeTogglePillActive]}
          accessibilityRole="tab"
          accessibilityState={{ selected: !isRecall }}
        >
          <Text style={[styles.modeToggleText, !isRecall && styles.modeToggleTextActive]} maxFontSizeMultiplier={1.2}>
            일반 복습
          </Text>
        </Pressable>
        <Pressable
          onPress={() => handleSwitchDeckMode('recall')}
          style={[styles.modeTogglePill, isRecall && styles.modeTogglePillRecallActive]}
          accessibilityRole="tab"
          accessibilityState={{ selected: isRecall }}
        >
          <Text style={[styles.modeToggleText, isRecall && styles.modeToggleTextActive]} maxFontSizeMultiplier={1.2}>
            뜻→말하기
          </Text>
        </Pressable>
      </View>

      {/* 상단 진행률 바 */}
      <View style={styles.progressHeader}>
        <View style={styles.progressLabelRow}>
          <Sparkle size={15} color={COLORS.primary} weight="fill" />
          <Text style={styles.progressTitle} maxFontSizeMultiplier={1.25}>
            카드 복습 · 남은 단어 {queue.length}개
          </Text>
        </View>
        <Text style={styles.progressCount} maxFontSizeMultiplier={1.25}>
          {knownCount}/{words.length} 완료
        </Text>
      </View>
      {progressPct > 0 && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>
      )}

      {/* 3D 플립 카드 영역 (좌우 드래그로 넘기기) */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.flipStage,
          Platform.OS === 'web'
            ? ({ userSelect: 'none' } as unknown as Record<string, unknown>)
            : undefined,
          {
            opacity: cardOpacity,
            transform: [{ translateX: slideAnim }, { rotate: dragRotate }],
          },
        ]}
      >
        {/* 앞면: 영단어 + 듣기 */}
        <Animated.View
          pointerEvents={isFlipped ? 'none' : 'auto'}
          style={[
            styles.cardFace,
            styles.cardFront,
            {
              zIndex: isFlipped ? 0 : 2,
              opacity: frontOpacity,
              transform: [{ perspective: 1000 }, { rotateY: frontRotate }],
            },
          ]}
        >
          <Pressable
            onPress={handleFlip}
            style={styles.cardTapArea}
            accessibilityRole="button"
            accessibilityLabel={
              isRecall
                ? `${currentWord.meaningKo} 영어 단어 떠올려 보기`
                : `${currentWord.word} 카드 뒤집어서 뜻과 발음 보기`
            }
          >
            <View style={isRecall ? styles.faceBadgeRecall : styles.faceBadge}>
              <Text style={isRecall ? styles.faceBadgeRecallText : styles.faceBadgeText} maxFontSizeMultiplier={1.2}>
                {isRecall ? '앞면 · 한국어 뜻' : '앞면 · 영단어'}
              </Text>
            </View>

            {isRecall ? (
              <Text
                style={styles.frontMeaning}
                adjustsFontSizeToFit
                numberOfLines={2}
                maxFontSizeMultiplier={1.3}
              >
                {currentWord.meaningKo}
              </Text>
            ) : (
              <Text
                style={styles.frontWord}
                adjustsFontSizeToFit
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}
              >
                {currentWord.word}
              </Text>
            )}

            <Text style={styles.flipHint} maxFontSizeMultiplier={1.25}>
              {isRecall
                ? '영어 단어를 떠올려 보세요 → 탭하면 정답'
                : '카드를 탭하면 발음기호와 뜻이 나와요'}
            </Text>
          </Pressable>

          {!isRecall ? (
            <View style={styles.audioRow}>
              <Pressable
                onPress={() => {
                  triggerLightHaptic();
                  void playNormal(currentWord.word, {
                    audioUrl: currentWord.audioUrl,
                    audioAsset: currentWord.audioAsset,
                    key: normalKey,
                  });
                }}
                style={({ pressed }) => [
                  styles.audioBtnPrimary,
                  isNormalPlaying && styles.audioBtnPrimaryActive,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${currentWord.word} 보통 속도 듣기`}
              >
                <SpeakerHigh size={17} color={COLORS.white} />
                <Text style={styles.audioBtnPrimaryText} maxFontSizeMultiplier={1.2}>
                  {isNormalPlaying ? '재생 중' : '듣기'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  triggerLightHaptic();
                  void playSlow(currentWord.word, { key: slowKey });
                }}
                style={({ pressed }) => [
                  styles.audioBtnSlow,
                  isSlowPlaying && styles.audioBtnSlowActive,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${currentWord.word} 천천히 듣기`}
              >
                <Gauge
                  size={17}
                  color={isSlowPlaying ? COLORS.white : COLORS.tealText}
                />
                <Text
                  style={[
                    styles.audioBtnSlowText,
                    isSlowPlaying && styles.audioBtnPrimaryText,
                  ]}
                  maxFontSizeMultiplier={1.2}
                >
                  천천히
                </Text>
              </Pressable>
            </View>
          ) : null}
        </Animated.View>

        {/* 뒷면: IPA + 뜻 + 강세 리듬 */}
        <Animated.View
          pointerEvents={isFlipped ? 'auto' : 'none'}
          style={[
            styles.cardFace,
            styles.cardBack,
            {
              zIndex: isFlipped ? 2 : 0,
              opacity: backOpacity,
              transform: [{ perspective: 1000 }, { rotateY: backRotate }],
            },
          ]}
        >
          <Pressable
            onPress={handleFlip}
            style={styles.cardTapArea}
            accessibilityRole="button"
            accessibilityLabel={`${currentWord.word} 카드 앞면으로 뒤집기`}
          >
            <View style={styles.backTopRow}>
              <View style={isRecall ? styles.faceBadgeRecallBack : styles.faceBadgeBack}>
                <Text style={isRecall ? styles.faceBadgeRecallBackText : styles.faceBadgeBackText} maxFontSizeMultiplier={1.2}>
                  {isRecall ? '뒷면 · 정답' : '뒷면 · 발음과 뜻'}
                </Text>
              </View>
              {!isRecall && (
                <Text style={styles.backWordSmall} maxFontSizeMultiplier={1.25}>
                  {currentWord.word}
                </Text>
              )}
            </View>

            {isRecall ? (
              <Text
                style={styles.frontWord}
                adjustsFontSizeToFit
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}
              >
                {currentWord.word}
              </Text>
            ) : (
              <Text style={styles.backMeaning} maxFontSizeMultiplier={1.35}>
                {currentWord.meaningKo}
              </Text>
            )}

            <View style={styles.backPronRow}>
              <View style={styles.ipaPill}>
                <Text style={styles.ipaText} maxFontSizeMultiplier={1.25}>
                  {currentWord.ipa}
                </Text>
              </View>
              {showKoHint && currentWord.koPronunciation ? (
                <Text style={styles.koPronText} maxFontSizeMultiplier={1.25}>
                  {currentWord.koPronunciation}
                </Text>
              ) : null}
            </View>

            {currentWord.syllables.length > 1 ? (
              <View style={styles.sylPreviewRow}>
                {currentWord.syllables.map((syl, idx) => {
                  const isPrimary = syl.stress === 'primary';
                  return (
                    <View
                      key={`${currentWord.id}-back-syl-${idx}`}
                      style={[
                        styles.sylChip,
                        isPrimary && styles.sylChipPrimary,
                      ]}
                    >
                      <Text
                        style={[
                          styles.sylChipText,
                          isPrimary && styles.sylChipTextPrimary,
                        ]}
                        maxFontSizeMultiplier={1.2}
                      >
                        {isPrimary ? '⬤ ' : ''}
                        {syl.text}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </Pressable>

          {isRecall ? (
            <View style={styles.audioRow}>
              <Pressable
                onPress={() => {
                  triggerLightHaptic();
                  void playNormal(currentWord.word, {
                    audioUrl: currentWord.audioUrl,
                    audioAsset: currentWord.audioAsset,
                    key: normalKey,
                  });
                }}
                style={({ pressed }) => [
                  styles.audioBtnPrimary,
                  isNormalPlaying && styles.audioBtnPrimaryActive,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${currentWord.word} 다시 듣기`}
              >
                <SpeakerHigh size={17} color={COLORS.white} />
                <Text style={styles.audioBtnPrimaryText} maxFontSizeMultiplier={1.2}>
                  {isNormalPlaying ? '재생 중' : '다시 듣기'}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => onOpenInReader(currentWord.word)}
              style={({ pressed }) => [styles.openDetailBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`${currentWord.word} 단어 읽기 화면에서 자세히 보기`}
            >
              <Text style={styles.openDetailBtnText} maxFontSizeMultiplier={1.2}>
                단어 읽기에서 자세히 보기
              </Text>
            </Pressable>
          )}
        </Animated.View>
      </Animated.View>

      {/* 하단 복습 판정 버튼 (한 번 더 / 알아요) */}
      <View style={styles.actionsRow}>
        <Tap
          onPress={() => transitionToNext('again')}
          style={styles.againBtn}
          accessibilityRole="button"
          accessibilityLabel="이 단어 한 번 더 복습하기"
        >
          <ArrowsClockwise size={18} color={COLORS.accentText} />
          <Text style={styles.againBtnText} maxFontSizeMultiplier={1.25}>
            한 번 더
          </Text>
        </Tap>

        <Tap
          onPress={() => transitionToNext('known')}
          style={styles.knownBtn}
          accessibilityRole="button"
          accessibilityLabel="이 단어 알아요 완료"
        >
          <Check size={18} color={COLORS.white} weight="bold" />
          <Text style={styles.knownBtnText} maxFontSizeMultiplier={1.25}>
            알아요!
          </Text>
        </Tap>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  deckWrap: {
    gap: SPACING.sm,
  },
  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.pill,
    padding: 3,
    gap: 3,
  },
  modeTogglePill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTogglePillActive: {
    backgroundColor: COLORS.text,
  },
  modeTogglePillRecallActive: {
    backgroundColor: COLORS.accent,
  },
  modeToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  modeToggleTextActive: {
    color: COLORS.white,
  },
  faceBadgeRecall: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  faceBadgeRecallText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.accentText,
  },
  frontMeaning: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  faceBadgeRecallBack: {
    backgroundColor: COLORS.successSoft,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  faceBadgeRecallBackText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.successText,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  progressTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  progressCount: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  progressTrack: {
    height: 7,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
  },
  flipStage: {
    position: 'relative',
    minHeight: 264,
  },
  cardFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    justifyContent: 'space-between',
    backfaceVisibility: 'hidden',
    ...SHADOW.card,
  },
  cardFront: {
    backgroundColor: COLORS.card,
  },
  cardBack: {
    backgroundColor: COLORS.tint,
  },
  cardTapArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  faceBadge: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  faceBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  frontWord: {
    fontSize: 30,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  flipHint: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  audioRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  audioBtnPrimary: {
    flex: 1,
    minHeight: TOUCH.minTarget,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  audioBtnPrimaryActive: {
    backgroundColor: COLORS.primaryDark,
  },
  audioBtnPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  audioBtnSlow: {
    flex: 1,
    minHeight: TOUCH.minTarget,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.tealSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  audioBtnSlowActive: {
    backgroundColor: COLORS.teal,
  },
  audioBtnSlowText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.tealText,
  },
  backTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  faceBadgeBack: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  faceBadgeBackText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  backWordSmall: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  backMeaning: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  backPronRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ipaPill: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  ipaText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  koPronText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  sylPreviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  sylChip: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sylChipPrimary: {
    backgroundColor: COLORS.accentSoft,
  },
  sylChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  sylChipTextPrimary: {
    fontWeight: '700',
    color: COLORS.accentText,
  },
  openDetailBtn: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.card,
    marginTop: 6,
  },
  openDetailBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  againBtn: {
    flex: 1,
    minHeight: TOUCH.recommendedHeight,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.accentSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  againBtnText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.accentText,
  },
  knownBtn: {
    flex: 1.2,
    minHeight: TOUCH.recommendedHeight,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  knownBtnText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.white,
  },
  doneCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: 10,
    ...SHADOW.card,
  },
  doneIconCircle: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneTitle: {
    fontSize: TYPOGRAPHY.sectionTitle,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  doneSub: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  restartBtn: {
    marginTop: 4,
    minHeight: TOUCH.minTarget,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  restartBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  pressed: {
    opacity: 0.84,
  },
});
