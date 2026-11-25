import {
  CaretRight,
  CheckCircle,
  EyeSlash,
  GitDiff,
  Microphone,
  ShieldCheck,
  Sparkle,
  SpeakerHigh,
  StopCircle,
  User,
  WarningCircle,
  X,
} from './PlumpIcons';
import { useCallback, useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePronunciationPractice } from '../hooks/usePronunciationPractice';
import { COLORS, LAYOUT, RADIUS, SHADOW, SPACING, TOUCH, TYPOGRAPHY } from '../theme/tokens';
import { triggerLightHaptic, triggerMediumHaptic, triggerSuccessHaptic } from '../utils/haptics';
import { InfoTipBox, InfoTipButton } from './InfoTip';
import { SpringSheet } from './SpringMotion';
import { Tap } from './Tap';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

type MasteryStep = '1a' | '1b' | '2' | '3' | 'done';

const MASTERY_STEP_LABELS: Record<MasteryStep, string> = {
  '1a': '가볍게 2번만 따라 말해볼까요? (1/2)',
  '1b': '가볍게 2번만 따라 말해볼까요? (2/2)',
  '2': '이제 한글 발음을 가렸어요. 떠올려서 말해보세요',
  '3': '마지막! 짧은 문장에 넣어서 한 번 더',
  done: '입에 한 겹 붙었어요!',
};

export interface PronunciationPracticeCardProps {
  word: string;
  ipa?: string;
  syllableCount: number;
  onPlayNative: () => void | Promise<void>;
  onStopNative: () => void;
  /** 모달 바텀시트 내부에 들어갈 때 바깥 카드 그림자/패딩을 줄임 */
  embedded?: boolean;
  /** 한국어 발음 힌트 — 있으면 3-Step 「입에 붙이기」 마스터리 모드 활성화 */
  koPronunciation?: string;
  /** Step 3에서 보여줄 예문 (없으면 Step 3 스킵) */
  exampleSentence?: string;
  /** Step 3 예문 원어민 재생 콜백 */
  onPlayExample?: () => void | Promise<void>;
  /** 마스터리 완료 시 콜백 */
  onMasteryComplete?: () => void;
}

const WAVE_BAR_FACTORS = [0.42, 0.72, 0.95, 1.0, 0.88, 0.65, 0.4];

