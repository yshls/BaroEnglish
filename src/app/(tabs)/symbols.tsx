import { CheckCircle, Sparkle, SpeakerHigh, SpeakerLow, X } from '../../components/PlumpIcons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { InfoTipBox, InfoTipButton } from '../../components/InfoTip';
import { MinimalPairTrainer } from '../../components/MinimalPairTrainer';
import { SpringReveal } from '../../components/SpringMotion';
import { SymbolDetailSheet } from '../../components/SymbolDetailSheet';
import { Tap } from '../../components/Tap';
import {
  CORE_IPA_SYMBOLS,
  getSymbolsByCategory,
  IPA_CATEGORIES,
  IPA_SYMBOLS,
} from '../../data/categories';
import { useSpeechAudio } from '../../hooks/useSpeechAudio';
import { useLearningStore } from '../../store/useLearningStore';
import { COLORS, LAYOUT, RADIUS, SHADOW, SPACING, TOUCH, TYPOGRAPHY } from '../../theme/tokens';
import type { IpaSymbol } from '../../types/learning';

type SymbolViewMode = 'all' | 'core';

const CATEGORY_ACCENTS: Record<
  string,
  { soft: string; text: string; solid: string }
> = {
  basic_vowels: {
    soft: COLORS.surface,
    text: COLORS.text,
    solid: COLORS.text,
  },
  diphthongs: {
    soft: COLORS.surface,
    text: COLORS.text,
    solid: COLORS.text,
  },
  key_consonants: {
    soft: COLORS.surface,
    text: COLORS.text,
    solid: COLORS.text,
  },
  basic_consonants: {
    soft: COLORS.surface,
    text: COLORS.text,
    solid: COLORS.text,
  },
};

