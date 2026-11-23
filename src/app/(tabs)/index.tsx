import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SymbolDetailSheet } from '../../components/SymbolDetailSheet';
import {
  getSymbolsByCategory,
  IPA_CATEGORIES,
  IPA_SYMBOLS,
} from '../../data/categories';
import { useLearningStore } from '../../store/useLearningStore';
import { COLORS, RADIUS, SPACING, TOUCH, TYPOGRAPHY } from '../../theme/tokens';
import type { IpaSymbol } from '../../types/learning';

export default function IpaSymbolsScreen() {
  const [selectedSymbol, setSelectedSymbol] = useState<IpaSymbol | null>(null);

  const learnedSymbolIds = useLearningStore((state) => state.learnedSymbolIds);
  const hasHydrated = useLearningStore((state) => state.hasHydrated);
  const hasDismissedWelcomeBanner = useLearningStore(
    (state) => state.hasDismissedWelcomeBanner
  );
  const dismissWelcomeBanner = useLearningStore(
    (state) => state.dismissWelcomeBanner
  );

  const totalCount = IPA_SYMBOLS.length;
  const totalLearnedCount = learnedSymbolIds.length;
  const totalProgressPct =
    totalCount === 0 ? 0 : Math.round((totalLearnedCount / totalCount) * 100);

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
                <Text style={styles.welcomeTitle}>바로영어에 오신 걸 환영해요!</Text>
              </View>
              <Pressable
                onPress={dismissWelcomeBanner}
                style={({ pressed }) => [
                  styles.dismissBtn,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="안내 배너 닫기"
              >
                <Ionicons name="close" size={20} color={COLORS.primaryDark} />
                <Text style={styles.dismissBtnText}>닫기</Text>
              </Pressable>
            </View>
            <Text style={styles.welcomeBody}>
              꼭 필요한 발음기호 18개만 모아 두었어요. 아래 카드를 눌러 입 모양을 보고
              소리를 바로 따라 읽어 보세요.
            </Text>
          </View>
        ) : null}

        {/* 전체 진도 Bento 요약 카드 */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>나의 발음기호 진도</Text>
              <Text style={styles.summaryCount}>
                {totalLearnedCount} / {totalCount}개 익힘
              </Text>
            </View>
            <View style={styles.percentPill}>
              <Text style={styles.percentPillText}>{totalProgressPct}%</Text>
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
                  <Text style={styles.categoryStep}>
                    {index + 1}단계 · {category.titleKo}
                  </Text>
                  <Text style={styles.categorySubtitle}>
                    {category.subtitleKo}
                  </Text>
                </View>

                <View style={styles.categoryProgressBadge}>
                  <Text style={styles.categoryProgressText}>
                    {learnedInCategory} / {symbols.length} 익힘
                  </Text>
                </View>
              </View>

              <View style={styles.grid}>
                {symbols.map((symbol) => {
                  const isLearned = learnedSymbolIds.includes(symbol.id);

                  return (
                    <Pressable
                      key={symbol.id}
                      onPress={() => setSelectedSymbol(symbol)}
                      style={({ pressed }) => [
                        styles.symbolCard,
                        isLearned && styles.symbolCardLearned,
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${symbol.ipa} ${symbol.titleKo} ${
                        isLearned ? '익힘 완료' : '학습하기'
                      }`}
                    >
                      <View style={styles.symbolCardTop}>
                        <Text style={styles.symbolIpa}>{symbol.ipa}</Text>
                        {isLearned ? (
                          <View style={styles.doneTag}>
                            <Ionicons
                              name="checkmark-circle"
                              size={18}
                              color={COLORS.primary}
                            />
                            <Text style={styles.doneTagText}>익힘</Text>
                          </View>
                        ) : null}
                      </View>

                      <Text style={styles.symbolKoHint} numberOfLines={1}>
                        {symbol.koHint}
                      </Text>
                      <Text style={styles.symbolExamplePreview} numberOfLines={1}>
                        예: {symbol.examples[0]?.word} ({symbol.examples[0]?.meaningKo})
                      </Text>
                    </Pressable>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  welcomeTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  welcomeTitle: {
    flex: 1,
    fontSize: TYPOGRAPHY.bodyLarge,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  dismissBtn: {
    minHeight: TOUCH.minTarget,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dismissBtnText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  welcomeBody: {
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  summaryCount: {
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  categoryTitleBlock: {
    flex: 1,
    gap: 2,
  },
  categoryStep: {
    fontSize: TYPOGRAPHY.sectionTitle,
    fontWeight: '800',
    color: COLORS.text,
  },
  categorySubtitle: {
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
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  symbolCard: {
    width: '48.4%',
    minHeight: 124,
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  symbolIpa: {
    fontSize: TYPOGRAPHY.word,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  doneTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: COLORS.card,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  doneTagText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  symbolKoHint: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.text,
  },
  symbolExamplePreview: {
    fontSize: 16,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.82,
  },
});
