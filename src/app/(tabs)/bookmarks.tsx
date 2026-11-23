import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SymbolDetailSheet } from '../../components/SymbolDetailSheet';
import { IPA_SYMBOL_BY_ID } from '../../data/categories';
import { useSpeechAudio } from '../../hooks/useSpeechAudio';
import { useLearningStore } from '../../store/useLearningStore';
import { useWordCacheStore } from '../../store/useWordCacheStore';
import { COLORS, RADIUS, SPACING, TOUCH, TYPOGRAPHY } from '../../theme/tokens';
import type { CoreWord, IpaSymbol } from '../../types/learning';

type BookmarkFilter = 'all' | 'words' | 'symbols';

export default function BookmarksScreen() {
  const [filter, setFilter] = useState<BookmarkFilter>('all');
  const [activeSymbol, setActiveSymbol] = useState<IpaSymbol | null>(null);

  const { playNormal, playSlow, stop, activeKey } = useSpeechAudio();

  const learnedSymbolIds = useLearningStore((state) => state.learnedSymbolIds);
  const bookmarkedSymbolIds = useLearningStore(
    (state) => state.bookmarkedSymbolIds
  );
  const showKoPronunciation = useLearningStore(
    (state) => state.showKoPronunciation
  );
  const learningHasHydrated = useLearningStore((state) => state.hasHydrated);

  const cachedWords = useWordCacheStore((state) => state.cachedWords);
  const bookmarkedWordKeys = useWordCacheStore(
    (state) => state.bookmarkedWordKeys
  );
  const cacheHasHydrated = useWordCacheStore((state) => state.hasHydrated);
  const toggleWordBookmark = useWordCacheStore(
    (state) => state.toggleWordBookmark
  );
  const setActiveWord = useWordCacheStore((state) => state.setActiveWord);

  useFocusEffect(
    useCallback(() => {
      return () => {
        stop();
      };
    }, [stop])
  );

  const isHydrated = learningHasHydrated && cacheHasHydrated;

  const bookmarkedWords: CoreWord[] = bookmarkedWordKeys
    .map((key) => cachedWords[key])
    .filter((item): item is CoreWord => Boolean(item));

  const bookmarkedSymbols: IpaSymbol[] = bookmarkedSymbolIds
    .map((id) => IPA_SYMBOL_BY_ID[id])
    .filter((item): item is IpaSymbol => Boolean(item));

  const totalCount = bookmarkedWords.length + bookmarkedSymbols.length;

  const showWords =
    (filter === 'all' || filter === 'words') && bookmarkedWords.length > 0;
  const showSymbols =
    (filter === 'all' || filter === 'symbols') && bookmarkedSymbols.length > 0;

  const isEmptyForCurrentFilter =
    isHydrated &&
    ((filter === 'all' && totalCount === 0) ||
      (filter === 'words' && bookmarkedWords.length === 0) ||
      (filter === 'symbols' && bookmarkedSymbols.length === 0));

  const handleOpenWordDetail = (word: CoreWord) => {
    stop();
    setActiveWord(word);
    router.navigate('/words');
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 필터 탭 바 */}
        <View style={styles.filterRow}>
          {(
            [
              { id: 'all', label: `전체 ${totalCount}` },
              { id: 'words', label: `단어 ${bookmarkedWords.length}` },
              { id: 'symbols', label: `발음기호 ${bookmarkedSymbols.length}` },
            ] as const
          ).map((tab) => {
            const isActive = filter === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setFilter(tab.id)}
                style={({ pressed }) => [
                  styles.filterPill,
                  isActive && styles.filterPillActive,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isActive && styles.filterPillTextActive,
                  ]}
                  maxFontSizeMultiplier={1.3}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* 빈 상태 카드 */}
        {isEmptyForCurrentFilter ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons
                name="bookmark-outline"
                size={36}
                color={COLORS.accent}
              />
            </View>
            <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.4}>
              {filter === 'words'
                ? '저장한 단어가 없어요'
                : filter === 'symbols'
                  ? '저장한 발음기호가 없어요'
                  : '저장한 북마크가 없어요'}
            </Text>
            <Text style={styles.emptyBody} maxFontSizeMultiplier={1.45}>
              자주 헷갈리는 단어와 발음기호에서 북마크 아이콘을 눌러 모아 보세요.
            </Text>

            <View style={styles.emptyActions}>
              {filter !== 'symbols' ? (
                <Pressable
                  onPress={() => router.navigate('/words')}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    styles.actionBtnFlex,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="단어 바로 읽기로 이동"
                >
                  <Ionicons name="book-outline" size={22} color={COLORS.white} />
                  <Text style={styles.primaryBtnText} maxFontSizeMultiplier={1.3}>
                    단어 읽기
                  </Text>
                </Pressable>
              ) : null}

              {filter !== 'words' ? (
                <Pressable
                  onPress={() => router.navigate('/')}
                  style={({ pressed }) => [
                    styles.slowBtn,
                    styles.actionBtnFlex,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="발음기호 기초로 이동"
                >
                  <Ionicons
                    name="volume-high-outline"
                    size={22}
                    color={COLORS.primaryDark}
                  />
                  <Text style={styles.slowBtnText} maxFontSizeMultiplier={1.3}>
                    발음기호
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* 북마크한 단어 목록 */}
        {showWords ? (
          <View style={styles.section}>
            {filter === 'all' ? (
              <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.4}>
                단어 ({bookmarkedWords.length})
              </Text>
            ) : null}

            <View style={styles.wordList}>
              {bookmarkedWords.map((item) => {
                const normalKey = `bm:word:${item.id}:normal`;
                const slowKey = `bm:word:${item.id}:slow`;
                const isNormalPlaying = activeKey === normalKey;
                const isSlowPlaying = activeKey === slowKey;

                return (
                  <View key={item.id} style={styles.wordCard}>
                    <View style={styles.wordCardTop}>
                      <Pressable
                        onPress={() => handleOpenWordDetail(item)}
                        style={({ pressed }) => [
                          styles.wordInfoPress,
                          pressed && styles.pressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`${item.word} ${item.meaningKo} 자세히 보기`}
                      >
                        <View style={styles.wordTitleRow}>
                          <Text style={styles.wordText} maxFontSizeMultiplier={1.35}>
                            {item.word}
                          </Text>
                          <Ionicons
                            name="chevron-forward"
                            size={20}
                            color={COLORS.textMuted}
                          />
                        </View>
                        <Text style={styles.meaningText} maxFontSizeMultiplier={1.4}>
                          {item.meaningKo}
                        </Text>
                        <View style={styles.metaRow}>
                          <Text style={styles.ipaText} maxFontSizeMultiplier={1.35}>
                            {item.ipa}
                          </Text>
                          {showKoPronunciation && item.koPronunciation ? (
                            <Text
                              style={styles.koPronText}
                              maxFontSizeMultiplier={1.4}
                            >
                              · {item.koPronunciation}
                            </Text>
                          ) : null}
                        </View>
                      </Pressable>

                      <Pressable
                        onPress={() => toggleWordBookmark(item)}
                        style={({ pressed }) => [
                          styles.bookmarkBtn,
                          pressed && styles.pressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: true }}
                        accessibilityLabel={`${item.word} 북마크 해제`}
                      >
                        <Ionicons
                          name="bookmark"
                          size={24}
                          color={COLORS.accent}
                        />
                      </Pressable>
                    </View>

                    <View style={styles.audioRow}>
                      <Pressable
                        onPress={() =>
                          playNormal(item.word, {
                            audioAsset: item.audioAsset,
                            audioUrl: item.audioUrl,
                            key: normalKey,
                          })
                        }
                        style={({ pressed }) => [
                          styles.primaryBtn,
                          styles.actionBtnFlex,
                          isNormalPlaying && styles.primaryBtnActive,
                          pressed && styles.pressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`${item.word} 보통 속도 듣기`}
                      >
                        <Ionicons
                          name="volume-high"
                          size={22}
                          color={COLORS.white}
                        />
                        <Text
                          style={styles.primaryBtnText}
                          maxFontSizeMultiplier={1.3}
                        >
                          {isNormalPlaying ? '재생 중...' : '보통 속도'}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => playSlow(item.word, { key: slowKey })}
                        style={({ pressed }) => [
                          styles.slowBtn,
                          styles.actionBtnFlex,
                          isSlowPlaying && styles.slowBtnActive,
                          pressed && styles.pressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`${item.word} 천천히 듣기`}
                      >
                        <Ionicons
                          name="speedometer-outline"
                          size={22}
                          color={COLORS.primaryDark}
                        />
                        <Text
                          style={styles.slowBtnText}
                          maxFontSizeMultiplier={1.3}
                        >
                          {isSlowPlaying ? '재생 중...' : '천천히'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* 북마크한 발음기호 목록 */}
        {showSymbols ? (
          <View style={styles.section}>
            {filter === 'all' ? (
              <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.4}>
                발음기호 ({bookmarkedSymbols.length})
              </Text>
            ) : null}

            <View style={styles.symbolGrid}>
              {bookmarkedSymbols.map((symbol) => {
                const isLearned = learnedSymbolIds.includes(symbol.id);

                return (
                  <Pressable
                    key={symbol.id}
                    onPress={() => setActiveSymbol(symbol)}
                    style={({ pressed }) => [
                      styles.symbolCard,
                      isLearned && styles.symbolCardLearned,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${symbol.ipa} ${symbol.titleKo} 자세히 보기`}
                  >
                    <View style={styles.symbolCardTop}>
                      <Text style={styles.symbolIpa} maxFontSizeMultiplier={1.35}>
                        {symbol.ipa}
                      </Text>
                      <View style={styles.symbolCardIcons}>
                        <Ionicons
                          name="bookmark"
                          size={20}
                          color={COLORS.accent}
                        />
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
                      style={styles.symbolExample}
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.4}
                    >
                      예: {symbol.examples[0]?.word} ({symbol.examples[0]?.meaningKo})
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <SymbolDetailSheet
        symbol={activeSymbol}
        visible={activeSymbol !== null}
        onClose={() => setActiveSymbol(null)}
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  filterPill: {
    minHeight: TOUCH.minTarget,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterPillText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.text,
  },
  filterPillTextActive: {
    color: COLORS.white,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.card,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
  },
  emptyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.sectionTitle,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: TYPOGRAPHY.body,
    lineHeight: 28,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  emptyActions: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: 4,
  },
  section: {
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sectionTitle,
    fontWeight: '800',
    color: COLORS.text,
  },
  wordList: {
    gap: SPACING.sm,
  },
  wordCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  wordCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  wordInfoPress: {
    flex: 1,
    gap: 4,
  },
  wordTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  wordText: {
    fontSize: TYPOGRAPHY.word,
    fontWeight: '800',
    color: COLORS.text,
  },
  meaningText: {
    fontSize: TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  ipaText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.primary,
  },
  koPronText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  bookmarkBtn: {
    width: TOUCH.minTarget,
    height: TOUCH.minTarget,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  actionBtnFlex: {
    flexGrow: 1,
    minWidth: 136,
  },
  primaryBtn: {
    minHeight: TOUCH.recommendedHeight,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  primaryBtnActive: {
    backgroundColor: COLORS.primaryDark,
  },
  primaryBtnText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '800',
    color: COLORS.white,
  },
  slowBtn: {
    minHeight: TOUCH.recommendedHeight,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.tint,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  slowBtnActive: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accent,
  },
  slowBtnText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  symbolGrid: {
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
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
  },
  symbolIpa: {
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
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.text,
  },
  symbolExample: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.82,
  },
});
