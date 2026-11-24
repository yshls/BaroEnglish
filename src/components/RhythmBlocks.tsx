import { CheckCircle, MusicNote, Play, Sparkle, SpeakerHigh, SpeakerLow } from './PlumpIcons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSpeechAudio } from '../hooks/useSpeechAudio';
import { COLORS, RADIUS, SPACING, TOUCH, TYPOGRAPHY } from '../theme/tokens';
import type { SyllableItem } from '../types/learning';
import {
  triggerErrorHaptic,
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerSuccessHaptic,
} from '../utils/haptics';
import { InfoTipBox, InfoTipButton } from './InfoTip';
import { Tap } from './Tap';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

interface RhythmBlocksProps {
  syllables: SyllableItem[];
  showKoHint: boolean;
  word?: string;
  onPlayWord?: () => void | Promise<void>;
}

type QuizState = 'asking' | 'wrong' | 'correct' | 'revealed';

interface BlockAnim {
  scale: Animated.Value;
  liftY: Animated.Value;
  shakeX: Animated.Value;
  dotScale: Animated.Value;
}

export function RhythmBlocks({
  syllables,
  showKoHint,
  word,
  onPlayWord,
}: RhythmBlocksProps) {
  const { playNormal, playSlow, stop, activeKey } = useSpeechAudio();
  const [rhythmIndex, setRhythmIndex] = useState<number | null>(null);
  const [showTip, setShowTip] = useState(false);
  const [quizMode, setQuizMode] = useState(false);
  const [quizState, setQuizState] = useState<QuizState>('asking');
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  const [correctIdx, setCorrectIdx] = useState<number | null>(null);
  const rhythmSessionRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearRhythmTimers = useCallback(() => {
    rhythmSessionRef.current += 1;
    for (const id of timersRef.current) {
      clearTimeout(id);
    }
    timersRef.current = [];
  }, []);

  const scheduleTimer = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timersRef.current = timersRef.current.filter((t) => t !== id);
      fn();
    }, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  const resetKey = `${word ?? ''}::${syllables.map((s) => `${s.text}:${s.stress}`).join('|')}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setRhythmIndex(null);
    setQuizMode(false);
    setQuizState('asking');
    setWrongIdx(null);
    setCorrectIdx(null);
  }

  const syllableCount = syllables.length;
  const blockAnims = useMemo<BlockAnim[]>(
    () =>
      Array.from({ length: syllableCount }, () => ({
        scale: new Animated.Value(1),
        liftY: new Animated.Value(0),
        shakeX: new Animated.Value(0),
        dotScale: new Animated.Value(1),
      })),
    [syllableCount]
  );

  useEffect(() => {
    return () => {
      for (const anim of blockAnims) {
        anim.scale.stopAnimation();
        anim.liftY.stopAnimation();
        anim.shakeX.stopAnimation();
        anim.dotScale.stopAnimation();
      }
    };
  }, [blockAnims]);

  const primaryIndices = useMemo(
    () =>
      syllables
        .map((syl, idx) => (syl.stress === 'primary' ? idx : -1))
        .filter((idx) => idx >= 0),
    [syllables]
  );
  const canQuiz = syllables.length >= 2 && primaryIndices.length > 0;
  const isQuizHidingStress =
    quizMode && (quizState === 'asking' || quizState === 'wrong');

  const getBlockAnim = useCallback(
    (idx: number): BlockAnim | undefined => blockAnims[idx],
    [blockAnims]
  );

  // 단어 변경·언마운트 시 진행 중인 리듬 타이머 전부 취소
  useEffect(() => {
    clearRhythmTimers();
    return () => {
      clearRhythmTimers();
    };
  }, [clearRhythmTimers, resetKey]);

  // 탭 이탈 시 잔여 리듬 타이머·TTS·진동 즉시 중단
  useFocusEffect(
    useCallback(() => {
      return () => {
        clearRhythmTimers();
        setRhythmIndex(null);
      };
    }, [clearRhythmTimers])
  );

  const animateBounce = useCallback(
    (idx: number, stress: SyllableItem['stress']) => {
      const anim = getBlockAnim(idx);
      if (!anim) return;
      const liftTarget = stress === 'primary' ? -10 : stress === 'secondary' ? -6 : -3;
      const scaleTarget = stress === 'primary' ? 1.08 : stress === 'secondary' ? 1.05 : 1.03;
      const dotTarget = stress === 'primary' ? 1.48 : 1.3;

      anim.liftY.stopAnimation();
      anim.scale.stopAnimation();
      anim.dotScale.stopAnimation();

      Animated.parallel([
        Animated.sequence([
          Animated.spring(anim.liftY, {
            toValue: liftTarget,
            speed: 28,
            bounciness: 12,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.spring(anim.liftY, {
            toValue: 0,
            speed: 18,
            bounciness: 10,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]),
        Animated.sequence([
          Animated.spring(anim.scale, {
            toValue: scaleTarget,
            speed: 28,
            bounciness: 12,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.spring(anim.scale, {
            toValue: 1,
            speed: 18,
            bounciness: 10,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]),
        Animated.sequence([
          Animated.spring(anim.dotScale, {
            toValue: dotTarget,
            speed: 30,
            bounciness: 14,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.spring(anim.dotScale, {
            toValue: 1,
            speed: 20,
            bounciness: 8,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]),
      ]).start();
    },
    [getBlockAnim]
  );

  const animateShake = useCallback(
    (idx: number) => {
      const anim = getBlockAnim(idx);
      if (!anim) return;
      anim.shakeX.stopAnimation();
      anim.shakeX.setValue(0);
      Animated.sequence([
        Animated.timing(anim.shakeX, {
          toValue: -8,
          duration: 55,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(anim.shakeX, {
          toValue: 8,
          duration: 55,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(anim.shakeX, {
          toValue: -5,
          duration: 50,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(anim.shakeX, {
          toValue: 5,
          duration: 50,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(anim.shakeX, {
          toValue: 0,
          duration: 45,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]).start();
    },
    [getBlockAnim]
  );

  const playTargetWord = useCallback(() => {
    if (onPlayWord) {
      void onPlayWord();
    } else if (word) {
      void playNormal(word, { key: `rhythm:quiz:${word}` });
    }
  }, [onPlayWord, playNormal, word]);

  const handleToggleQuizMode = useCallback(() => {
    rhythmSessionRef.current += 1;
    setRhythmIndex(null);
    stop();

    if (quizMode) {
      triggerLightHaptic();
      setQuizMode(false);
      setQuizState('asking');
      setWrongIdx(null);
      setCorrectIdx(null);
      return;
    }

    triggerLightHaptic();
    clearRhythmTimers();
    setQuizMode(true);
    setQuizState('asking');
    setWrongIdx(null);
    setCorrectIdx(null);
    scheduleTimer(() => {
      playTargetWord();
    }, 120);
  }, [clearRhythmTimers, playTargetWord, quizMode, scheduleTimer, stop]);

  const handleRestartQuiz = useCallback(() => {
    triggerLightHaptic();
    setQuizState('asking');
    setWrongIdx(null);
    setCorrectIdx(null);
    playTargetWord();
  }, [playTargetWord]);

  const handleRevealQuiz = useCallback(() => {
    triggerLightHaptic();
    setQuizState('revealed');
    setWrongIdx(null);
    const firstPrimary = primaryIndices[0];
    if (typeof firstPrimary === 'number') {
      setCorrectIdx(firstPrimary);
      animateBounce(firstPrimary, 'primary');
    }
    playTargetWord();
  }, [animateBounce, playTargetWord, primaryIndices]);

  const handleSyllableTap = useCallback(
    (syl: SyllableItem, idx: number) => {
      clearRhythmTimers();
      setRhythmIndex(null);

      // 강세 퀴즈 풀이 중이라면 정답 판정 인터랙션 수행
      if (isQuizHidingStress) {
        if (syl.stress === 'primary') {
          triggerSuccessHaptic();
          setQuizState('correct');
          setWrongIdx(null);
          setCorrectIdx(idx);
          animateBounce(idx, 'primary');
          void playSlow(syl.text, { key: `rhythm:syl:${idx}:${syl.text}` });
        } else {
          triggerErrorHaptic();
          setQuizState('wrong');
          setWrongIdx(idx);
          animateShake(idx);
        }
        return;
      }

      if (syl.stress === 'primary') {
        triggerMediumHaptic();
      } else {
        triggerLightHaptic();
      }
      animateBounce(idx, syl.stress);
      void playSlow(syl.text, { key: `rhythm:syl:${idx}:${syl.text}` });
    },
    [animateBounce, animateShake, clearRhythmTimers, isQuizHidingStress, playSlow]
  );

  const handleRhythmPlay = useCallback(() => {
    if (isQuizHidingStress) {
      playTargetWord();
      return;
    }

    clearRhythmTimers();
    const session = rhythmSessionRef.current;
    stop();

    let cumulativeDelay = 100;

    syllables.forEach((syl, idx) => {
      const delay = cumulativeDelay;

      scheduleTimer(() => {
        if (rhythmSessionRef.current !== session) return;
        setRhythmIndex(idx);
        if (syl.stress === 'primary') {
          triggerMediumHaptic();
        } else {
          triggerLightHaptic();
        }
        animateBounce(idx, syl.stress);
        void playSlow(syl.text, { key: `rhythm:seq:${idx}:${syl.text}` });
      }, delay);

      const duration =
        syl.stress === 'primary'
          ? 750
          : syl.stress === 'secondary'
            ? 600
            : syl.isSchwa
              ? 450
              : 500;
      cumulativeDelay += duration;
    });

    scheduleTimer(() => {
      if (rhythmSessionRef.current !== session) return;
      setRhythmIndex(null);
    }, cumulativeDelay + 400);
  }, [animateBounce, clearRhythmTimers, isQuizHidingStress, playSlow, playTargetWord, scheduleTimer, stop, syllables]);

  const isRhythmPlaying = rhythmIndex !== null;

  return (
    <View style={styles.container}>
      {/* 상단 강약 박자 리듬 요약 (● ⬤ ●) + 강세 퀴즈 / 리듬 듣기 버튼 */}
      <View style={styles.rhythmBar}>
        <View style={styles.rhythmBarLeft}>
          <Text style={styles.rhythmBarLabel} maxFontSizeMultiplier={1.4}>
            강약 리듬 박자
          </Text>
          <InfoTipButton
            open={showTip}
            onToggle={() => setShowTip((prev) => !prev)}
            accessibilityLabel="음절 리듬 사용법 보기"
          />
          <View style={styles.dotsRow}>
            {syllables.map((syl, idx) => {
              const isPrimary = syl.stress === 'primary';
              const isSecondary = syl.stress === 'secondary';
              const isActive = rhythmIndex === idx;
              const anim = blockAnims[idx];
              return (
                <Animated.View
                  key={`dot-${idx}-${syl.text}`}
                  style={anim ? { transform: [{ scale: anim.dotScale }] } : undefined}
                >
                  <Text
                    style={[
                      isQuizHidingStress
                        ? styles.dotHidden
                        : isPrimary
                          ? styles.dotPrimary
                          : isSecondary
                            ? styles.dotSecondary
                            : styles.dotNormal,
                      isActive && styles.dotActive,
                    ]}
                    maxFontSizeMultiplier={1.25}
                    accessibilityLabel={
                      isQuizHidingStress
                        ? '퀴즈 박자'
                        : isPrimary
                          ? '강세 박자'
                          : isSecondary
                            ? '보조 강세 박자'
                            : '약한 박자'
                    }
                  >
                    {isQuizHidingStress ? '?' : isPrimary ? '⬤' : '●'}
                  </Text>
                </Animated.View>
              );
            })}
          </View>
        </View>

        <View style={styles.barActionsRow}>
          {canQuiz ? (
            <Pressable
              onPress={handleToggleQuizMode}
              style={({ pressed }) => [
                styles.quizToggleBtn,
                quizMode && styles.quizToggleBtnActive,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: quizMode }}
              accessibilityLabel={quizMode ? '강세 퀴즈 종료' : '강세 맞추기 퀴즈 시작'}
            >
              <Sparkle
                size={15}
                color={quizMode ? COLORS.white : COLORS.purpleText}
                weight={quizMode ? 'fill' : 'regular'}
              />
              <Text
                style={[
                  styles.quizToggleText,
                  quizMode && styles.quizToggleTextActive,
                ]}
                maxFontSizeMultiplier={1.2}
              >
                {quizMode ? '퀴즈 끄기' : '강세 퀴즈'}
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={handleRhythmPlay}
            style={({ pressed }) => [
              styles.rhythmPlayBtn,
              isRhythmPlaying && styles.rhythmPlayBtnActive,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              isQuizHidingStress ? '전체 단어 다시 듣기' : '음절별 리듬으로 연속 듣기'
            }
          >
            {isRhythmPlaying ? (
              <MusicNote size={17} color={COLORS.white} />
            ) : (
              <Play size={17} color={COLORS.accentText} />
            )}
            <Text
              style={[
                styles.rhythmPlayBtnText,
                isRhythmPlaying && styles.rhythmPlayBtnTextActive,
              ]}
              maxFontSizeMultiplier={1.25}
            >
              {isQuizHidingStress
                ? '다시 듣기'
                : isRhythmPlaying
                  ? '재생 중...'
                  : '리듬 듣기'}
            </Text>
          </Pressable>
        </View>
      </View>

      <InfoTipBox
        visible={showTip}
        text="각 음절 카드를 누르면 해당 음절 소리를 따로 들어볼 수 있어요. 강세 퀴즈를 켜면 귀로 강세를 직접 맞출 수 있어요."
        onClose={() => setShowTip(false)}
      />

      {/* 강세 퀴즈 상태 안내 배너 */}
      {quizMode ? (
        <View
          style={[
            styles.quizBanner,
            quizState === 'correct' && styles.quizBannerSuccess,
            quizState === 'wrong' && styles.quizBannerWrong,
          ]}
        >
          <View style={styles.quizBannerTextCol}>
            <View style={styles.quizBannerTitleRow}>
              {quizState === 'correct' ? (
                <CheckCircle size={18} color={COLORS.successText} weight="fill" />
              ) : (
                <Sparkle
                  size={17}
                  color={quizState === 'wrong' ? COLORS.roseText : COLORS.purpleText}
                />
              )}
              <Text
                style={[
                  styles.quizBannerText,
                  quizState === 'correct' && styles.quizBannerTextSuccess,
                  quizState === 'wrong' && styles.quizBannerTextWrong,
                ]}
                maxFontSizeMultiplier={1.35}
              >
                {quizState === 'asking'
                  ? '어디가 가장 세게 들렸나요? 음절 카드를 눌러 보세요!'
                  : quizState === 'wrong'
                    ? '조금 아쉬워요! 다시 들어보고 다른 음절을 눌러 보세요.'
                    : quizState === 'correct'
                      ? `정답이에요! '${syllables[correctIdx ?? primaryIndices[0]]?.text ?? ''}' 부분을 가장 세게 읽어요.`
                      : `'${syllables[primaryIndices[0]]?.text ?? ''}' 음절에 가장 강한 강세가 있어요.`}
              </Text>
            </View>
          </View>

          {quizState === 'wrong' ? (
            <Pressable
              onPress={handleRevealQuiz}
              style={({ pressed }) => [styles.quizMiniActionBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="강세 정답 보기"
            >
              <Text style={styles.quizMiniActionText} maxFontSizeMultiplier={1.2}>
                정답 보기
              </Text>
            </Pressable>
          ) : quizState === 'correct' || quizState === 'revealed' ? (
            <Pressable
              onPress={handleRestartQuiz}
              style={({ pressed }) => [
                styles.quizMiniActionBtn,
                styles.quizMiniActionBtnSuccess,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="강세 퀴즈 다시 풀기"
            >
              <Text
                style={[
                  styles.quizMiniActionText,
                  styles.quizMiniActionTextSuccess,
                ]}
                maxFontSizeMultiplier={1.2}
              >
                다시 풀기
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* 음절별 리듬 블록 카드 (스프링 바운스 + 터치 인터랙티브) */}
      <View style={styles.blocksRow}>
        {syllables.map((syl, idx) => {
          const isPrimary = syl.stress === 'primary';
          const isSecondary = syl.stress === 'secondary';
          const isSchwa = Boolean(syl.isSchwa);
          const isSylActive =
            activeKey === `rhythm:syl:${idx}:${syl.text}` ||
            activeKey === `rhythm:seq:${idx}:${syl.text}`;
          const isQuizCorrectBlock =
            quizMode && (quizState === 'correct' || quizState === 'revealed') && isPrimary;
          const isQuizWrongBlock = quizMode && quizState === 'wrong' && wrongIdx === idx;
          const anim = blockAnims[idx];

          return (
            <Animated.View
              key={`syl-${idx}-${syl.text}`}
              style={[
                styles.blockAnimWrap,
                !isQuizHidingStress && isPrimary && styles.blockAnimWrapPrimary,
                anim
                  ? {
                      transform: [
                        { translateY: anim.liftY },
                        { translateX: anim.shakeX },
                        { scale: anim.scale },
                      ],
                    }
                  : undefined,
              ]}
            >
              <Tap
                onPress={() => handleSyllableTap(syl, idx)}
                style={[
                  styles.block,
                  !isQuizHidingStress && isPrimary && styles.blockPrimary,
                  !isQuizHidingStress && !isPrimary && isSecondary && styles.blockSecondary,
                  !isQuizHidingStress && !isPrimary && !isSecondary && isSchwa && styles.blockSchwa,
                  isQuizHidingStress && styles.blockQuizNeutral,
                  isQuizWrongBlock && styles.blockQuizWrong,
                  isQuizCorrectBlock && styles.blockQuizCorrect,
                  !isQuizHidingStress && isSylActive && styles.blockActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel={
                  isQuizHidingStress
                    ? `${syl.text} 음절을 강세 정답으로 선택`
                    : `${syl.text} 음절 듣기, ${isPrimary ? '강세' : isSecondary ? '보조 강세' : '약한'} 음절`
                }
              >
                {/* 음절 상단 박자 배지 */}
                {isQuizHidingStress ? (
                  <View style={styles.quizBadge}>
                    <Text style={styles.quizBadgeText} maxFontSizeMultiplier={1.25}>
                      ? 선택
                    </Text>
                  </View>
                ) : isQuizCorrectBlock ? (
                  <View style={styles.correctTag}>
                    <Text style={styles.correctTagText} maxFontSizeMultiplier={1.25}>
                      ✓ 정답 강세
                    </Text>
                  </View>
                ) : isPrimary ? (
                  <View style={styles.primaryTag}>
                    <Text style={styles.primaryTagText} maxFontSizeMultiplier={1.3}>
                      ⬤ 강하게
                    </Text>
                  </View>
                ) : isSecondary ? (
                  <View style={styles.secondaryTag}>
                    <Text
                      style={styles.secondaryTagText}
                      maxFontSizeMultiplier={1.3}
                    >
                      ● 살짝 강하게
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.normalDotSmall}>●</Text>
                )}

                {/* 음절 영문 */}
                <Text
                  style={[
                    styles.syllableText,
                    !isQuizHidingStress && isPrimary && styles.syllableTextPrimary,
                    !isQuizHidingStress && !isPrimary && isSchwa && styles.syllableTextSchwa,
                    isQuizCorrectBlock && styles.syllableTextCorrect,
                    !isQuizHidingStress && isSylActive && styles.syllableTextActive,
                  ]}
                  maxFontSizeMultiplier={1.4}
                >
                  {syl.text}
                </Text>

                {/* 음절 IPA */}
                <Text
                  style={[
                    styles.syllableIpa,
                    !isQuizHidingStress && isPrimary && styles.syllableIpaPrimary,
                  ]}
                  maxFontSizeMultiplier={1.4}
                >
                  /{syl.ipa}/
                </Text>

                {/* 한글 발음 힌트 (토글 On일 때) */}
                {showKoHint ? (
                  <Text
                    style={[
                      styles.syllableKoHint,
                      !isQuizHidingStress && isPrimary && styles.syllableKoHintPrimary,
                    ]}
                    maxFontSizeMultiplier={1.4}
                  >
                    {syl.koHint}
                  </Text>
                ) : null}

                {/* 약화 모음(Schwa) 힌트 — 퀴즈 풀이 중에는 스포일러 방지 */}
                {!isQuizHidingStress && isSchwa ? (
                  <View style={styles.schwaBadge}>
                    <Text style={styles.schwaBadgeText} maxFontSizeMultiplier={1.3}>
                      힘 빼고 약하게 &apos;어&apos;
                    </Text>
                  </View>
                ) : null}

                {/* 소리 아이콘 */}
                {isQuizHidingStress ? null : isSylActive ? (
                  <SpeakerHigh
                    size={18}
                    color={COLORS.primary}
                    style={styles.speakerIcon}
                  />
                ) : (
                  <SpeakerLow
                    size={18}
                    color={isPrimary ? COLORS.accentText : COLORS.textMuted}
                    style={styles.speakerIcon}
                  />
                )}
              </Tap>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.sm,
  },
  rhythmBar: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  rhythmBarLeft: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  rhythmBarLabel: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.text,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 4,
  },
  dotPrimary: {
    fontSize: 20,
    color: COLORS.accentText,
  },
  dotSecondary: {
    fontSize: 16,
    color: COLORS.teal,
  },
  dotNormal: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  dotHidden: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.purpleText,
  },
  dotActive: {
    color: COLORS.primary,
  },
  barActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quizToggleBtn: {
    minHeight: TOUCH.minTarget,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.purpleSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quizToggleBtnActive: {
    backgroundColor: COLORS.purple,
  },
  quizToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.purpleText,
  },
  quizToggleTextActive: {
    color: COLORS.white,
  },
  rhythmPlayBtn: {
    minHeight: TOUCH.minTarget,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accentSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  rhythmPlayBtnActive: {
    backgroundColor: COLORS.accent,
  },
  rhythmPlayBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accentText,
  },
  rhythmPlayBtnTextActive: {
    color: COLORS.white,
  },
  quizBanner: {
    backgroundColor: COLORS.purpleSoft,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  quizBannerSuccess: {
    backgroundColor: COLORS.successSoft,
  },
  quizBannerWrong: {
    backgroundColor: COLORS.roseSoft,
  },
  quizBannerTextCol: {
    flex: 1,
  },
  quizBannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quizBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.purpleText,
    lineHeight: 19,
  },
  quizBannerTextSuccess: {
    color: COLORS.successText,
  },
  quizBannerTextWrong: {
    color: COLORS.roseText,
  },
  quizMiniActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.card,
  },
  quizMiniActionBtnSuccess: {
    backgroundColor: COLORS.card,
  },
  quizMiniActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.roseText,
  },
  quizMiniActionTextSuccess: {
    color: COLORS.successText,
  },
  blocksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingTop: 6,
  },
  blockAnimWrap: {
    minWidth: 84,
    flexGrow: 1,
  },
  blockAnimWrapPrimary: {
    minWidth: 96,
  },
  block: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 3,
  },
  blockPrimary: {
    backgroundColor: COLORS.accentSoft,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  blockSecondary: {
    backgroundColor: COLORS.tealSoft,
  },
  blockSchwa: {
    backgroundColor: COLORS.background,
    paddingVertical: 9,
  },
  blockQuizNeutral: {
    backgroundColor: COLORS.background,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  blockQuizWrong: {
    backgroundColor: COLORS.roseSoft,
  },
  blockQuizCorrect: {
    backgroundColor: COLORS.successSoft,
  },
  blockActive: {
    backgroundColor: COLORS.tint,
  },
  quizBadge: {
    backgroundColor: COLORS.purpleSoft,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 3,
  },
  quizBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.purpleText,
  },
  correctTag: {
    backgroundColor: COLORS.success,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 3,
  },
  correctTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  primaryTag: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 3,
  },
  primaryTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  secondaryTag: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 3,
  },
  secondaryTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.tealText,
  },
  normalDotSmall: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  syllableText: {
    fontSize: TYPOGRAPHY.syllableNormal,
    fontWeight: '500',
    color: COLORS.text,
  },
  syllableTextPrimary: {
    fontSize: TYPOGRAPHY.syllablePrimary,
    fontWeight: '700',
    color: COLORS.accentText,
  },
  syllableTextCorrect: {
    color: COLORS.successText,
  },
  syllableTextSchwa: {
    fontSize: TYPOGRAPHY.syllableSchwa,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  syllableTextActive: {
    color: COLORS.primary,
  },
  syllableIpa: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  syllableIpaPrimary: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.accentText,
  },
  syllableKoHint: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.text,
    marginTop: 2,
  },
  syllableKoHintPrimary: {
    fontSize: TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.accentText,
  },
  schwaBadge: {
    marginTop: 4,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  schwaBadgeText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  speakerIcon: {
    marginTop: 4,
  },
  pressed: {
    opacity: 0.82,
  },
});
