import { CheckCircle, MusicNote, Play, Sparkle, SpeakerHigh, SpeakerLow } from './PlumpIcons';
import { useFocusEffect } from 'expo-router';
import { type ComponentRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, type GestureResponderEvent, type LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
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
const SMOOTH_EASE = Easing.bezier(0.25, 0.1, 0.25, 1);

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
      const liftTarget = stress === 'primary' ? -16 : stress === 'secondary' ? -9 : -4;
      const scaleTarget = stress === 'primary' ? 1.1 : stress === 'secondary' ? 1.05 : 1.02;
      const dotTarget = stress === 'primary' ? 2.0 : stress === 'secondary' ? 1.5 : 1.2;
      const upDuration = stress === 'primary' ? 220 : stress === 'secondary' ? 180 : 150;
      const downDuration = stress === 'primary' ? 400 : stress === 'secondary' ? 340 : 280;

      anim.liftY.stopAnimation();
      anim.scale.stopAnimation();
      anim.dotScale.stopAnimation();

      Animated.parallel([
        Animated.sequence([
          Animated.timing(anim.liftY, {
            toValue: liftTarget,
            duration: upDuration,
            easing: Easing.out(Easing.quad),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(anim.liftY, {
            toValue: 0,
            duration: downDuration,
            easing: SMOOTH_EASE,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]),
        Animated.sequence([
          Animated.timing(anim.scale, {
            toValue: scaleTarget,
            duration: upDuration,
            easing: Easing.out(Easing.quad),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(anim.scale, {
            toValue: 1,
            duration: downDuration,
            easing: SMOOTH_EASE,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]),
        Animated.sequence([
          Animated.timing(anim.dotScale, {
            toValue: dotTarget,
            duration: upDuration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(anim.dotScale, {
            toValue: 1,
            duration: downDuration + 80,
            easing: SMOOTH_EASE,
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

  // --- 블렌딩(이어읽기): 전체 단어를 보통 속도로 재생하면서 음절 순차 하이라이트 ---
  const handleBlendPlay = useCallback(() => {
    if (isQuizHidingStress) return;
    clearRhythmTimers();
    const session = rhythmSessionRef.current;
    stop();

    const totalSyllables = syllables.length;
    const avgDuration = 600 / totalSyllables;
    let cumulativeDelay = 50;

    syllables.forEach((syl, idx) => {
      const delay = cumulativeDelay;
      const holdTime =
        syl.stress === 'primary'
          ? avgDuration * 1.6
          : syl.stress === 'secondary'
            ? avgDuration * 1.2
            : avgDuration * 0.8;

      scheduleTimer(() => {
        if (rhythmSessionRef.current !== session) return;
        setRhythmIndex(idx);
        if (syl.stress === 'primary') {
          triggerMediumHaptic();
        } else {
          triggerLightHaptic();
        }
        animateBounce(idx, syl.stress);
      }, delay);

      cumulativeDelay += holdTime;
    });

    playTargetWord();

    scheduleTimer(() => {
      if (rhythmSessionRef.current !== session) return;
      setRhythmIndex(null);
    }, cumulativeDelay + 300);
  }, [animateBounce, clearRhythmTimers, isQuizHidingStress, playTargetWord, scheduleTimer, stop, syllables]);

  // --- 스와이프 따라가기: 손가락 위치에 따라 해당 음절 재생 ---
  const blockLayoutsRef = useRef<number[]>([]);
  const swipeActiveRef = useRef<number>(-1);

  const handleBlockLayout = useCallback(
    (idx: number, e: LayoutChangeEvent) => {
      const { x, width } = e.nativeEvent.layout;
      blockLayoutsRef.current[idx] = x + width / 2;
    },
    []
  );

  const findSyllableAtX = useCallback(
    (pageX: number, containerX: number) => {
      const relX = pageX - containerX;
      const centers = blockLayoutsRef.current;
      if (centers.length === 0) return -1;

      let closest = 0;
      let minDist = Math.abs(relX - (centers[0] ?? 0));
      for (let i = 1; i < centers.length; i++) {
        const dist = Math.abs(relX - (centers[i] ?? 0));
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      }
      return closest;
    },
    []
  );

  const blocksRowRef = useRef<ComponentRef<typeof View>>(null);
  const containerXRef = useRef(0);
  const touchStartXRef = useRef<number | null>(null);

  const handleBlocksRowLayout = useCallback(() => {
    blocksRowRef.current?.measureInWindow((x: number) => {
      containerXRef.current = x;
    });
  }, []);

  const handleTouchStart = useCallback((evt: GestureResponderEvent) => {
    touchStartXRef.current = evt.nativeEvent.pageX;
  }, []);

  const handleStartShouldSetResponder = useCallback(
    () => !isQuizHidingStress && !quizMode,
    [isQuizHidingStress, quizMode]
  );

  const handleMoveShouldSetResponder = useCallback(
    (evt: GestureResponderEvent) => {
      if (isQuizHidingStress || quizMode) return false;
      const startX = touchStartXRef.current;
      return startX !== null && Math.abs(evt.nativeEvent.pageX - startX) > 8;
    },
    [isQuizHidingStress, quizMode]
  );

  const handleSwipeGrant = useCallback(
    (evt: GestureResponderEvent) => {
      const pageX = evt.nativeEvent.pageX;
      touchStartXRef.current = pageX;
      swipeActiveRef.current = -1;
      clearRhythmTimers();
      stop();
      const idx = findSyllableAtX(pageX, containerXRef.current);
      if (idx >= 0 && idx < syllables.length) {
        swipeActiveRef.current = idx;
        setRhythmIndex(idx);
        const syl = syllables[idx];
        animateBounce(idx, syl.stress);
        if (syl.stress === 'primary') triggerMediumHaptic();
        else triggerLightHaptic();
        void playSlow(syl.text, { key: `rhythm:swipe:${idx}:${syl.text}` });
      }
    },
    [animateBounce, clearRhythmTimers, findSyllableAtX, playSlow, stop, syllables]
  );

  const handleSwipeMove = useCallback(
    (evt: GestureResponderEvent) => {
      const idx = findSyllableAtX(evt.nativeEvent.pageX, containerXRef.current);
      if (idx >= 0 && idx < syllables.length && idx !== swipeActiveRef.current) {
        swipeActiveRef.current = idx;
        setRhythmIndex(idx);
        const syl = syllables[idx];
        animateBounce(idx, syl.stress);
        if (syl.stress === 'primary') triggerMediumHaptic();
        else triggerLightHaptic();
        void playSlow(syl.text, { key: `rhythm:swipe:${idx}:${syl.text}` });
      }
    },
    [animateBounce, findSyllableAtX, playSlow, syllables]
  );

  const handleSwipeRelease = useCallback(() => {
    touchStartXRef.current = null;
    swipeActiveRef.current = -1;
    scheduleTimer(() => setRhythmIndex(null), 400);
  }, [scheduleTimer]);

  const isRhythmPlaying = rhythmIndex !== null;

  return (
    <View style={styles.container}>
      {/* 상단 강약 박자 리듬 요약 + 강세 퀴즈 / 리듬 듣기 버튼 */}
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
              const isPast = rhythmIndex !== null && idx < rhythmIndex;
              const anim = blockAnims[idx];
              return (
                <View key={`dot-wrap-${idx}-${syl.text}`} style={styles.dotWithLine}>
                  {idx > 0 && (
                    <View
                      style={[
                        styles.dotConnector,
                        (isActive || isPast) && styles.dotConnectorActive,
                      ]}
                    />
                  )}
                  <Animated.View
                    style={anim ? { transform: [{ scale: anim.dotScale }] } : undefined}
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
                    {isQuizHidingStress ? (
                      <Text style={styles.dotHidden} maxFontSizeMultiplier={1.25}>?</Text>
                    ) : (
                      <View
                        style={[
                          isPrimary
                            ? styles.dotPrimary
                            : isSecondary
                              ? styles.dotSecondary
                              : styles.dotNormal,
                          isActive && styles.dotActive,
                        ]}
                      />
                    )}
                  </Animated.View>
                </View>
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

          {!isQuizHidingStress && word ? (
            <Pressable
              onPress={handleBlendPlay}
              style={({ pressed }) => [
                styles.blendPlayBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="이어서 자연스럽게 듣기"
            >
              <SpeakerHigh size={15} color={COLORS.tealText} />
              <Text
                style={styles.blendPlayBtnText}
                maxFontSizeMultiplier={1.25}
              >
                이어 듣기
              </Text>
            </Pressable>
          ) : null}
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

      {/* 음절별 리듬 블록 카드 (스와이프 따라가기 + 터치) */}
      <View
        ref={blocksRowRef}
        style={styles.blocksRow}
        onLayout={handleBlocksRowLayout}
        onTouchStart={handleTouchStart}
        onStartShouldSetResponder={handleStartShouldSetResponder}
        onMoveShouldSetResponder={handleMoveShouldSetResponder}
        onResponderGrant={handleSwipeGrant}
        onResponderMove={handleSwipeMove}
        onResponderRelease={handleSwipeRelease}
        onResponderTerminate={handleSwipeRelease}
      >
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
              onLayout={(e) => handleBlockLayout(idx, e)}
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
                  !isQuizHidingStress && !isPrimary && !isSecondary && !isSchwa && styles.blockWeak,
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
                    <View style={styles.tagDotPrimary} />
                    <Text style={styles.primaryTagText} maxFontSizeMultiplier={1.3}>
                      강하게
                    </Text>
                  </View>
                ) : isSecondary ? (
                  <View style={styles.secondaryTag}>
                    <View style={styles.tagDotSecondary} />
                    <Text
                      style={styles.secondaryTagText}
                      maxFontSizeMultiplier={1.3}
                    >
                      중간
                    </Text>
                  </View>
                ) : (
                  <View style={styles.normalTag}>
                    <View style={styles.tagDotNormal} />
                  </View>
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
    marginLeft: 4,
  },
  dotWithLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotConnector: {
    width: 8,
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.disabled,
    marginHorizontal: 1,
  },
  dotConnectorActive: {
    backgroundColor: '#FF6B6B',
  },
  dotPrimary: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FF6B6B',
    ...Platform.select({
      ios: { shadowColor: '#FF6B6B', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  dotSecondary: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.teal,
  },
  dotNormal: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.textMuted,
  },
  dotHidden: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.purpleText,
  },
  dotActive: {
    backgroundColor: '#FF4757',
    ...Platform.select({
      ios: { shadowColor: '#FF4757', shadowOpacity: 0.8, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
      android: { elevation: 5 },
    }),
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
  blendPlayBtn: {
    minHeight: TOUCH.minTarget,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.tealSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  blendPlayBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.tealText,
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
  blockWeak: {
    opacity: 0.7,
  },
  blockSchwa: {
    backgroundColor: COLORS.background,
    paddingVertical: 9,
    opacity: 0.55,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 3,
  },
  tagDotPrimary: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
  },
  primaryTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  secondaryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 3,
  },
  tagDotSecondary: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.teal,
  },
  secondaryTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.tealText,
  },
  normalTag: {
    alignItems: 'center',
    marginBottom: 3,
  },
  tagDotNormal: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.textMuted,
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
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  syllableIpaPrimary: {
    fontSize: 15,
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