export default function IpaSymbolsScreen() {
  const [viewMode, setViewMode] = useState<SymbolViewMode>('all');
  const [selectedSymbol, setSelectedSymbol] = useState<IpaSymbol | null>(null);
  const [openCategoryInfoId, setOpenCategoryInfoId] = useState<string | null>(null);
  const { stop, playNormal, activeKey } = useSpeechAudio();

  const learnedSymbolIds = useLearningStore((state) => state.learnedSymbolIds);
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

  const isCoreOnly = viewMode === 'core';
  const activePool = isCoreOnly ? CORE_IPA_SYMBOLS : IPA_SYMBOLS;

  const activeIdSet = useMemo(
    () => new Set(activePool.map((s) => s.id)),
    [activePool]
  );
  const totalCount = activePool.length;
  const totalLearnedCount = learnedSymbolIds.filter((id) =>
    activeIdSet.has(id)
  ).length;
  const totalProgressPct =
    totalCount === 0
      ? 0
      : Math.min(100, Math.max(0, Math.round((totalLearnedCount / totalCount) * 100)));

  const visibleCategories = useMemo(
    () =>
      IPA_CATEGORIES.map((category) => ({
        category,
        symbols: getSymbolsByCategory(category.id, isCoreOnly),
      })).filter((entry) => entry.symbols.length > 0),
    [isCoreOnly]
  );

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
                <Sparkle size={24} color={COLORS.indigoText} />
                <Text style={styles.welcomeTitle} maxFontSizeMultiplier={1.4}>
                  바로영어에 오신 걸 환영해요!
                </Text>
              </View>
              <Tap
                feel="snappy"
                onPress={dismissWelcomeBanner}
                style={styles.dismissBtn}
                accessibilityRole="button"
                accessibilityLabel="안내 배너 닫기"
              >
                <X size={20} color={COLORS.indigoText} />
              </Tap>
            </View>
            <Text style={styles.welcomeBody} maxFontSizeMultiplier={1.5}>
              미국식 영어 발음기호 전체 40개를 모두 담았어요. 처음이라면 위에서
              &apos;핵심 18개&apos;부터 차근차근 눌러 따라 읽어 보세요!
            </Text>
          </View>
        ) : null}

        {/* 핵심 18개 / 전체 40개 전환 스위치 */}
        <View style={styles.modeSwitchContainer}>
          <Tap
            feel="playful"
            onPress={() => setViewMode('core')}
            style={[
              styles.modeSwitchBtn,
              isCoreOnly && styles.modeSwitchBtnCoreActive,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: isCoreOnly }}
            accessibilityLabel="왕초보 핵심 18개만 보기"
          >
            <Text
              style={[
                styles.modeSwitchText,
                isCoreOnly && styles.modeSwitchTextActive,
              ]}
              maxFontSizeMultiplier={1.35}
            >
              핵심 {CORE_IPA_SYMBOLS.length}개
            </Text>
          </Tap>

          <Tap
            feel="playful"
            onPress={() => setViewMode('all')}
            style={[
              styles.modeSwitchBtn,
              !isCoreOnly && styles.modeSwitchBtnAllActive,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: !isCoreOnly }}
            accessibilityLabel="전체 발음기호 40개 모두 보기"
          >
            <Text
              style={[
                styles.modeSwitchText,
                !isCoreOnly && styles.modeSwitchTextActive,
              ]}
              maxFontSizeMultiplier={1.35}
            >
              전체 {IPA_SYMBOLS.length}개 (완전판)
            </Text>
          </Tap>
        </View>

        {/* 진도 Bento 요약 카드 */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryTitleCol}>
              <Text style={styles.summaryLabel} maxFontSizeMultiplier={1.4}>
                {isCoreOnly ? '왕초보 핵심 발음기호 진도' : '전체 미국식 발음기호 진도'}
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

        {/* 헷갈리는 소리 A/B 비교 & 3초 귀 트임 퀴즈 */}
        <MinimalPairTrainer />

        {/* 카테고리별 발음기호 Bento 섹션 */}
        <SpringReveal
          triggerKey={viewMode}
          distance={10}
          feel="gentle"
          style={styles.categoriesStack}
        >
          {visibleCategories.map(({ category, symbols }, index) => {
            const learnedInCategory = symbols.filter((s) =>
              learnedSymbolIds.includes(s.id)
            ).length;
            const subtitle =
              isCoreOnly && category.subtitleCoreKo
                ? category.subtitleCoreKo
                : category.subtitleKo;
            const accent = CATEGORY_ACCENTS[category.id] ?? {
              soft: COLORS.tint,
              text: COLORS.primaryDark,
              solid: COLORS.primary,
            };

            return (
              <View key={category.id} style={styles.categorySection}>
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryTitleBlock}>
                    <View style={styles.categoryStepRow}>
                      <View
                        style={[
                          styles.categoryStepPill,
                          { backgroundColor: accent.soft },
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryStepPillText,
                            { color: accent.text },
                          ]}
                          maxFontSizeMultiplier={1.3}
                        >
                          {index + 1}단계
                        </Text>
                      </View>
                      <Text style={styles.categoryStep} maxFontSizeMultiplier={1.4}>
                        {category.titleKo}
                      </Text>
                      <InfoTipButton
                        open={openCategoryInfoId === category.id}
                        onToggle={() =>
                          setOpenCategoryInfoId((prev) =>
                            prev === category.id ? null : category.id
                          )
                        }
                        accessibilityLabel={`${category.titleKo} 설명 보기`}
                      />
                    </View>
                  </View>

                  <View
                    style={[
                      styles.categoryProgressBadge,
                      { backgroundColor: accent.soft },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryProgressText,
                        { color: accent.text },
                      ]}
                      maxFontSizeMultiplier={1.35}
                    >
                      {learnedInCategory} / {symbols.length} 익힘
                    </Text>
                  </View>
                </View>

                <InfoTipBox
                  visible={openCategoryInfoId === category.id}
                  text={subtitle}
                  variant="surface"
                  onClose={() => setOpenCategoryInfoId(null)}
                />

                <View style={styles.grid}>
                  {symbols.map((symbol) => {
                    const isLearned = learnedSymbolIds.includes(symbol.id);
                    const previewSound = symbol.ipa.replace(/\//g, '');
                    const quickPlayKey = `sym:quick:${symbol.id}`;
                    const isQuickPlaying = activeKey === quickPlayKey;

                    return (
                      <Tap
                        key={symbol.id}
                        feel="gentle"
                        onPress={() => setSelectedSymbol(symbol)}
                        style={[
                          styles.symbolCard,
                          isLearned && styles.symbolCardLearned,
                          isQuickPlaying && styles.symbolCardPlaying,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`${symbol.ipa} ${symbol.titleKo} ${
                          isLearned ? '익힘 완료' : '학습하기'
                        }`}
                      >
                        <View style={styles.symbolCardTop}>
                          <Text
                            style={[styles.symbolIpa, { color: accent.text }]}
                            maxFontSizeMultiplier={1.35}
                          >
                            {symbol.ipa}
                          </Text>
                          <View style={styles.badgeRow}>
                            {!isCoreOnly && symbol.isCore ? (
                              <View style={styles.coreTag}>
                                <Text
                                  style={styles.coreTagText}
                                  maxFontSizeMultiplier={1.25}
                                >
                                  핵심
                                </Text>
                              </View>
                            ) : null}
                            {isLearned ? (
                              <View style={styles.doneTag}>
                                <CheckCircle
                                  size={18}
                                  color={COLORS.success}
                                  weight="fill"
                                />
                              </View>
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
                        <View style={styles.symbolCardBottomRow}>
                          <Text
                            style={styles.symbolExamplePreview}
                            numberOfLines={1}
                            maxFontSizeMultiplier={1.4}
                          >
                            {symbol.titleKo}
                          </Text>

                          {/* 빠른 소리 듣기 아이콘 버튼 */}
                          <Tap
                            feel="snappy"
                            pressedScale={0.86}
                            onPress={(e) => {
                              e.stopPropagation();
                              void playNormal(previewSound, { key: quickPlayKey });
                            }}
                            style={styles.quickPlayBtn}
                            accessibilityRole="button"
                            accessibilityLabel={`${symbol.ipa} 소리 바로 듣기`}
                          >
                            {isQuickPlaying ? (
                              <SpeakerHigh size={18} color={COLORS.primary} weight="fill" />
                            ) : (
                              <SpeakerLow size={18} color={accent.text} />
                            )}
                          </Tap>
                        </View>
                      </Tap>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </SpringReveal>
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
    padding: SPACING.sm,
    paddingBottom: LAYOUT.floatingTabClearance,
    gap: SPACING.sm,
  },
  categoriesStack: {
    gap: SPACING.sm,
  },
  welcomeBanner: {
    backgroundColor: COLORS.indigoSoft,
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    gap: SPACING.xs,
    ...SHADOW.card,
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
    fontSize: TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.indigoText,
  },
  dismissBtn: {
    width: TOUCH.minTarget,
    height: TOUCH.minTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeBody: {
    fontSize: TYPOGRAPHY.body,
    lineHeight: 21,
    color: COLORS.text,
  },
  modeSwitchContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 6,
    gap: 6,
    ...SHADOW.card,
  },
  modeSwitchBtn: {
    flex: 1,
    minHeight: TOUCH.minTarget,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  modeSwitchBtnCoreActive: {
    backgroundColor: COLORS.gold,
  },
  modeSwitchBtnAllActive: {
    backgroundColor: COLORS.purple,
  },
  modeSwitchText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  modeSwitchTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    gap: SPACING.sm,
    ...SHADOW.card,
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
    fontSize: TYPOGRAPHY.body,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  summaryCount: {
    fontSize: TYPOGRAPHY.screenTitle,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  percentPill: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  percentPillText: {
    fontSize: TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.text,
  },
  progressTrack: {
    height: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
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
    gap: 4,
  },
  categoryStepRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  categoryStepPill: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  categoryStepPillText: {
    fontSize: 12,
    fontWeight: '500',
  },
  categoryStep: {
    fontSize: TYPOGRAPHY.sectionTitle,
    fontWeight: '700',
    color: COLORS.text,
  },
  categorySubtitle: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textMuted,
  },
  categoryProgressBadge: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  categoryProgressText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
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
    minHeight: 112,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    justifyContent: 'space-between',
    gap: 5,
    ...SHADOW.card,
  },
  symbolCardLearned: {
    backgroundColor: COLORS.card,
  },
  symbolCardTop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
  },
  symbolIpa: {
    fontSize: TYPOGRAPHY.word,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coreTag: {
    backgroundColor: COLORS.goldSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  coreTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.goldText,
  },
  doneTag: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbolKoHint: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.text,
  },
  symbolCardBottomRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  symbolExamplePreview: {
    flex: 1,
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textMuted,
    fontWeight: '400',
  },
  symbolCardPlaying: {
    backgroundColor: COLORS.tint,
  },
  quickPlayBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
