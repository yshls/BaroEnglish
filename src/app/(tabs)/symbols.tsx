import { IconCircleCheck, IconSparkles, IconVolume, IconVolume2, IconX } from '@tabler/icons-react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SymbolDetailSheet } from '../../components/SymbolDetailSheet';
import {
  CORE_IPA_SYMBOLS,
  getSymbolsByCategory,
  IPA_CATEGORIES,
  IPA_SYMBOLS,
} from '../../data/categories';
import { useSpeechAudio } from '../../hooks/useSpeechAudio';
import { useLearningStore } from '../../store/useLearningStore';
import { COLORS, RADIUS, SHADOW, SPACING, TOUCH, TYPOGRAPHY } from '../../theme/tokens';
import type { IpaSymbol } from '../../types/learning';

type SymbolViewMode = 'all' | 'core';

const CATEGORY_ACCENTS: Record<
  string,
  { soft: string; text: string; solid: string }
> = {
  basic_vowels: {
    soft: COLORS.tint,
    text: COLORS.primaryDark,
    solid: COLORS.primary,
  },
  diphthongs: {
    soft: COLORS.tealSoft,
    text: COLORS.tealText,
    solid: COLORS.teal,
  },
  key_consonants: {
    soft: COLORS.purpleSoft,
    text: COLORS.purpleText,
    solid: COLORS.purple,
  },
  basic_consonants: {
    soft: COLORS.successSoft,
    text: COLORS.successText,
    solid: COLORS.success,
  },
};

export default function IpaSymbolsScreen() {
  const [viewMode, setViewMode] = useState<SymbolViewMode>('all');
  const [selectedSymbol, setSelectedSymbol] = useState<IpaSymbol | null>(null);
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
                <IconSparkles size={24} color={COLORS.indigoText} />
                <Text style={styles.welcomeTitle} maxFontSizeMultiplier={1.4}>
                  바로영어에 오신 걸 환영해요!
                </Text>
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
                <IconX size={20} color={COLORS.indigoText} />
                <Text style={styles.dismissBtnText} maxFontSizeMultiplier={1.3}>
                  닫기
                </Text>
              </Pressable>
            </View>
            <Text style={styles.welcomeBody} maxFontSizeMultiplier={1.5}>
              미국식 영어 발음기호 전체 40개를 모두 담았어요. 처음이라면 위에서
              &apos;핵심 18개&apos;부터 차근차근 눌러 따라 읽어 보세요!
            </Text>
          </View>
        ) : null}

        {/* 핵심 18개 / 전체 40개 전환 스위치 */}
        <View style={styles.modeSwitchContainer}>
          <Pressable
            onPress={() => setViewMode('core')}
            style={({ pressed }) => [
              styles.modeSwitchBtn,
              isCoreOnly && styles.modeSwitchBtnCoreActive,
              pressed && styles.pressed,
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
          </Pressable>

          <Pressable
            onPress={() => setViewMode('all')}
            style={({ pressed }) => [
              styles.modeSwitchBtn,
              !isCoreOnly && styles.modeSwitchBtnAllActive,
              pressed && styles.pressed,
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
          </Pressable>
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

        {/* 카테고리별 발음기호 Bento 섹션 */}
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
                  </View>
                  <Text style={styles.categorySubtitle} maxFontSizeMultiplier={1.45}>
                    {subtitle}
                  </Text>
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

              <View style={styles.grid}>
                {symbols.map((symbol) => {
                  const isLearned = learnedSymbolIds.includes(symbol.id);
                  const previewSound = symbol.ipa.replace(/\//g, '');
                  const quickPlayKey = `sym:quick:${symbol.id}`;
                  const isQuickPlaying = activeKey === quickPlayKey;

                  return (
                    <Pressable
                      key={symbol.id}
                      onPress={() => setSelectedSymbol(symbol)}
                      style={({ pressed }) => [
                        styles.symbolCard,
                        isLearned && styles.symbolCardLearned,
                        isQuickPlaying && styles.symbolCardPlaying,
                        pressed && styles.pressed,
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
                              <IconCircleCheck
                                size={18}
                                color={COLORS.success}
                              />
                              <Text
                                style={styles.doneTagText}
                                maxFontSizeMultiplier={1.25}
                              >
                                익힘
                              </Text>
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
                      <Text
                        style={styles.symbolExamplePreview}
                        numberOfLines={1}
                        maxFontSizeMultiplier={1.4}
                      >
                        {symbol.titleKo}
                      </Text>

                      {/* 빠른 소리 듣기 버튼 (카드 열지 않고 바로 발음 재생) */}
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          void playNormal(previewSound, { key: quickPlayKey });
                        }}
                        style={({ pressed }) => [
                          styles.quickPlayBtn,
                          isQuickPlaying && styles.quickPlayBtnActive,
                          pressed && styles.pressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`${symbol.ipa} 소리 바로 듣기`}
                      >
                        {isQuickPlaying ? (
                          <IconVolume size={16} color={COLORS.white} />
                        ) : (
                          <IconVolume2 size={16} color={accent.text} />
                        )}
                        <Text
                          style={[
                            styles.quickPlayBtnText,
                            { color: isQuickPlaying ? COLORS.white : accent.text },
                          ]}
                          maxFontSizeMultiplier={1.25}
                        >
                          {isQuickPlaying ? '재생 중' : '소리 듣기'}
                        </Text>
                      </Pressable>
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
    backgroundColor: COLORS.indigoSoft,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    gap: SPACING.sm,
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
    minHeight: TOUCH.minTarget,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dismissBtnText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.indigoText,
  },
  welcomeBody: {
    fontSize: TYPOGRAPHY.body,
    lineHeight: 28,
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
    backgroundColor: COLORS.successSoft,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  percentPillText: {
    fontSize: TYPOGRAPHY.bodyLarge,
    fontWeight: '500',
    color: COLORS.successText,
  },
  progressTrack: {
    height: 12,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.success,
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
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  categoryStepPillText: {
    fontSize: 15,
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
    paddingHorizontal: 14,
    paddingVertical: 6,
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
    minHeight: 128,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    justifyContent: 'space-between',
    gap: 6,
    ...SHADOW.card,
  },
  symbolCardLearned: {
    backgroundColor: COLORS.successSoft,
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  coreTagText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.goldText,
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
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.successText,
  },
  symbolKoHint: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.text,
  },
  symbolExamplePreview: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textMuted,
    fontWeight: '400',
  },
  symbolCardPlaying: {
    backgroundColor: COLORS.tint,
  },
  quickPlayBtn: {
    marginTop: 4,
    minHeight: 36,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quickPlayBtnActive: {
    backgroundColor: COLORS.primary,
  },
  quickPlayBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.82,
  },
});
