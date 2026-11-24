import { GitDiff, Microphone, ShieldCheck, StopCircle, User, WarningCircle, X } from 'phosphor-react-native';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePronunciationPractice } from '../hooks/usePronunciationPractice';
import { COLORS, RADIUS, SHADOW, SPACING, TOUCH, TYPOGRAPHY } from '../theme/tokens';

export interface PronunciationPracticeCardProps {
  word: string;
  ipa?: string;
  syllableCount: number;
  onPlayNative: () => void | Promise<void>;
  onStopNative: () => void;
  /** 모달 바텀시트 내부에 들어갈 때 바깥 카드 그림자/패딩을 줄임 */
  embedded?: boolean;
}

const WAVE_BAR_FACTORS = [0.42, 0.72, 0.95, 1.0, 0.88, 0.65, 0.4];

export function PronunciationPracticeCard({
  word,
  ipa,
  syllableCount,
  onPlayNative,
  onStopNative,
  embedded = false,
}: PronunciationPracticeCardProps) {
  const {
    isRecording,
    isPlayingUser,
    isComparing,
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
    targetWord: word,
    syllableCount,
    onPlayNative,
    onStopNative,
  });

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

  return (
    <View style={[styles.card, embedded && styles.cardEmbedded]}>
      {/* 상단 제목 + 미저장 안심 배지 */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.4}>
          따라 말하며 내 발음 비교
        </Text>
        <View style={styles.privacyPill}>
          <ShieldCheck size={15} color={COLORS.successText} />
          <Text style={styles.privacyPillText} maxFontSizeMultiplier={1.25}>
            저장 안 됨
          </Text>
        </View>
      </View>

      <Text style={styles.guideText} maxFontSizeMultiplier={1.4}>
        마이크를 누르고 <Text style={styles.guideWordHighlight}>{word}</Text>
        {ipa ? ` (${ipa})` : ''}를 말해 보세요. 내 목소리를 바로 들어보고 원어민 발음과
        얼마나 비슷한지 비교할 수 있어요.
      </Text>

      {/* 메인 마이크 시작/중지 버튼 */}
      <Pressable
        onPress={() => {
          if (isRecording) {
            void stopRecording();
          } else {
            void startRecording();
          }
        }}
        style={({ pressed }) => [
          styles.micButton,
          isRecording && styles.micButtonRecording,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={
          isRecording ? '말하기 끝내고 발음 비교하기' : `${word} 따라 말하기 시작`
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
              : '마이크 눌러 따라 말하기'}
        </Text>
      </Pressable>

      {/* 녹음 중 실시간 파형 + 인식 프리뷰 */}
      {isRecording ? (
        <View style={styles.recordingBox}>
          <View style={styles.waveRow}>
            {WAVE_BAR_FACTORS.map((factor, idx) => {
              const barHeight = Math.round(
                10 + Math.max(0.14, micLevel) * factor * 30
              );
              return (
                <View
                  key={`wave-${idx}`}
                  style={[styles.waveBar, { height: barHeight }]}
                />
              );
            })}
          </View>
          <Text style={styles.recordingHint} maxFontSizeMultiplier={1.35}>
            {liveTranscript
              ? `들리는 소리: "${liveTranscript}"`
              : `'${word}'를 편안하게 한 번 말해 보세요 (자동으로 멈춰요)`}
          </Text>
        </View>
      ) : null}

      {/* 권한/오류 안내 */}
      {errorMessage ? (
        <View style={styles.errorBox}>
          <WarningCircle size={20} color={COLORS.roseText} />
          <Text style={styles.errorText} maxFontSizeMultiplier={1.4}>
            {errorMessage}
          </Text>
        </View>
      ) : null}

      {/* 발음 유사도 비교 결과 + 내 목소리/원어민 비교 재생 */}
      {!isRecording && (evaluation || hasRecording) ? (
        <View style={styles.resultCard}>
          {evaluation ? (
            <View style={styles.scoreSection}>
              <View style={styles.scoreHeaderRow}>
                <View style={styles.scoreHeadlineCol}>
                  <Text style={styles.scoreHeadline} maxFontSizeMultiplier={1.4}>
                    {evaluation.headlineKo}
                  </Text>
                  {evaluation.heardText ? (
                    <Text style={styles.heardText} maxFontSizeMultiplier={1.35}>
                      들린 발음:{' '}
                      <Text style={styles.heardWord}>{evaluation.heardText}</Text>
                    </Text>
                  ) : null}
                </View>

                {evaluation.score > 0 ? (
                  <View
                    style={[
                      styles.scoreBadge,
                      { backgroundColor: scoreBadgeBg },
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
                      {evaluation.score}%
                    </Text>
                  </View>
                ) : null}
              </View>

              {evaluation.score > 0 ? (
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${evaluation.score}%`,
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

          {hasRecording ? (
            <View style={styles.playbackRow}>
              <Pressable
                onPress={() => void playUserRecording()}
                style={({ pressed }) => [
                  styles.playMineBtn,
                  isPlayingUser && !isComparing && styles.playMineBtnActive,
                  pressed && styles.pressed,
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
              </Pressable>

              <Pressable
                onPress={playCompareWithNative}
                style={({ pressed }) => [
                  styles.compareBtn,
                  isComparing && styles.compareBtnActive,
                  pressed && styles.pressed,
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
              </Pressable>
            </View>
          ) : null}

          <View style={styles.footerRow}>
            <Text style={styles.ephemeralNote} maxFontSizeMultiplier={1.3}>
              다른 단어로 넘어가거나 닫으면 방금 녹음은 즉시 지워져요.
            </Text>
            <Pressable
              onPress={resetPractice}
              style={({ pressed }) => [
                styles.clearRecordBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="방금 녹음 지우기"
            >
              <Text style={styles.clearRecordText} maxFontSizeMultiplier={1.3}>
                지우기
              </Text>
            </Pressable>
          </View>
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
  if (!word) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable
          style={styles.modalDismissArea}
          onPress={onClose}
          accessibilityLabel="따라 말하기 창 닫기"
        />
        <View
          style={[
            styles.sheetContainer,
            { paddingBottom: Math.max(insets.bottom, SPACING.md) },
          ]}
        >
          <View style={styles.sheetHandle} />
          <View style={styles.sheetTopBar}>
            <Text style={styles.sheetWordTitle} maxFontSizeMultiplier={1.35}>
              {word}
            </Text>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.sheetCloseBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="닫기"
            >
              <X size={22} color={COLORS.text} />
              <Text style={styles.sheetCloseText} maxFontSizeMultiplier={1.3}>
                닫기
              </Text>
            </Pressable>
          </View>

          {visible ? (
            <PronunciationPracticeCard
              word={word}
              ipa={ipa}
              syllableCount={syllableCount}
              onPlayNative={onPlayNative}
              onStopNative={onStopNative}
              embedded
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
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
  sectionTitle: {
    fontSize: TYPOGRAPHY.sectionTitle,
    fontWeight: '700',
    color: COLORS.text,
  },
  privacyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.successSoft,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  privacyPillText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.successText,
  },
  guideText: {
    fontSize: TYPOGRAPHY.body,
    lineHeight: 26,
    color: COLORS.textMuted,
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
  waveRow: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  waveBar: {
    width: 8,
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
  scoreHeadline: {
    fontSize: TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.text,
  },
  heardText: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  heardWord: {
    fontWeight: '700',
    color: COLORS.purpleText,
  },
  scoreBadge: {
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 78,
  },
  scoreBadgeLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  scoreBadgeNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  progressTrack: {
    height: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.card,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: RADIUS.pill,
  },
  tipText: {
    fontSize: 16,
    lineHeight: 24,
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
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  clearRecordBtn: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
  },
  clearRecordText: {
    fontSize: 14,
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
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  sheetCloseBtn: {
    minHeight: TOUCH.minTarget,
    paddingHorizontal: 14,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.background,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sheetCloseText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.text,
  },
  pressed: {
    opacity: 0.82,
  },
});
