import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Tap } from './Tap';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSpeechAudio } from '../hooks/useSpeechAudio';
import { useLearningStore } from '../store/useLearningStore';
import { COLORS, RADIUS, SPACING, TOUCH, TYPOGRAPHY } from '../theme/tokens';
import type { IpaSymbol } from '../types/learning';

interface SymbolDetailSheetProps {
  symbol: IpaSymbol | null;
  visible: boolean;
  onClose: () => void;
  /** Tab 2 기호 역추적에서 열렸을 때 상단에 맥락 배지 표시 */
  contextLabel?: string;
}

export function SymbolDetailSheet({
  symbol,
  visible,
  onClose,
  contextLabel,
}: SymbolDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const { playNormal, playSlow, stop, activeKey } = useSpeechAudio();
  const learnedSymbolIds = useLearningStore((state) => state.learnedSymbolIds);
  const toggleSymbolLearned = useLearningStore((state) => state.toggleSymbolLearned);
  const bookmarkedSymbolIds = useLearningStore(
    (state) => state.bookmarkedSymbolIds
  );
  const toggleSymbolBookmark = useLearningStore(
    (state) => state.toggleSymbolBookmark
  );

  // 닫기 슬라이드 애니메이션 중 내용이 즉시 사라지지 않도록 직전 기호 유지
  const [cachedSymbol, setCachedSymbol] = useState<IpaSymbol | null>(symbol);
  if (symbol && symbol !== cachedSymbol) {
    setCachedSymbol(symbol);
  }
  const activeSymbol = symbol ?? cachedSymbol;

  // 바텀시트가 열릴 때 이전 화면의 오디오 즉시 중단
  useEffect(() => {
    if (visible) {
      stop();
    }
  }, [visible, stop]);

  if (!activeSymbol) return null;

  const isLearned = learnedSymbolIds.includes(activeSymbol.id);
  const isBookmarked = bookmarkedSymbolIds.includes(activeSymbol.id);

  const handleClose = () => {
    stop();
    onClose();
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
          accessibilityLabel="창 닫기"
        />
        <View
          style={[
            styles.sheetContainer,
            { paddingBottom: Math.max(insets.bottom, SPACING.md) },
          ]}
        >
          <View style={styles.handleBar} />

          {/* 헤더 */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              {contextLabel ? (
                <View style={styles.contextBadge}>
                  <Text style={styles.contextBadgeText} maxFontSizeMultiplier={1.35}>
                    {contextLabel}
                  </Text>
                </View>
              ) : null}
              <Text style={styles.ipaHero} maxFontSizeMultiplier={1.35}>
                {activeSymbol.ipa}
              </Text>
              <Text style={styles.titleKo} maxFontSizeMultiplier={1.4}>
                {activeSymbol.titleKo}
              </Text>
            </View>

            <Tap
              onPress={handleClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="닫기"
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
              <Text style={styles.closeButtonText} maxFontSizeMultiplier={1.3}>
                닫기
              </Text>
            </Tap>
          </View>

          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 입 모양·혀 위치 안내 카드 */}
            <View style={styles.guideCard}>
              <View style={styles.guideHeaderRow}>
                <Ionicons name="happy-outline" size={24} color={COLORS.primary} />
                <Text style={styles.guideLabel} maxFontSizeMultiplier={1.4}>
                  입 모양 · 혀 위치
                </Text>
              </View>
              <Text style={styles.guideBody} maxFontSizeMultiplier={1.5}>
                {activeSymbol.mouthGuideKo}
              </Text>

              <View style={styles.hintPill}>
                <Text style={styles.hintPillLabel} maxFontSizeMultiplier={1.4}>
                  비슷한 한글 소리
                </Text>
                <Text style={styles.hintPillValue} maxFontSizeMultiplier={1.4}>
                  {activeSymbol.koHint}
                </Text>
              </View>
            </View>

            {/* 대표 기초 단어 3개 */}
            <View style={styles.examplesSection}>
              <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.4}>
                대표 단어
              </Text>
              <View style={styles.exampleList}>
                {activeSymbol.examples.map((ex) => {
                  const normalKey = `sym:${activeSymbol.id}:${ex.word}:normal`;
                  const slowKey = `sym:${activeSymbol.id}:${ex.word}:slow`;
                  const isNormalPlaying = activeKey === normalKey;
                  const isSlowPlaying = activeKey === slowKey;

                  return (
                    <View
                      key={`${activeSymbol.id}-${ex.word}`}
                      style={[
                        styles.exampleCard,
                        (isNormalPlaying || isSlowPlaying) && styles.exampleCardActive,
                      ]}
                    >
                      <Tap
                        style={styles.exampleInfoArea}
                        onPress={() => playNormal(ex.word, { key: normalKey })}
                        accessibilityRole="button"
                        accessibilityLabel={`${ex.word} ${ex.meaningKo} 소리 듣기`}
                      >
                        <Text style={styles.exampleWord} maxFontSizeMultiplier={1.4}>
                          {ex.word}
                        </Text>
                        <Text style={styles.exampleMeta} maxFontSizeMultiplier={1.45}>
                          {ex.ipa} · {ex.meaningKo}
                        </Text>
                      </Tap>

                      <View style={styles.exampleButtons}>
                        <Tap
                          onPress={() => playNormal(ex.word, { key: normalKey })}
                          style={[
                            styles.playBtnPrimary,
                            isNormalPlaying && styles.playBtnPrimaryActive,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`${ex.word} 소리 듣기`}
                        >
                          <Ionicons
                            name={isNormalPlaying ? 'volume-high' : 'volume-medium'}
                            size={20}
                            color={COLORS.white}
                          />
                          <Text
                            style={styles.playBtnPrimaryText}
                            maxFontSizeMultiplier={1.3}
                          >
                            {isNormalPlaying ? '재생 중' : '듣기'}
                          </Text>
                        </Tap>

                        <Tap
                          onPress={() => playSlow(ex.word, { key: slowKey })}
                          style={[
                            styles.playBtnSlow,
                            isSlowPlaying && styles.playBtnSlowActive,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`${ex.word} 천천히 듣기`}
                        >
                          <Ionicons
                            name="speedometer-outline"
                            size={20}
                            color={COLORS.primaryDark}
                          />
                          <Text
                            style={styles.playBtnSlowText}
                            maxFontSizeMultiplier={1.3}
                          >
                            {isSlowPlaying ? '재생 중' : '천천히'}
                          </Text>
                        </Tap>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* 하단 익혔어요 버튼 */}
          <View style={styles.footer}>
            <Tap
              onPress={() => toggleSymbolLearned(activeSymbol.id)}
              style={[
                styles.learnedButton,
                isLearned ? styles.learnedButtonDone : styles.learnedButtonTodo,
              ]}
              accessibilityRole="button"
              accessibilityState={{ checked: isLearned }}
              accessibilityLabel={isLearned ? '익힘 완료 해제하기' : '익혔어요 완료 체크'}
            >
              <Ionicons
                name={isLearned ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={26}
                color={isLearned ? COLORS.primaryDark : COLORS.white}
              />
              <Text
                style={[
                  styles.learnedButtonText,
                  isLearned ? styles.learnedButtonTextDone : styles.learnedButtonTextTodo,
                ]}
                maxFontSizeMultiplier={1.35}
              >
                {isLearned ? '익힘 완료' : '익혔어요'}
              </Text>
            </Tap>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    justifyContent: 'flex-end',
  },
  backdropDismiss: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '88%',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  handleBar: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  headerLeft: {
    flex: 1,
    gap: 4,
  },
  contextBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.tint,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    marginBottom: 4,
  },
  contextBadgeText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  ipaHero: {
    fontSize: TYPOGRAPHY.wordHero,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  titleKo: {
    fontSize: TYPOGRAPHY.sectionTitle,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconActionButton: {
    width: TOUCH.minTarget,
    height: TOUCH.minTarget,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookmarkButtonActive: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accent,
  },
  scrollBody: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: SPACING.md,
    gap: SPACING.md,
  },
  guideCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  guideHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guideLabel: {
    fontSize: TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  guideBody: {
    fontSize: TYPOGRAPHY.bodyLarge,
    lineHeight: 30,
    color: COLORS.text,
  },
  hintPill: {
    marginTop: 4,
    backgroundColor: COLORS.tint,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  hintPillLabel: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  hintPillValue: {
    fontSize: TYPOGRAPHY.bodyLarge,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  examplesSection: {
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.text,
  },
  exampleList: {
    gap: SPACING.sm,
  },
  exampleCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  exampleCardActive: {
    backgroundColor: COLORS.tint,
    borderColor: COLORS.primary,
  },
  exampleInfoArea: {
    gap: 2,
  },
  exampleWord: {
    fontSize: TYPOGRAPHY.ipa,
    fontWeight: '800',
    color: COLORS.text,
  },
  exampleMeta: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  exampleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  playBtnPrimary: {
    flexGrow: 1,
    minWidth: 120,
    minHeight: TOUCH.minTarget,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    flexGrow: 1,
    minWidth: 120,
    minHeight: TOUCH.minTarget,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.tint,
    borderWidth: 1,
    borderColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  playBtnSlowActive: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accent,
  },
  playBtnSlowText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  footer: {
    paddingTop: SPACING.sm,
  },
  learnedButton: {
    minHeight: TOUCH.recommendedHeight,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
  },
  learnedButtonTodo: {
    backgroundColor: COLORS.primary,
  },
  learnedButtonDone: {
    backgroundColor: COLORS.tint,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  learnedButtonText: {
    fontSize: TYPOGRAPHY.bodyLarge,
    fontWeight: '800',
  },
  learnedButtonTextTodo: {
    color: COLORS.white,
  },
  learnedButtonTextDone: {
    color: COLORS.primaryDark,
  },
});