export function PronunciationPracticeCard({
  word,
  ipa,
  syllableCount,
  onPlayNative,
  onStopNative,
  embedded = false,
  koPronunciation,
  exampleSentence,
  onPlayExample,
  onMasteryComplete,
}: PronunciationPracticeCardProps) {
  const [showGuide, setShowGuide] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);

  const isMasteryMode = Boolean(koPronunciation);
  const [masteryStep, setMasteryStep] = useState<MasteryStep>('1a');
  const [prevWord, setPrevWord] = useState(word);
  if (prevWord !== word) {
    setPrevWord(word);
    setMasteryStep('1a');
  }
  const hasExampleSentence = Boolean(exampleSentence);
  const isSentenceStep = isMasteryMode && masteryStep === '3' && Boolean(exampleSentence);
  const activeTargetText = isSentenceStep && exampleSentence ? exampleSentence : word;
  const activeSyllableCount =
    isSentenceStep && exampleSentence
      ? Math.max(syllableCount, exampleSentence.trim().split(/\s+/).length)
      : syllableCount;
  const activePlayNative =
    isSentenceStep && onPlayExample ? onPlayExample : onPlayNative;

  const {
    isRecording,
    isPlayingUser,
    isComparing,
    comparePhase,
    micLevel,
    hasRecording,
    evaluation,
    liveTranscript,
    errorMessage,
    startRecording,
    stopRecording,
    playUserRecording,
    playCompareWithNative,
    resetPractice,
  } = usePronunciationPractice({
    targetWord: activeTargetText,
    syllableCount: activeSyllableCount,
    onPlayNative: activePlayNative,
    onStopNative,
  });

  const activeSteps: MasteryStep[] = hasExampleSentence
    ? ['1a', '1b', '2', '3']
    : ['1a', '1b', '2'];
  const showPracticeUI = !isMasteryMode || masteryStep !== 'done';

  const advanceMasteryStep = useCallback(() => {
    resetPractice();
    triggerLightHaptic();
    const stepOrder: MasteryStep[] = hasExampleSentence
      ? ['1a', '1b', '2', '3', 'done']
      : ['1a', '1b', '2', 'done'];
    const currentIdx = stepOrder.indexOf(masteryStep);
    const nextStep = stepOrder[currentIdx + 1] ?? 'done';
    if (nextStep === 'done') {
      onMasteryComplete?.();
      triggerSuccessHaptic();
    }
    setMasteryStep(nextStep);
  }, [hasExampleSentence, masteryStep, onMasteryComplete, resetPractice]);

  const handleRestartMastery = useCallback(() => {
    resetPractice();
    triggerLightHaptic();
    setMasteryStep('1a');
  }, [resetPractice]);

  const [prevEvaluation, setPrevEvaluation] = useState(evaluation);
  if (evaluation !== prevEvaluation) {
    setPrevEvaluation(evaluation);
    setDisplayScore(0);
  }

  // 녹음 중 코랄 펄스 링 2겹 애니메이션
  const [pulse1] = useState(() => new Animated.Value(0));
  const [pulse2] = useState(() => new Animated.Value(0));

  // 실시간 파형 7개 막대 scaleY 애니메이션
  const [waveScaleAnims] = useState(() =>
    WAVE_BAR_FACTORS.map(() => new Animated.Value(0.28))
  );

  // 점수 게이지 & 축하 스파클 애니메이션
  const [progressAnim] = useState(() => new Animated.Value(0));
  const [badgePopAnim] = useState(() => new Animated.Value(1));
  const [sparkleAnim] = useState(() => new Animated.Value(0));
  const [comparePulseAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!isRecording) {
      pulse1.stopAnimation();
      pulse2.stopAnimation();
      pulse1.setValue(0);
      pulse2.setValue(0);
      return;
    }

    const loop1 = Animated.loop(
      Animated.timing(pulse1, {
        toValue: 1,
        duration: 1400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: USE_NATIVE_DRIVER,
      })
    );
    const loop2 = Animated.loop(
      Animated.sequence([
        Animated.delay(550),
        Animated.timing(pulse2, {
          toValue: 1,
          duration: 1400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );
    loop1.start();
    loop2.start();

    return () => {
      loop1.stop();
      loop2.stop();
    };
  }, [isRecording, pulse1, pulse2]);

  useEffect(() => {
    if (!isRecording) return;
    const clampedLevel = Math.max(0.14, Math.min(1, micLevel));
    Animated.parallel(
      WAVE_BAR_FACTORS.map((factor, idx) =>
        Animated.spring(waveScaleAnims[idx], {
          toValue: Math.min(1, 0.22 + clampedLevel * factor * 0.85),
          speed: 24,
          bounciness: 6,
          useNativeDriver: USE_NATIVE_DRIVER,
        })
      )
    ).start();
  }, [isRecording, micLevel, waveScaleAnims]);

  // 평가 점수가 나오면 0 → score 카운트업 + 게이지 스무스 채우기 + excellent 축하 스파클
  useEffect(() => {
    const targetScore = evaluation?.score ?? 0;
    if (!evaluation || targetScore <= 0) {
      progressAnim.setValue(0);
      sparkleAnim.setValue(0);
      return;
    }

    const durationMs = 560;
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.round(targetScore * eased));
      if (t >= 1) {
        clearInterval(timer);
      }
    }, 24);

    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: targetScore / 100,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    badgePopAnim.setValue(0.84);
    Animated.spring(badgePopAnim, {
      toValue: 1,
      friction: 5,
      tension: 160,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();

    if (evaluation.grade === 'excellent') {
      triggerSuccessHaptic();
      sparkleAnim.setValue(0);
      Animated.sequence([
        Animated.spring(sparkleAnim, {
          toValue: 1,
          speed: 14,
          bounciness: 12,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.delay(700),
        Animated.timing(sparkleAnim, {
          toValue: 0,
          duration: 380,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]).start();
    } else {
      triggerLightHaptic();
    }

    return () => {
      clearInterval(timer);
    };
  }, [badgePopAnim, evaluation, progressAnim, sparkleAnim]);

  // 비교 듣기 중 현재 말하는 차례 카드에 은은한 숨쉬기 펄스
  useEffect(() => {
    if (!isComparing || comparePhase === 'idle') {
      comparePulseAnim.stopAnimation();
      comparePulseAnim.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(comparePulseAnim, {
          toValue: 1.04,
          duration: 420,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(comparePulseAnim, {
          toValue: 1,
          duration: 420,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [comparePhase, comparePulseAnim, isComparing]);

  const scoreBarColor =
    evaluation?.grade === 'excellent'
      ? COLORS.success
      : evaluation?.grade === 'good'
        ? COLORS.primary
        : COLORS.gold;

  const scoreBadgeBg =
    evaluation?.grade === 'excellent'
      ? COLORS.successSoft
      : evaluation?.grade === 'good'
        ? COLORS.tint
        : COLORS.goldSoft;

  const scoreBadgeTextColor =
    evaluation?.grade === 'excellent'
      ? COLORS.successText
      : evaluation?.grade === 'good'
        ? COLORS.primaryDark
        : COLORS.goldText;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const pulse1Scale = pulse1.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 2.05],
  });
  const pulse1Opacity = pulse1.interpolate({
    inputRange: [0, 0.25, 1],
    outputRange: [0.34, 0.22, 0],
  });
  const pulse2Scale = pulse2.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1.85],
  });
  const pulse2Opacity = pulse2.interpolate({
    inputRange: [0, 0.25, 1],
    outputRange: [0.28, 0.18, 0],
  });

  const sparkleLift = sparkleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [6, -6],
  });

  return (
    <View style={[styles.card, embedded && styles.cardEmbedded]}>
      {/* 상단 제목 + 정보 i 아이콘 + 미저장 안심 배지 */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.4}>
            {isMasteryMode ? '입에 붙이기' : '따라 말하며 내 발음 비교'}
          </Text>
          <InfoTipButton
            open={showGuide}
            onToggle={() => setShowGuide((prev) => !prev)}
            accessibilityLabel="따라 말하기 안내 보기"
          />
        </View>
        <View style={styles.privacyPill}>
          <ShieldCheck size={15} color={COLORS.textMuted} />
          <Text style={styles.privacyPillText} maxFontSizeMultiplier={1.25}>
            저장 안 됨
          </Text>
        </View>
      </View>

      <InfoTipBox visible={showGuide} onClose={() => setShowGuide(false)}>
        <Text style={styles.guideText} maxFontSizeMultiplier={1.4}>
          {isMasteryMode
            ? '10번 보고 따라 읽는 것보다, 2번 익힌 뒤 가리고 1번 떠올려 말하고 며칠 뒤 다시 꺼내는 것이 훨씬 오래 남아요.'
            : <>마이크를 누르고 <Text style={styles.guideWordHighlight}>{word}</Text>
              {ipa ? ` (${ipa})` : ''} 소리를 말해 보세요. 내 목소리를 바로 들어보고 원어민
              발음과 얼마나 비슷한지 비교할 수 있어요.</>}
        </Text>
      </InfoTipBox>

      {/* 마스터리 단계 표시 */}
      {isMasteryMode && masteryStep !== 'done' ? (
        <View style={styles.masteryStepArea}>
          <View style={styles.stepDotsRow}>
            {activeSteps.map((s) => (
              <View
                key={s}
                style={[
                  styles.stepDot,
                  activeSteps.indexOf(s) < activeSteps.indexOf(masteryStep) && styles.stepDotDone,
                  s === masteryStep && styles.stepDotCurrent,
                ]}
              />
            ))}
          </View>
          <Text style={styles.stepLabel} maxFontSizeMultiplier={1.35}>
            {MASTERY_STEP_LABELS[masteryStep]}
          </Text>
          {masteryStep !== '3' ? (
            <View style={styles.koPronDisplay}>
              {masteryStep === '2' ? (
                <View style={styles.koPronBlurWrap}>
                  <EyeSlash size={16} color={COLORS.textMuted} />
                  <Text style={styles.koPronBlurText} maxFontSizeMultiplier={1.3}>
                    ● ● ● ●
                  </Text>
                </View>
              ) : (
                <Text style={styles.koPronVisibleText} maxFontSizeMultiplier={1.3}>
                  {koPronunciation}
                </Text>
              )}
            </View>
          ) : exampleSentence ? (
            <View style={styles.sentenceDisplay}>
              <Text style={styles.sentenceText} maxFontSizeMultiplier={1.3}>
                {exampleSentence}
              </Text>
              {onPlayExample ? (
                <Tap
                  feel="snappy"
                  onPress={() => void onPlayExample()}
                  style={styles.sentenceListenBtn}
                  accessibilityRole="button"
                  accessibilityLabel="예문 먼저 들어보기"
                >
                  <SpeakerHigh size={15} color={COLORS.primaryDark} />
                  <Text style={styles.sentenceListenText} maxFontSizeMultiplier={1.2}>
                    문장 먼저 듣기
                  </Text>
                </Tap>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* 메인 마이크 시작/중지 버튼 */}
      {showPracticeUI && (
      <Tap
        feel="snappy"
        haptic={false}
        onPress={() => {
          triggerMediumHaptic();
          if (isRecording) {
            void stopRecording();
          } else {
            void startRecording();
          }
        }}
        style={[
          styles.micButton,
          isRecording && styles.micButtonRecording,
        ]}
        accessibilityRole="button"
        accessibilityLabel={
          isRecording ? '말하기 끝내고 발음 비교하기' : `${activeTargetText} 따라 말하기 시작`
        }
      >
        {isRecording ? (
          <StopCircle size={26} color={COLORS.white} weight="fill" />
        ) : (
          <Microphone size={26} color={COLORS.white} />
        )}
        <Text style={styles.micButtonText} maxFontSizeMultiplier={1.35}>
          {isRecording
            ? '듣고 있어요 · 다 말하면 누르기'
            : hasRecording
              ? '다시 따라 말하기'
              : isSentenceStep
                ? '마이크 눌러 문장 말하기'
                : '마이크 눌러 따라 말하기'}
        </Text>
      </Tap>
      )}

      {/* 녹음 중 코랄 펄스 링 + 실시간 애니메이션 파형 + 인식 프리뷰 */}
      {showPracticeUI && isRecording ? (
        <View style={styles.recordingBox}>
          <View style={styles.recordingVisualRow}>
            <View style={styles.pulseOrbWrap}>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.pulseRing,
                  {
                    opacity: pulse1Opacity,
                    transform: [{ scale: pulse1Scale }],
                  },
                ]}
              />
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.pulseRing,
                  {
                    opacity: pulse2Opacity,
                    transform: [{ scale: pulse2Scale }],
                  },
                ]}
              />
              <View style={styles.pulseCore}>
                <Microphone size={18} color={COLORS.white} weight="fill" />
              </View>
            </View>

            <View style={styles.waveRow}>
              {WAVE_BAR_FACTORS.map((_, idx) => (
                <Animated.View
                  key={`wave-${idx}`}
                  style={[
                    styles.waveBar,
                    {
                      transform: [{ scaleY: waveScaleAnims[idx] }],
                    },
                  ]}
                />
              ))}
            </View>
          </View>
          <Text style={styles.recordingHint} maxFontSizeMultiplier={1.35}>
            {liveTranscript
              ? `들리는 소리: "${liveTranscript}"`
              : isSentenceStep
                ? '짧은 문장을 편안하게 한 번 말해 보세요 (자동으로 멈춰요)'
                : `'${word}'를 편안하게 한 번 말해 보세요 (자동으로 멈춰요)`}
          </Text>
        </View>
      ) : null}

      {/* 권한/오류 안내 */}
      {showPracticeUI && errorMessage ? (
        <View style={styles.errorBox}>
          <WarningCircle size={20} color={COLORS.roseText} />
          <Text style={styles.errorText} maxFontSizeMultiplier={1.4}>
            {errorMessage}
          </Text>
        </View>
      ) : null}

      {/* 발음 유사도 비교 결과 + 내 목소리/원어민 비교 재생 */}
      {showPracticeUI && !isRecording && (evaluation || hasRecording) ? (
        <View style={styles.resultCard}>
          {evaluation ? (
            <View style={styles.scoreSection}>
              <View style={styles.scoreHeaderRow}>
                <View style={styles.scoreHeadlineCol}>
                  <View style={styles.headlineSparkleRow}>
                    <Text style={styles.scoreHeadline} maxFontSizeMultiplier={1.4}>
                      {evaluation.headlineKo}
                    </Text>
                    {evaluation.grade === 'excellent' ? (
                      <Animated.View
                        pointerEvents="none"
                        style={{
                          opacity: sparkleAnim,
                          transform: [
                            { translateY: sparkleLift },
                            { scale: sparkleAnim },
                          ],
                        }}
                      >
                        <Sparkle size={18} color={COLORS.gold} weight="fill" />
                      </Animated.View>
                    ) : null}
                  </View>
                  {evaluation.heardText ? (
                    <Text style={styles.heardText} maxFontSizeMultiplier={1.35}>
                      들린 발음:{' '}
                      <Text style={styles.heardWord}>{evaluation.heardText}</Text>
                    </Text>
                  ) : null}
                </View>

                {evaluation.score > 0 ? (
                  <Animated.View
                    style={[
                      styles.scoreBadge,
                      { backgroundColor: scoreBadgeBg },
                      { transform: [{ scale: badgePopAnim }] },
                    ]}
                  >
                    <Text
                      style={[
                        styles.scoreBadgeLabel,
                        { color: scoreBadgeTextColor },
                      ]}
                      maxFontSizeMultiplier={1.25}
                    >
                      {evaluation.mode === 'speech_recognition'
                        ? '유사도'
                        : '리듬도'}
                    </Text>
                    <Text
                      style={[
                        styles.scoreBadgeNumber,
                        { color: scoreBadgeTextColor },
                      ]}
                      maxFontSizeMultiplier={1.25}
                    >
                      {displayScore}%
                    </Text>
                  </Animated.View>
                ) : null}
              </View>

              {evaluation.score > 0 ? (
                <View style={styles.progressTrack}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: progressWidth,
                        backgroundColor: scoreBarColor,
                      },
                    ]}
                  />
                </View>
              ) : null}

              <Text style={styles.tipText} maxFontSizeMultiplier={1.4}>
                {evaluation.tipKo}
              </Text>
            </View>
          ) : null}

          {/* 원어민 ↔ 내 발음 비교 재생 중 차례 점등 표시 */}
          {isComparing ? (
            <View style={styles.compareStageRow}>
              <Animated.View
                style={[
                  styles.compareStagePill,
                  comparePhase === 'native' && styles.compareStagePillNativeActive,
                  comparePhase === 'native' && {
                    transform: [{ scale: comparePulseAnim }],
                  },
                ]}
              >
                <SpeakerHigh
                  size={15}
                  color={
                    comparePhase === 'native' ? COLORS.white : COLORS.textMuted
                  }
                />
                <Text
                  style={[
                    styles.compareStageText,
                    comparePhase === 'native' && styles.compareStageTextActive,
                  ]}
                  maxFontSizeMultiplier={1.2}
                >
                  1. 원어민
                </Text>
              </Animated.View>

              <Text style={styles.compareArrow}>→</Text>

              <Animated.View
                style={[
                  styles.compareStagePill,
                  comparePhase === 'user' && styles.compareStagePillUserActive,
                  comparePhase === 'user' && {
                    transform: [{ scale: comparePulseAnim }],
                  },
                ]}
              >
                <User
                  size={15}
                  color={comparePhase === 'user' ? COLORS.white : COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.compareStageText,
                    comparePhase === 'user' && styles.compareStageTextActive,
                  ]}
                  maxFontSizeMultiplier={1.2}
                >
                  2. 내 발음
                </Text>
              </Animated.View>
            </View>
          ) : null}

          {hasRecording ? (
            <View style={styles.playbackRow}>
              <Tap
                feel="snappy"
                haptic={false}
                onPress={() => {
                  triggerLightHaptic();
                  void playUserRecording();
                }}
                style={[
                  styles.playMineBtn,
                  isPlayingUser && !isComparing && styles.playMineBtnActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel="방금 내가 말한 목소리 들어보기"
              >
                <User
                  size={20}
                  color={
                    isPlayingUser && !isComparing
                      ? COLORS.white
                      : COLORS.tealText
                  }
                />
                <Text
                  style={[
                    styles.playMineBtnText,
                    isPlayingUser && !isComparing && styles.activeBtnText,
                  ]}
                  maxFontSizeMultiplier={1.3}
                >
                  {isPlayingUser && !isComparing ? '재생 중...' : '내 목소리 듣기'}
                </Text>
              </Tap>

              <Tap
                feel="snappy"
                haptic={false}
                onPress={() => {
                  triggerLightHaptic();
                  playCompareWithNative();
                }}
                style={[
                  styles.compareBtn,
                  isComparing && styles.compareBtnActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel="원어민 발음과 내 발음 연달아 비교해 듣기"
              >
                <GitDiff
                  size={20}
                  color={isComparing ? COLORS.white : COLORS.indigoText}
                />
                <Text
                  style={[
                    styles.compareBtnText,
                    isComparing && styles.activeBtnText,
                  ]}
                  maxFontSizeMultiplier={1.3}
                >
                  {isComparing ? '비교 재생 중...' : '원어민 → 내 발음'}
                </Text>
              </Tap>
            </View>
          ) : null}

          {isMasteryMode && evaluation ? (
            <Tap
              feel="playful"
              onPress={advanceMasteryStep}
              style={styles.nextStepBtn}
              accessibilityRole="button"
              accessibilityLabel="다음 단계로"
            >
              <Text style={styles.nextStepBtnText} maxFontSizeMultiplier={1.25}>
                다음 단계
              </Text>
              <CaretRight size={18} color={COLORS.white} />
            </Tap>
          ) : (
            <View style={styles.footerRow}>
              <Text style={styles.ephemeralNote} maxFontSizeMultiplier={1.3}>
                다른 단어로 넘어가거나 닫으면 방금 녹음은 즉시 지워져요.
              </Text>
              <Tap
                feel="snappy"
                onPress={resetPractice}
                style={styles.clearRecordBtn}
                accessibilityRole="button"
                accessibilityLabel="방금 녹음 지우기"
              >
                <Text style={styles.clearRecordText} maxFontSizeMultiplier={1.3}>
                  지우기
                </Text>
              </Tap>
            </View>
          )}
        </View>
      ) : null}

      {/* 마스터리 완료 */}
      {isMasteryMode && masteryStep === 'done' ? (
        <View style={styles.masteryDoneCard}>
          <View style={styles.masteryDoneIcon}>
            <CheckCircle size={34} color={COLORS.success} weight="fill" />
          </View>
          <Text style={styles.masteryDoneTitle} maxFontSizeMultiplier={1.35}>
            입에 한 겹 붙었어요!
          </Text>
          <Text style={styles.masteryDoneSub} maxFontSizeMultiplier={1.35}>
            내일 한 번 더 꺼내면 오래 남아요
          </Text>
          <Tap
            feel="snappy"
            onPress={handleRestartMastery}
            style={styles.masteryRestartBtn}
            accessibilityRole="button"
            accessibilityLabel="입에 붙이기 처음부터 다시 연습"
          >
            <Text style={styles.masteryRestartBtnText} maxFontSizeMultiplier={1.25}>
              한 번 더 연습하기
            </Text>
          </Tap>
        </View>
      ) : null}
    </View>
  );
}

interface PronunciationPracticeSheetProps {
  visible: boolean;
  word: string | null;
  ipa?: string;
  syllableCount: number;
  onPlayNative: () => void | Promise<void>;
  onStopNative: () => void;
  onClose: () => void;
}

export function PronunciationPracticeSheet({
  visible,
  word,
  ipa,
  syllableCount,
  onPlayNative,
  onStopNative,
  onClose,
}: PronunciationPracticeSheetProps) {
  const insets = useSafeAreaInsets();
  const [cachedWord, setCachedWord] = useState<string | null>(word);
  if (word && word !== cachedWord) {
    setCachedWord(word);
  }
  const displayWord = word ?? cachedWord;
  if (!displayWord) return null;

  return (
    <SpringSheet
      visible={visible && Boolean(word)}
      onClose={onClose}
      dismissLabel="따라 말하기 창 닫기"
      statusBarTranslucent
      sheetStyle={[
        styles.sheetContainer,
        { paddingBottom: Math.max(insets.bottom, SPACING.md) },
      ]}
    >
      <View style={styles.sheetHandle} />
      <View style={styles.sheetTopBar}>
        <Text
          style={[
            styles.sheetWordTitle,
            displayWord.includes(' ') && styles.sheetSentenceTitle,
          ]}
          numberOfLines={3}
          maxFontSizeMultiplier={1.3}
        >
          {displayWord}
        </Text>
        <Tap
          feel="snappy"
          onPress={onClose}
          style={styles.sheetCloseBtn}
          accessibilityRole="button"
          accessibilityLabel="닫기"
        >
          <X size={22} color={COLORS.text} />
        </Tap>
      </View>

      {visible && word ? (
        <PronunciationPracticeCard
          word={word}
          ipa={ipa}
          syllableCount={syllableCount}
          onPlayNative={onPlayNative}
          onStopNative={onStopNative}
          embedded
        />
      ) : null}
    </SpringSheet>
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
  cardEmbedded: {
    backgroundColor: COLORS.card,
    padding: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sectionTitle,
    fontWeight: '700',
    color: COLORS.text,
  },
  privacyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  privacyPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  guideText: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
  guideWordHighlight: {
    fontWeight: '700',
    color: COLORS.purpleText,
  },
  micButton: {
    minHeight: TOUCH.recommendedHeight,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.purple,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 4,
  },
  micButtonRecording: {
    backgroundColor: COLORS.rose,
  },
  micButtonText: {
    fontSize: TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.white,
  },
  recordingBox: {
    backgroundColor: COLORS.roseSoft,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    gap: 10,
  },
  recordingVisualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    minHeight: 54,
  },
  pulseOrbWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
  },
  pulseCore: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.rose,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveRow: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  waveBar: {
    width: 7,
    height: 36,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.rose,
  },
  recordingHint: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.roseText,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: COLORS.roseSoft,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
    color: COLORS.roseText,
  },
  resultCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  scoreSection: {
    gap: 8,
  },
  scoreHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  scoreHeadlineCol: {
    flex: 1,
    gap: 4,
  },
  headlineSparkleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scoreHeadline: {
    fontSize: TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.text,
  },
  compareStageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  compareStagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.card,
  },
  compareStagePillNativeActive: {
    backgroundColor: COLORS.indigo,
  },
  compareStagePillUserActive: {
    backgroundColor: COLORS.teal,
  },
  compareStageText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  compareStageTextActive: {
    color: COLORS.white,
  },
  compareArrow: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  heardText: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  heardWord: {
    fontWeight: '700',
    color: COLORS.purpleText,
  },
  scoreBadge: {
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 72,
  },
  scoreBadgeLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  scoreBadgeNumber: {
    fontSize: 20,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.card,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: RADIUS.pill,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  playbackRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  playMineBtn: {
    flex: 1,
    minWidth: 140,
    minHeight: TOUCH.minTarget,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.tealSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  playMineBtnActive: {
    backgroundColor: COLORS.teal,
  },
  playMineBtnText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.tealText,
  },
  compareBtn: {
    flex: 1,
    minWidth: 140,
    minHeight: TOUCH.minTarget,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.indigoSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  compareBtnActive: {
    backgroundColor: COLORS.indigo,
  },
  compareBtnText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.indigoText,
  },
  activeBtnText: {
    color: COLORS.white,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 2,
  },
  ephemeralNote: {
    flex: 1,
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  clearRecordBtn: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
  },
  clearRecordText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 24, 21, 0.45)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  sheetContainer: {
    width: '100%',
    maxWidth: LAYOUT.mobileFrameMaxWidth,
    alignSelf: 'center',
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    gap: SPACING.sm,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.background,
    marginBottom: 4,
  },
  sheetTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sheetWordTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  sheetSentenceTitle: {
    fontSize: 17,
    lineHeight: 24,
  },
  sheetCloseBtn: {
    width: TOUCH.minTarget,
    height: TOUCH.minTarget,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.82,
  },
  masteryStepArea: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  stepDotsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  stepDotCurrent: {
    backgroundColor: COLORS.primary,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepDotDone: {
    backgroundColor: COLORS.success,
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  koPronDisplay: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  koPronBlurWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  koPronBlurText: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.textMuted,
    letterSpacing: 2,
  },
  koPronVisibleText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  sentenceDisplay: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 8,
  },
  sentenceText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 24,
  },
  sentenceListenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.tint,
  },
  sentenceListenText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  nextStepBtn: {
    minHeight: TOUCH.minTarget,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  nextStepBtnText: {
    fontSize: TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.white,
  },
  masteryDoneCard: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: SPACING.lg,
  },
  masteryDoneIcon: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  masteryDoneTitle: {
    fontSize: TYPOGRAPHY.sectionTitle,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  masteryDoneSub: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  masteryRestartBtn: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.background,
  },
  masteryRestartBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
