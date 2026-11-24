import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { LayoutAnimation, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Tap } from '../../components/Tap';
import { SymbolDetailSheet } from '../../components/SymbolDetailSheet';
import {
  getSymbolsByCategory,
  IPA_CATEGORIES,
  IPA_SYMBOLS,
} from '../../data/categories';
import { useSpeechAudio } from '../../hooks/useSpeechAudio';
import { useLearningStore } from '../../store/useLearningStore';
import { COLORS, FONTS, RADIUS, SPACING, TOUCH, TYPOGRAPHY } from '../../theme/tokens';
import type { IpaSymbol } from '../../types/learning';

export default function IpaSymbolsScreen() {
  const [selectedSymbol, setSelectedSymbol] = useState<IpaSymbol | null>(null);
  const { stop } = useSpeechAudio();

  const learnedSymbolIds = useLearningStore((state) => state.learnedSymbolIds);
  const bookmarkedSymbolIds = useLearningStore(
    (state) => state.bookmarkedSymbolIds
  );
  const hasHydrated = useLearningStore((state) => state.hasHydrated);
  const hasDismissedWelcomeBanner = useLearningStore(
    (state) => state.hasDismissedWelcomeBanner
  );
  const dismissWelcomeBanner = useLearningStore(
    (state) => state.dismissWelcomeBanner
  );

  // 탭 전환/화면 이탈 시 진행 중인 음성 즉시 중단
  useFocusEffect(
    useCallback(() => {
      return () => {
        stop();
      };
    }, [stop])
  );

  // 유효한 18개 기호 ID만 필터링하고 0~100% 범위로 클램핑
  const validSymbolIdSet = useMemo(
    () => new Set(IPA_SYMBOLS.map((s) => s.id)),
    []
  );
  const totalCount = IPA_SYMBOLS.length;
  const totalLearnedCount = learnedSymbolIds.filter((id) =>
    validSymbolIdSet.has(id)
  ).length;
  const totalProgressPct =
    totalCount === 0
      ? 0
      : Math.min(100, Math.max(0, Math.round((totalLearnedCount / totalCount) * 100)));

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 최초 실행 1회성 안내 배너 (AsyncStorage 하이드레이션 후 표시) */}
        {hasHydrated && !hasDismissedWelcomeBanner ? (
          <View style={styles.welcomeBanner}>
            <View style={styles.welcomeHeader}>
              <View style={styles.welcomeTitleRow}>
                <Ionicons name="sparkles" size={24} color={COLORS.primaryDark} />
                <Text style={styles.welcomeTitle} maxFontSizeMultiplier={1.4}>
                  바로영어에 오신 걸 환영해요!
                </Text>
              </View>
              <Tap
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  dismissWelcomeBanner();
                }}
                style={styles.dismissBtn}
                accessibilityRole="button"
                accessibilityLabel="안내 배너 닫기"
              >
                <Ionicons name="close" size={20} color={COLORS.primaryDark} />
                <Text style={styles.dismissBtnText} maxFontSizeMultiplier={1.3}>
                  닫기
                </Text>
              </Tap>
 
              </Pressable>
            </View>
            <Text style={styles.welcomeBody} maxFontSizeMultiplier={1.5}>
              꼭 필요한 발음기호 18개만 모아 두었어요. 아래 카드를 눌러 입 모양을 보고
              소리를 바로 따라 읽어 보세요.
            </Text>
          </View>
        ) : null}

        {/* 전체 진도 Bento 요약 카드 */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryTitleCol}>
              <Text style={styles.summaryLabel} maxFontSizeMultiplier={1.4}>
                학습 진도
              </Text>
              <Text style={styles.summaryCount} maxFontSizeMultiplier={1.4}>
                {totalLearnedCount} / {totalCount}개 익힘
              </Text>
            </View>
            <View style={styles.percentPill}>
              <Text style={styles.percentPillText} maxFontSizeMultiplier={1.35}>
                {totalProgressPct}%
              </Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${totalProgressPct}%` }]}
            />
          </View>
        </View>

        {/* 3개 카테고리 Bento 섹션 */}
        {IPA_CATEGORIES.map((category, index) => {
          const symbols = getSymbolsByCategory(category.id);
          const learnedInCategory = symbols.filter((s) =>
            learnedSymbolIds.includes(s.id)
          ).length;

          return (
            <View key={category.id} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryTitleBlock}>
                  <Text style={styles.categoryStep} maxFontSizeMultiplier={1.4}>
                    {index + 1}단계 · {category.titleKo}
                  </Text>
                  <Text style={styles.categorySubtitle} maxFontSizeMultiplier={1.45}>
                    {category.subtitleKo}
                  </Text>
                </View>

                <View style={styles.categoryProgressBadge}>
                  <Text
                    style={styles.categoryProgressText}
                    maxFontSizeMultiplier={1.35}
                  >
                    {learnedInCategory} / {symbols.length}
                  </Text>
                </View>
              </View>

              <View style={styles.grid}>
                {symbols.map((symbol) => {
                  const isLearned = learnedSymbolIds.includes(symbol.id);
                  const isBookmarked = bookmarkedSymbolIds.includes(symbol.id);

                  return (
                    <Tap
                      key={symbol.id}
                      onPress={() => setSelectedSymbol(symbol)}
                      style={[
                        styles.symbolCard,
                        isLearned && styles.symbolCardLearned,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${symbol.ipa} ${symbol.titleKo} ${
                        isLearned ? '익힘 완료' : '학습하기'
                      }`}
                    >
                      <View style={styles.symbolCardTop}>
                        <Text style={styles.symbolIpa} maxFontSizeMultiplier={1.35}>
                          {symbol.ipa}
                        </Text>
                        <View style={styles.symbolCardIcons}>
                          {isBookmarked ? (
                            <Ionicons
                              name="bookmark"
                              size={20}
                              color={COLORS.accent}
                            />
                          ) : null}
                          {isLearned ? (
                            <Ionicons
                              name="checkmark-circle"
                              size={24}
                              color={COLORS.primary}
                            />
                          ) : null}
                        </View>
                      </View>

                      <Text
                        style={styles.symbolKoHint}
                        numberOfLines={2}
                        maxFontSizeMultiplier={1.4}
                      >
                        {symbol.koHint}
                      </Text>
                      <Text
                        style={styles.symbolExamplePreview}
                        numberOfLines={1}
                        maxFontSizeMultiplier={1.4}
                      >
                        예: {symbol.examples[0]?.word} ({symbol.examples[0]?.meaningKo})
                      </Text>
                    </Tap>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <SymbolDetailSheet
        symbol={selectedSymbol}
        visible={selectedSymbol !== null}
        onClose={() => setSelectedSymbol(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl * 2,
    gap: SPACING.lg,
  },
  welcomeBanner: {
    backgroundColor: COLORS.tint,
    borderColor: COLORS.primary,
    borderWidth: 1,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  welcomeHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  welcomeTitleRow: {
    flex: 1,
    minWidth: 180,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  welcomeTitle: {
    flex: 1,
    fontFamily: FONTS.family,
    fontSize: TYPOGRAPHY.bodyLarge,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  dismissBtn: {
    width: TOUCH.minTarget,
    height: TOUCH.minTarget,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeBody: {
    fontFamily: FONTS.family,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 28,
    color: COLORS.text,
  },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  summaryTitleCol: {
    flex: 1,
    minWidth: 180,
  },
  summaryLabel: {
    fontFamily: FONTS.family,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  summaryCount: {
    fontFamily: FONTS.family,
    fontSize: TYPOGRAPHY.screenTitle,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 2,
  },
  percentPill: {
    backgroundColor: COLORS.tint,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  percentPillText: {
    fontFamily: FONTS.family,
    fontSize: TYPOGRAPHY.bodyLarge,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  progressTrack: {
    height: 12,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
  },
  categorySection: {
    gap: SPACING.sm,
  },
  categoryHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  categoryTitleBlock: {
    flex: 1,
    minWidth: 190,
    gap: 2,
  },
  categoryStep: {
    fontFamily: FONTS.family,
    fontSize: TYPOGRAPHY.sectionTitle,
    fontWeight: '800',
    color: COLORS.text,
  },
  categorySubtitle: {
    fontFamily: FONTS.family,
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textMuted,
  },
  categoryProgressBadge: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  categoryProgressText: {
    fontFamily: FONTS.family,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  symbolCard: {
    flexBasis: '46%',
    flexGrow: 1,
    minWidth: 148,
    minHeight: 128,
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    justifyContent: 'space-between',
    gap: 6,
  },
  symbolCardLearned: {
    backgroundColor: COLORS.tint,
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  symbolCardTop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
  },
  symbolIpa: {
    fontFamily: FONTS.family,
    fontSize: TYPOGRAPHY.word,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  symbolCardIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  symbolKoHint: {
    fontFamily: FONTS.family,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.text,
  },
  symbolExamplePreview: {
    fontFamily: FONTS.family,
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
});
