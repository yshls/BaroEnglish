import { ArrowRight, BookOpen, Gauge, SpeakerHigh, SpeakerLow, X } from 'phosphor-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSpeechAudio } from '../hooks/useSpeechAudio';
import {
  lookupQuickWordMeaning,
  sanitizeEnglishWord,
  type QuickWordInfo,
} from '../services/wordApi';
import { useWordCacheStore } from '../store/useWordCacheStore';
import { COLORS, RADIUS, SHADOW, SPACING, TOUCH, TYPOGRAPHY } from '../theme/tokens';

interface WordMeaningSheetProps {
  word: string | null;
  visible: boolean;
  onClose: () => void;
  /** 단어 바로 읽기 화면 등에서 해당 단어를 메인 카드로 바로 열어볼 때 전달 */
  onOpenFullWord?: (englishWord: string) => void;
  /** 이미 메인 화면에 표시 중인 단어라면 '자세히 보기' 버튼 숨김 */
  currentMainWord?: string;
}

interface LookupResultState {
  key: string;
  info: QuickWordInfo | null;
  failed: boolean;
}

export function WordMeaningSheet({
  word,
  visible,
  onClose,
  onOpenFullWord,
  currentMainWord,
}: WordMeaningSheetProps) {
  const insets = useSafeAreaInsets();
  const { playNormal, playSlow, stop, activeKey } = useSpeechAudio();
  const cachedWords = useWordCacheStore((state) => state.cachedWords);

  // 닫기 애니메이션 중 텍스트가 즉시 사라지지 않도록 직전 단어 유지
  const [lastWord, setLastWord] = useState<string | null>(word);
  if (word && word !== lastWord) {
    setLastWord(word);
  }
  const activeWord = word ?? lastWord;
  const cleanWord = useMemo(
    () => (activeWord ? sanitizeEnglishWord(activeWord) : ''),
    [activeWord]
  );

  const cachedInfo = useMemo<QuickWordInfo | null>(() => {
    if (!cleanWord) return null;
    const hit = cachedWords[cleanWord];
    if (!hit) return null;
    return {
      word: hit.word,
      meaningKo: hit.meaningKo,
      ipa: hit.ipa,
      koPronunciation: hit.koPronunciation,
      partOfSpeech: hit.partOfSpeech,
      audioUrl: hit.audioUrl,
    };
  }, [cachedWords, cleanWord]);

  const [fetched, setFetched] = useState<LookupResultState | null>(null);

  useEffect(() => {
    if (!visible || !cleanWord || cachedInfo) return;
    let cancelled = false;

    void lookupQuickWordMeaning(cleanWord).then((res) => {
      if (cancelled) return;
      setFetched({
        key: cleanWord,
        info: res,
        failed: res === null,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [visible, cleanWord, cachedInfo]);

  useEffect(() => {
    if (visible) {
      stop();
    }
  }, [visible, stop]);

  if (!cleanWord) return null;

  const resolvedInfo =
    cachedInfo ?? (fetched?.key === cleanWord ? fetched.info : null);
  const isFailed =
    !cachedInfo && fetched?.key === cleanWord && fetched.failed;
  const isLoading = !cachedInfo && fetched?.key !== cleanWord;

  const normalKey = `quick:${cleanWord}:normal`;
  const slowKey = `quick:${cleanWord}:slow`;
  const isNormalPlaying = activeKey === normalKey;
  const isSlowPlaying = activeKey === slowKey;

  const canOpenFull = Boolean(
    onOpenFullWord &&
      (!currentMainWord ||
        sanitizeEnglishWord(currentMainWord) !== cleanWord)
  );

  const handleClose = () => {
    stop();
    onClose();
  };

  const handleOpenFull = () => {
    if (!onOpenFullWord) return;
    stop();
    onClose();
    onOpenFullWord(cleanWord);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={styles.backdropDismiss}
          onPress={handleClose}
          accessibilityLabel="단어 뜻 창 닫기"
        />

        <View
          style={[
            styles.sheetContainer,
            { paddingBottom: Math.max(insets.bottom, SPACING.md) },
          ]}
        >
          <View style={styles.handleBar} />

          {/* 상단 헤더 */}
          <View style={styles.headerRow}>
            <View style={styles.badgeGroup}>
              <View style={styles.contextBadge}>
                <BookOpen size={16} color={COLORS.indigoText} />
                <Text style={styles.contextBadgeText} maxFontSizeMultiplier={1.3}>
                  예문 속 단어 뜻
                </Text>
              </View>
              {resolvedInfo?.partOfSpeech ? (
                <View style={styles.posBadge}>
                  <Text style={styles.posBadgeText} maxFontSizeMultiplier={1.3}>
                    {resolvedInfo.partOfSpeech}
                  </Text>
                </View>
              ) : null}
            </View>

            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="닫기"
            >
              <X size={22} color={COLORS.text} />
              <Text style={styles.closeButtonText} maxFontSizeMultiplier={1.3}>
                닫기
              </Text>
            </Pressable>
          </View>

          {/* 단어 & 발음기호 */}
          <View style={styles.wordCard}>
            <View style={styles.wordHeaderRow}>
              <Text style={styles.wordHero} maxFontSizeMultiplier={1.35}>
                {resolvedInfo?.word ?? cleanWord}
              </Text>
              {resolvedInfo?.ipa ? (
                <View style={styles.ipaPill}>
                  <Text style={styles.ipaPillText} maxFontSizeMultiplier={1.3}>
                    {resolvedInfo.ipa}
                  </Text>
                </View>
              ) : null}
            </View>

            {isLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={COLORS.indigo} />
                <Text style={styles.loadingText} maxFontSizeMultiplier={1.4}>
                  뜻과 발음을 찾고 있어요...
                </Text>
              </View>
            ) : isFailed ? (
              <Text style={styles.errorText} maxFontSizeMultiplier={1.45}>
                사전 뜻을 찾지 못했어요. 아래 버튼으로 소리만 먼저 들어볼 수 있어요.
              </Text>
            ) : (
              <View style={styles.meaningBlock}>
                <Text style={styles.meaningText} maxFontSizeMultiplier={1.45}>
                  {resolvedInfo?.meaningKo}
                </Text>
                {resolvedInfo?.koPronunciation ? (
                  <View style={styles.koHintPill}>
                    <Text style={styles.koHintLabel} maxFontSizeMultiplier={1.35}>
                      한글 발음 힌트
                    </Text>
                    <Text style={styles.koHintValue} maxFontSizeMultiplier={1.35}>
                      {resolvedInfo.koPronunciation}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* 소리 듣기 버튼 */}
            <View style={styles.audioRow}>
              <Pressable
                onPress={() =>
                  void playNormal(cleanWord, {
                    key: normalKey,
                    audioUrl: resolvedInfo?.audioUrl,
                  })
                }
                style={({ pressed }) => [
                  styles.playBtnPrimary,
                  isNormalPlaying && styles.playBtnPrimaryActive,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${cleanWord} 보통 속도 듣기`}
              >
                {isNormalPlaying ? (
                  <SpeakerHigh size={22} color={COLORS.white} />
                ) : (
                  <SpeakerLow size={22} color={COLORS.white} />
                )}
                <Text style={styles.playBtnPrimaryText} maxFontSizeMultiplier={1.3}>
                  {isNormalPlaying ? '재생 중...' : '듣기 (1.0x)'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => void playSlow(cleanWord, { key: slowKey })}
                style={({ pressed }) => [
                  styles.playBtnSlow,
                  isSlowPlaying && styles.playBtnSlowActive,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${cleanWord} 천천히 듣기`}
              >
                <Gauge
                  size={22}
                  color={isSlowPlaying ? COLORS.white : COLORS.tealText}
                />
                <Text
                  style={[
                    styles.playBtnSlowText,
                    isSlowPlaying && styles.playBtnPrimaryText,
                  ]}
                  maxFontSizeMultiplier={1.3}
                >
                  {isSlowPlaying ? '천천히 중...' : '천천히 (0.6x)'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* 이 단어 자세히 공부하기 버튼 */}
          {canOpenFull ? (
            <Pressable
              onPress={handleOpenFull}
              style={({ pressed }) => [
                styles.fullStudyBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${cleanWord} 강세 리듬과 예문 자세히 보기`}
            >
              <Text style={styles.fullStudyBtnText} maxFontSizeMultiplier={1.35}>
                &apos;{cleanWord}&apos; 강세 · 예문 자세히 공부하기
              </Text>
              <ArrowRight size={20} color={COLORS.indigoText} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  backdropDismiss: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    gap: SPACING.md,
  },
  handleBar: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  badgeGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  contextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.indigoSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  contextBadgeText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.indigoText,
  },
  posBadge: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    ...SHADOW.card,
  },
  posBadgeText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  closeButton: {
    minHeight: TOUCH.minTarget,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    ...SHADOW.card,
  },
  closeButtonText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.text,
  },
  wordCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    gap: SPACING.md,
    ...SHADOW.card,
  },
  wordHeaderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  wordHero: {
    fontSize: TYPOGRAPHY.word,
    fontWeight: '700',
    color: COLORS.text,
  },
  ipaPill: {
    backgroundColor: COLORS.purpleSoft,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ipaPillText: {
    fontSize: TYPOGRAPHY.bodyLarge,
    fontWeight: '500',
    color: COLORS.purpleText,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  errorText: {
    fontSize: TYPOGRAPHY.body,
    lineHeight: 26,
    color: COLORS.textMuted,
  },
  meaningBlock: {
    gap: SPACING.sm,
  },
  meaningText: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  koHintPill: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  koHintLabel: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  koHintValue: {
    fontSize: TYPOGRAPHY.bodyLarge,
    fontWeight: '500',
    color: COLORS.text,
  },
  audioRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  playBtnPrimary: {
    flex: 1,
    minWidth: 130,
    minHeight: TOUCH.recommendedHeight,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  playBtnPrimaryActive: {
    backgroundColor: COLORS.primaryDark,
  },
  playBtnPrimaryText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.white,
  },
  playBtnSlow: {
    flex: 1,
    minWidth: 130,
    minHeight: TOUCH.recommendedHeight,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.tealSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  playBtnSlowActive: {
    backgroundColor: COLORS.teal,
  },
  playBtnSlowText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.tealText,
  },
  fullStudyBtn: {
    minHeight: TOUCH.recommendedHeight,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.indigoSoft,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fullStudyBtnText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.indigoText,
  },
  pressed: {
    opacity: 0.82,
  },
});
