import { IconBook2, IconBookmark, IconBookmarkFilled, IconChevronRight, IconCircleCheck, IconCircleX, IconGauge, IconPlayerPlay, IconSearch, IconVolume, IconVolume2 } from '@tabler/icons-react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SymbolDetailSheet } from '../../components/SymbolDetailSheet';
import { IPA_SYMBOL_BY_ID } from '../../data/categories';
import { useSpeechAudio } from '../../hooks/useSpeechAudio';
import { useLearningStore } from '../../store/useLearningStore';
import { useWordCacheStore } from '../../store/useWordCacheStore';
import { COLORS, RADIUS, SHADOW, SPACING, TOUCH, TYPOGRAPHY } from '../../theme/tokens';
import type { CoreWord, IpaSymbol } from '../../types/learning';

type BookmarkFilter = 'all' | 'words' | 'symbols';

export default function BookmarksScreen() {
  const [filter, setFilter] = useState<BookmarkFilter>('all');
  const [filterText, setFilterText] = useState('');
  const [activeSymbol, setActiveSymbol] = useState<IpaSymbol | null>(null);
  const navSeqRef = useRef(0);

  const cachedWords = useWordCacheStore((state) => state.cachedWords);
  const bookmarkedWordKeys = useWordCacheStore((state) => state.bookmarkedWordKeys);
  const cacheHasHydrated = useWordCacheStore((state) => state.hasHydrated);
  const toggleBookmark = useWordCacheStore((state) => state.toggleBookmark);

  const learnedSymbolIds = useLearningStore((state) => state.learnedSymbolIds);
  const bookmarkedSymbolIds = useLearningStore((state) => state.bookmarkedSymbolIds);
  const toggleSymbolBookmark = useLearningStore((state) => state.toggleSymbolBookmark);
  const showKoPronunciation = useLearningStore((state) => state.showKoPronunciation);
  const learningHasHydrated = useLearningStore((state) => state.hasHydrated);

  const { playNormal, playSlow, stop, activeKey } = useSpeechAudio();

  useFocusEffect(
    useCallback(() => {
      return () => {
        stop();
      };
    }, [stop])
  );

  const bookmarkedWords = useMemo(() => {
    const keys = Array.isArray(bookmarkedWordKeys) ? bookmarkedWordKeys : [];
    return keys
      .map((k) => cachedWords[k])
      .filter((w): w is CoreWord => Boolean(w));
  }, [bookmarkedWordKeys, cachedWords]);

  const bookmarkedSymbols = useMemo(() => {
    const ids = Array.isArray(bookmarkedSymbolIds) ? bookmarkedSymbolIds : [];
    return ids
      .map((id) => IPA_SYMBOL_BY_ID[id])
      .filter((s): s is IpaSymbol => Boolean(s));
  }, [bookmarkedSymbolIds]);

  const filteredWords = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return bookmarkedWords;
    return bookmarkedWords.filter(
      (item) =>
        item.word.toLowerCase().includes(q) ||
        item.meaningKo.toLowerCase().includes(q) ||
        item.koPronunciation.toLowerCase().includes(q)
    );
  }, [bookmarkedWords, filterText]);

  const filteredSymbols = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return bookmarkedSymbols;
    return bookmarkedSymbols.filter(
      (sym) =>
        sym.ipa.toLowerCase().includes(q) ||
        sym.titleKo.toLowerCase().includes(q) ||
        sym.koHint.toLowerCase().includes(q)
    );
  }, [bookmarkedSymbols, filterText]);

  const handleOpenInReader = (word: string) => {
    stop();
    navSeqRef.current += 1;
    router.push({
      pathname: '/(tabs)',
      params: { word, ts: String(navSeqRef.current) },
    });
  };

  const isHydrated = cacheHasHydrated && learningHasHydrated;
  const totalCount = bookmarkedWords.length + bookmarkedSymbols.length;
  const shouldShowKoHint = learningHasHydrated ? showKoPronunciation : true;

  const showWordsSection =
    (filter === 'all' || filter === 'words') && filteredWords.length > 0;
  const showSymbolsSection =
    (filter === 'all' || filter === 'symbols') && filteredSymbols.length > 0;
  const hasVisibleResults = showWordsSection || showSymbolsSection;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 상단 요약 + 전체/단어/발음기호 필터 탭 */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeaderRow}>
            <View style={styles.summaryTitleCol}>
              <Text style={styles.summaryTitle} maxFontSizeMultiplier={1.4}>
                내가 저장한 북마크
              </Text>
              <Text style={styles.summarySub} maxFontSizeMultiplier={1.4}>
                저장한 영단어와 발음기호를 언제든 꺼내 복습하세요.
              </Text>
            </View>
            <View style={styles.countBadge}>
              <IconBookmarkFilled size={18} color={COLORS.goldText} />
              <Text style={styles.countBadgeText} maxFontSizeMultiplier={1.3}>
                {totalCount}개
              </Text>
            </View>
          </View>

          <View style={styles.filterTabsRow}>
            {(
              [
                { id: 'all', label: `전체 ${totalCount}`, activeBg: COLORS.gold },
                { id: 'words', label: `단어 ${bookmarkedWords.length}`, activeBg: COLORS.primary },
                { id: 'symbols', label: `발음기호 ${bookmarkedSymbols.length}`, activeBg: COLORS.purple },
              ] as const
            ).map((tab) => {
              const isActive = filter === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setFilter(tab.id)}
                  style={({ pressed }) => [
                    styles.filterTabBtn,
                    isActive && { backgroundColor: tab.activeBg },
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                >
                  <Text
                    style={[
                      styles.filterTabText,
                      isActive && styles.filterTabTextActive,
                    ]}
                    maxFontSizeMultiplier={1.3}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {totalCount >= 4 ? (
            <View style={styles.filterInputRow}>
              <IconSearch size={20} color={COLORS.textMuted} />
              <TextInput
                value={filterText}
                onChangeText={setFilterText}
                placeholder="저장한 단어·발음기호 찾기"
                placeholderTextColor={COLORS.textMuted}
                style={styles.filterInput}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={40}
                accessibilityLabel="저장한 항목 검색"
              />
              {filterText.length > 0 ? (
                <Pressable
                  onPress={() => setFilterText('')}
                  style={({ pressed }) => [
                    styles.clearFilterBtn,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="검색어 지우기"
                >
                  <IconCircleX size={22} color={COLORS.textMuted} />
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* 저장 목록 또는 빈 상태 */}
        {!isHydrated ? null : totalCount === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <IconBookmark size={38} color={COLORS.goldText} />
            </View>
            <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.4}>
              아직 저장한 북마크가 없어요
            </Text>
            <Text style={styles.emptyBody} maxFontSizeMultiplier={1.45}>
              공부하다가 다시 보고 싶은 단어 또는 발음기호에서 북마크 아이콘을 눌러
              저장해 두세요. 오프라인에서도 바로 꺼내 들을 수 있어요!
            </Text>
            <View style={styles.emptyCtaRow}>
              <Pressable
                onPress={() => router.push('/(tabs)')}
                style={({ pressed }) => [
                  styles.emptyPrimaryBtn,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="단어 바로 읽기 화면으로 이동"
              >
                <IconBook2 size={20} color={COLORS.white} />
                <Text style={styles.emptyPrimaryBtnText} maxFontSizeMultiplier={1.3}>
                  단어 읽기 가기
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.push('/(tabs)/shorts')}
                style={({ pressed }) => [
                  styles.emptySecondaryBtn,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="발음 쇼츠 화면으로 이동"
              >
                <IconPlayerPlay size={20} color={COLORS.roseText} />
                <Text style={styles.emptySecondaryBtnText} maxFontSizeMultiplier={1.3}>
                  발음 쇼츠 보기
                </Text>
              </Pressable>
            </View>
          </View>
        ) : !hasVisibleResults ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.4}>
              {filterText.trim()
                ? `'${filterText.trim()}'와 일치하는 항목이 없어요`
                : '이 탭에 저장된 항목이 아직 없어요'}
            </Text>
            <Pressable
              onPress={() => {
                setFilter('all');
                setFilterText('');
              }}
              style={({ pressed }) => [
                styles.emptyResetBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="전체 북마크 보기"
            >
              <Text style={styles.emptyResetBtnText} maxFontSizeMultiplier={1.3}>
                전체 북마크 보기
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.sectionsStack}>
            {/* 저장한 단어 섹션 */}
            {showWordsSection ? (
              <View style={styles.listStack}>
                {filter === 'all' ? (
                  <Text style={styles.sectionHeading} maxFontSizeMultiplier={1.35}>
                    저장한 영단어 ({filteredWords.length})
                  </Text>
                ) : null}

                {filteredWords.map((item) => {
                  const normalKey = `bm:${item.id}:normal`;
                  const slowKey = `bm:${item.id}:slow`;
                  const isNormalPlaying = activeKey === normalKey;
                  const isSlowPlaying = activeKey === slowKey;

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.wordCard,
                        (isNormalPlaying || isSlowPlaying) && styles.wordCardActive,
                      ]}
                    >
                      <View style={styles.cardTopRow}>
                        <Pressable
                          style={styles.wordMainPressable}
                          onPress={() => handleOpenInReader(item.word)}
                          accessibilityRole="button"
                          accessibilityLabel={`${item.word} ${item.meaningKo} 자세히 보기`}
                        >
                          <View style={styles.wordHeadingRow}>
                            <Text style={styles.wordText} maxFontSizeMultiplier={1.35}>
                              {item.word}
                            </Text>
                            {item.partOfSpeech ? (
                              <View style={styles.posBadge}>
                                <Text style={styles.posBadgeText} maxFontSizeMultiplier={1.25}>
                                  {item.partOfSpeech}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                          <Text style={styles.meaningText} maxFontSizeMultiplier={1.4}>
                            {item.meaningKo}
                          </Text>
                          <Text style={styles.phoneticText} maxFontSizeMultiplier={1.4}>
                            {item.ipa}
                            {shouldShowKoHint && item.koPronunciation
                              ? `  ·  ${item.koPronunciation}`
                              : ''}
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => {
                            stop();
                            toggleBookmark(item);
                          }}
                          style={({ pressed }) => [
                            styles.removeBookmarkBtn,
                            pressed && styles.pressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`${item.word} 북마크 해제`}
                        >
                          <IconBookmarkFilled size={22} color={COLORS.goldText} />
                        </Pressable>
                      </View>

                      <View style={styles.cardActionsRow}>
                        <Pressable
                          onPress={() =>
                            void playNormal(item.word, {
                              audioAsset: item.audioAsset,
                              audioUrl: item.audioUrl,
                              key: normalKey,
                            })
                          }
                          style={({ pressed }) => [
                            styles.playNormalBtn,
                            isNormalPlaying && styles.playNormalBtnActive,
                            pressed && styles.pressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`${item.word} 보통 속도 듣기`}
                        >
                          {isNormalPlaying ? (
                            <IconVolume size={20} color={COLORS.white} />
                          ) : (
                            <IconVolume2 size={20} color={COLORS.white} />
                          )}
                          <Text style={styles.playNormalBtnText} maxFontSizeMultiplier={1.3}>
                            {isNormalPlaying ? '재생 중' : '듣기'}
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => void playSlow(item.word, { key: slowKey })}
                          style={({ pressed }) => [
                            styles.playSlowBtn,
                            isSlowPlaying && styles.playSlowBtnActive,
                            pressed && styles.pressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`${item.word} 천천히 듣기`}
                        >
                          <IconGauge
                            size={20}
                            color={isSlowPlaying ? COLORS.white : COLORS.tealText}
                          />
                          <Text
                            style={[
                              styles.playSlowBtnText,
                              isSlowPlaying && styles.playNormalBtnText,
                            ]}
                            maxFontSizeMultiplier={1.3}
                          >
                            {isSlowPlaying ? '천천히 중' : '천천히'}
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => handleOpenInReader(item.word)}
                          style={({ pressed }) => [
                            styles.detailBtn,
                            pressed && styles.pressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`${item.word} 강세 리듬과 예문 자세히 보기`}
                        >
                          <Text style={styles.detailBtnText} maxFontSizeMultiplier={1.3}>
                            자세히
                          </Text>
                          <IconChevronRight
                            size={18}
                            color={COLORS.indigoText}
                          />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}

            {/* 저장한 발음기호 섹션 */}
            {showSymbolsSection ? (
              <View style={styles.listStack}>
                {filter === 'all' ? (
                  <Text style={styles.sectionHeading} maxFontSizeMultiplier={1.35}>
                    저장한 발음기호 ({filteredSymbols.length})
                  </Text>
                ) : null}

                {filteredSymbols.map((sym) => {
                  const isLearned = learnedSymbolIds.includes(sym.id);
                  return (
                    <View
                      key={sym.id}
                      style={[
                        styles.symbolCard,
                        isLearned && styles.symbolCardLearned,
                      ]}
                    >
                      <Pressable
                        style={styles.symbolMainPressable}
                        onPress={() => setActiveSymbol(sym)}
                        accessibilityRole="button"
                        accessibilityLabel={`${sym.ipa} ${sym.titleKo} 자세히 보기`}
                      >
                        <View style={styles.symbolHeadingRow}>
                          <Text style={styles.symbolIpaText} maxFontSizeMultiplier={1.35}>
                            {sym.ipa}
                          </Text>
                          <View style={styles.symbolHintBadge}>
                            <Text style={styles.symbolHintBadgeText} maxFontSizeMultiplier={1.3}>
                              {sym.koHint}
                            </Text>
                          </View>
                          {isLearned ? (
                            <View style={styles.learnedTag}>
                              <IconCircleCheck
                                size={16}
                                color={COLORS.success}
                              />
                              <Text style={styles.learnedTagText} maxFontSizeMultiplier={1.25}>
                                익힘
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.symbolTitleText} maxFontSizeMultiplier={1.4}>
                          {sym.titleKo}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => toggleSymbolBookmark(sym.id)}
                        style={({ pressed }) => [
                          styles.removeBookmarkBtn,
                          pressed && styles.pressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`${sym.ipa} 북마크 해제`}
                      >
                        <IconBookmarkFilled size={22} color={COLORS.goldText} />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      <SymbolDetailSheet
        symbol={activeSymbol}
        visible={activeSymbol !== null}
        onClose={() => setActiveSymbol(null)}
        contextLabel="북마크한 발음기호"
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
    gap: SPACING.md,
  },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    gap: SPACING.md,
    ...SHADOW.card,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  summaryTitleCol: {
    flex: 1,
    gap: 4,
  },
  summaryTitle: {
    fontSize: TYPOGRAPHY.sectionTitle,
    fontWeight: '700',
    color: COLORS.text,
  },
  summarySub: {
    fontSize: TYPOGRAPHY.body,
    lineHeight: 26,
    color: COLORS.textMuted,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.goldSoft,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
  },
  countBadgeText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.goldText,
  },
  filterTabsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: 4,
    gap: 4,
  },
  filterTabBtn: {
    flex: 1,
    minHeight: TOUCH.minTarget,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  filterTabText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  filterTabTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  filterInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    minHeight: TOUCH.minTarget,
  },
  filterInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.body,
    color: COLORS.text,
    paddingVertical: 10,
  },
  clearFilterBtn: {
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
    ...SHADOW.card,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.sectionTitle,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: TYPOGRAPHY.body,
    lineHeight: 28,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  emptyCtaRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: 4,
  },
  emptyPrimaryBtn: {
    flexGrow: 1,
    minWidth: 140,
    minHeight: TOUCH.recommendedHeight,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: SPACING.md,
  },
  emptyPrimaryBtnText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.white,
  },
  emptySecondaryBtn: {
    flexGrow: 1,
    minWidth: 140,
    minHeight: TOUCH.recommendedHeight,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.roseSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: SPACING.md,
  },
  emptySecondaryBtnText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.roseText,
  },
  emptyResetBtn: {
    minWidth: 160,
    minHeight: TOUCH.recommendedHeight,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.goldSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  emptyResetBtnText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.goldText,
  },
  sectionsStack: {
    gap: SPACING.lg,
  },
  sectionHeading: {
    fontSize: TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.text,
    paddingHorizontal: 4,
  },
  listStack: {
    gap: SPACING.sm,
  },
  wordCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    gap: SPACING.md,
    ...SHADOW.card,
  },
  wordCardActive: {
    backgroundColor: COLORS.tint,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  wordMainPressable: {
    flex: 1,
    gap: 4,
  },
  wordHeadingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  wordText: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  posBadge: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  posBadgeText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  meaningText: {
    fontSize: TYPOGRAPHY.bodyLarge,
    fontWeight: '500',
    color: COLORS.primaryDark,
  },
  phoneticText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  removeBookmarkBtn: {
    minWidth: TOUCH.minTarget,
    minHeight: TOUCH.minTarget,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  playNormalBtn: {
    flexGrow: 1,
    minWidth: 96,
    minHeight: TOUCH.minTarget,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  playNormalBtnActive: {
    backgroundColor: COLORS.primaryDark,
  },
  playNormalBtnText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.white,
  },
  playSlowBtn: {
    flexGrow: 1,
    minWidth: 96,
    minHeight: TOUCH.minTarget,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.tealSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  playSlowBtnActive: {
    backgroundColor: COLORS.teal,
  },
  playSlowBtnText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.tealText,
  },
  detailBtn: {
    minWidth: 90,
    minHeight: TOUCH.minTarget,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.indigoSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
  },
  detailBtnText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.indigoText,
  },
  symbolCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    ...SHADOW.card,
  },
  symbolCardLearned: {
    backgroundColor: COLORS.successSoft,
  },
  symbolMainPressable: {
    flex: 1,
    gap: 6,
  },
  symbolHeadingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  symbolIpaText: {
    fontSize: TYPOGRAPHY.word,
    fontWeight: '700',
    color: COLORS.purpleText,
  },
  symbolHintBadge: {
    backgroundColor: COLORS.purpleSoft,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  symbolHintBadgeText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.purpleText,
  },
  learnedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  learnedTagText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.successText,
  },
  symbolTitleText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '400',
    color: COLORS.text,
  },
  pressed: {
    opacity: 0.82,
  },
});
