import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { RhythmBlocks } from '../../components/RhythmBlocks';
import { SymbolDetailSheet } from '../../components/SymbolDetailSheet';
import { IPA_SYMBOL_BY_ID } from '../../data/categories';
import {
  CORE_WORDS,
  getSimilarFallbackWords,
  RECOMMENDED_WORDS,
  searchCoreWords,
} from '../../data/words';
import { useSpeechAudio } from '../../hooks/useSpeechAudio';
import { useLearningStore } from '../../store/useLearningStore';
import { COLORS, RADIUS, SPACING, TOUCH, TYPOGRAPHY } from '../../theme/tokens';
import type { CoreWord, IpaSymbol } from '../../types/learning';

export default function WordReaderScreen() {
  const [query, setQuery] = useState('');
  const [selectedWord, setSelectedWord] = useState<CoreWord>(
    RECOMMENDED_WORDS[0] ?? CORE_WORDS[0]
  );
  const [activeSymbol, setActiveSymbol] = useState<IpaSymbol | null>(null);

  const showKoPronunciation = useLearningStore(
    (state) => state.showKoPronunciation
  );
  const setShowKoPronunciation = useLearningStore(
    (state) => state.setShowKoPronunciation
  );

  const { playNormal, playSlow, activeKey } = useSpeechAudio();

  const trimmedQuery = query.trim();

  const searchResults = useMemo(() => {
    if (!trimmedQuery) return [];
    return searchCoreWords(trimmedQuery);
  }, [trimmedQuery]);

  const fallbackRecommendations = useMemo(() => {
    if (!trimmedQuery || searchResults.length > 0) return [];
    return getSimilarFallbackWords(trimmedQuery, CORE_WORDS, 4);
  }, [trimmedQuery, searchResults.length]);

  const displayedWord: CoreWord | null = useMemo(() => {
    if (!trimmedQuery) return selectedWord;
    if (searchResults.length === 0) return null;
    const stillInResults = searchResults.find((w) => w.id === selectedWord.id);
    return stillInResults ?? searchResults[0];
  }, [trimmedQuery, searchResults, selectedWord]);

  const handleSelectWord = (word: CoreWord) => {
    setSelectedWord(word);
    setQuery('');
  };

  const normalKey = displayedWord ? `word:${displayedWord.id}:normal` : '';
  const slowKey = displayedWord ? `word:${displayedWord.id}:slow` : '';
  const fallbackSlowKey = `fallback:${trimmedQuery.toLowerCase()}:slow`;

  const isNormalPlaying = Boolean(displayedWord && activeKey === normalKey);
  const isSlowPlaying = Boolean(displayedWord && activeKey === slowKey);
  const isFallbackSlowPlaying = activeKey === fallbackSlowKey;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 검색 Bento 카드 */}
        <View style={styles.searchCard}>
          <Text style={styles.searchLabel}>영단어 또는 한글 뜻 검색</Text>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={24} color={COLORS.primary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="예: banana 또는 바나나"
              placeholderTextColor={COLORS.textMuted}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="영단어 또는 한글 뜻 입력창"
            />
            {query.length > 0 ? (
              <Pressable
                onPress={() => setQuery('')}
                style={({ pressed }) => [
                  styles.clearBtn,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="검색어 지우기"
              >
                <Ionicons name="close-circle" size={20} color={COLORS.text} />
                <Text style={styles.clearBtnText}>지우기</Text>
              </Pressable>
            ) : null}
          </View>

          {/* 추천 기초 단어 칩 */}
          <View style={styles.chipsSection}>
            <Text style={styles.chipsLabel}>바로 눌러보는 추천 기초 단어</Text>
            <View style={styles.chipsWrap}>
              {RECOMMENDED_WORDS.map((item) => {
                const isSelected =
                  !trimmedQuery && displayedWord?.id === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => handleSelectWord(item)}
                    style={({ pressed }) => [
                      styles.wordChip,
                      isSelected && styles.wordChipSelected,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.word} ${item.meaningKo} 선택`}
                  >
                    <Text
                      style={[
                        styles.wordChipText,
                        isSelected && styles.wordChipTextSelected,
                      ]}
                    >
                      {item.word} ({item.meaningKo})
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* 다중 검색 결과 선택 바 */}
        {trimmedQuery && searchResults.length > 1 ? (
          <View style={styles.resultsBar}>
            <Text style={styles.resultsBarTitle}>
              검색 결과 {searchResults.length}개 (눌러서 선택)
            </Text>
            <View style={styles.chipsWrap}>
              {searchResults.slice(0, 8).map((item) => {
                const isSelected = displayedWord?.id === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setSelectedWord(item)}
                    style={({ pressed }) => [
                      styles.wordChip,
                      isSelected && styles.wordChipSelected,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.word} ${item.meaningKo} 보기`}
                  >
                    <Text
                      style={[
                        styles.wordChipText,
                        isSelected && styles.wordChipTextSelected,
                      ]}
                    >
                      {item.word} · {item.meaningKo}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* 미등록 단어 검색 실패 폴백 카드 */}
        {trimmedQuery && searchResults.length === 0 ? (
          <View style={styles.fallbackCard}>
            <View style={styles.fallbackHeader}>
              <Ionicons
                name="information-circle"
                size={28}
                color={COLORS.accent}
              />
              <Text style={styles.fallbackTitle}>아직 준비 중인 단어예요</Text>
            </View>
            <Text style={styles.fallbackBody}>
              &ldquo;{trimmedQuery}&rdquo; 단어는 아직 기초 단어장에 등록되지 않았어요.
              먼저 소리를 천천히 들어보시거나 아래 비슷한 기초 단어를 눌러 보세요.
            </Text>

            <Pressable
              onPress={() => playSlow(trimmedQuery, { key: fallbackSlowKey })}
              style={({ pressed }) => [
                styles.primaryBtn,
                isFallbackSlowPlaying && styles.primaryBtnActive,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${trimmedQuery} 천천히 소리만 먼저 듣기`}
            >
              <Ionicons name="volume-high" size={24} color={COLORS.white} />
              <Text style={styles.primaryBtnText}>
                {isFallbackSlowPlaying
                  ? '천천히 소리 재생 중...'
                  : '천천히 소리만 먼저 듣기'}
              </Text>
            </Pressable>

            <View style={styles.fallbackSuggestions}>
              <Text style={styles.chipsLabel}>비슷한 기초 단어 추천</Text>
              <View style={styles.chipsWrap}>
                {fallbackRecommendations.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => handleSelectWord(item)}
                    style={({ pressed }) => [
                      styles.wordChip,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.word} ${item.meaningKo} 학습하기`}
                  >
                    <Text style={styles.wordChipText}>
                      {item.word} ({item.meaningKo})
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        ) : null}

        {/* 선택된 단어 해독기 Bento 카드 */}
        {displayedWord ? (
          <>
            <View style={styles.wordHeroCard}>
              <View style={styles.wordHeaderRow}>
                <View style={styles.wordTitleGroup}>
                  <Text style={styles.wordHero}>{displayedWord.word}</Text>
                  <Text style={styles.wordMeaning}>
                    {displayedWord.meaningKo}
                  </Text>
                </View>
                <View style={styles.ipaPill}>
                  <Text style={styles.ipaPillText}>{displayedWord.ipa}</Text>
                </View>
              </View>

              {/* 한글 발음 힌트 토글 */}
              <View style={styles.toggleBox}>
                <View style={styles.toggleTextGroup}>
                  <Text style={styles.toggleLabel}>한글 발음 힌트 보기</Text>
                  {showKoPronunciation ? (
                    <Text style={styles.koPronunciationText}>
                      {displayedWord.koPronunciation}
                    </Text>
                  ) : (
                    <Text style={styles.koHiddenText}>
                      꺼짐 (발음기호와 소리에 집중해요)
                    </Text>
                  )}
                </View>
                <View style={styles.switchColumn}>
                  <Switch
                    value={showKoPronunciation}
                    onValueChange={setShowKoPronunciation}
                    trackColor={{
                      false: COLORS.border,
                      true: COLORS.primary,
                    }}
                    thumbColor={COLORS.white}
                    accessibilityLabel="한글 발음 힌트 표시 켜기 끄기"
                  />
                  <Text style={styles.switchStateText}>
                    {showKoPronunciation ? '켜짐' : '꺼짐'}
                  </Text>
                </View>
              </View>

              {/* 1.0x 보통 속도 / 0.6x 천천히 듣기 버튼 */}
              <View style={styles.audioButtonsRow}>
                <Pressable
                  onPress={() =>
                    playNormal(displayedWord.word, {
                      audioAsset: displayedWord.audioAsset,
                      key: normalKey,
                    })
                  }
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    styles.audioBtnFlex,
                    isNormalPlaying && styles.primaryBtnActive,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${displayedWord.word} 보통 속도 듣기`}
                >
                  <Ionicons name="volume-high" size={24} color={COLORS.white} />
                  <Text style={styles.primaryBtnText}>
                    {isNormalPlaying ? '재생 중...' : '보통 속도 (1.0x)'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    playSlow(displayedWord.word, { key: slowKey })
                  }
                  style={({ pressed }) => [
                    styles.slowBtn,
                    styles.audioBtnFlex,
                    isSlowPlaying && styles.slowBtnActive,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${displayedWord.word} 천천히 듣기`}
                >
                  <Ionicons
                    name="speedometer-outline"
                    size={24}
                    color={COLORS.primaryDark}
                  />
                  <Text style={styles.slowBtnText}>
                    {isSlowPlaying ? '천천히 중...' : '천천히 (0.6x)'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* 강세 리듬 블록 카드 */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>음절별 강약(강세) 리듬</Text>
              <Text style={styles.sectionGuide}>
                노란 테두리(⬤) 음절은 크고 또렷하게, 나머지 음절은 힘을 빼고 부드럽게
                읽어 보세요.
              </Text>
              <RhythmBlocks
                syllables={displayedWord.syllables}
                showKoHint={showKoPronunciation}
              />
            </View>

            {/* 기호 역추적 카드 (Tab 1 바텀시트 연동) */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>이 단어의 핵심 발음기호</Text>
              <Text style={styles.sectionGuide}>
                기호 버튼을 누르면 입 모양과 소리 내는 법을 바로 확인할 수 있어요.
              </Text>
              <View style={styles.symbolChipsWrap}>
                {displayedWord.symbolIds.map((symbolId) => {
                  const sym = IPA_SYMBOL_BY_ID[symbolId];
                  if (!sym) return null;
                  return (
                    <Pressable
                      key={sym.id}
                      onPress={() => setActiveSymbol(sym)}
                      style={({ pressed }) => [
                        styles.symbolBacktrackChip,
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${sym.ipa} ${sym.titleKo} 읽는 법 보기`}
                    >
                      <Text style={styles.symbolBacktrackIpa}>{sym.ipa}</Text>
                      <Text style={styles.symbolBacktrackHint}>
                        {sym.koHint}
                      </Text>
                      <View style={styles.symbolBacktrackAction}>
                        <Ionicons
                          name="help-circle-outline"
                          size={18}
                          color={COLORS.primaryDark}
                        />
                        <Text style={styles.symbolBacktrackActionText}>
                          읽는 법
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* 기호 역추적 바텀시트 (Tab 1 공용 컴포넌트) */}
      <SymbolDetailSheet
        symbol={activeSymbol}
        visible={activeSymbol !== null}
        onClose={() => setActiveSymbol(null)}
        contextLabel={
          displayedWord
            ? `'${displayedWord.word}' 단어에 쓰인 발음기호`
            : '기호 역추적 안내'
        }
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
  searchCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  searchLabel: {
    fontSize: TYPOGRAPHY.bodyLarge,
    fontWeight: '800',
    color: COLORS.text,
  },
  searchRow: {
    minHeight: TOUCH.recommendedHeight,
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderWidth: 1.5,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.bodyLarge,
    color: COLORS.text,
    paddingVertical: 10,
  },
  clearBtn: {
    minHeight: TOUCH.minTarget,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearBtnText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.text,
  },
  chipsSection: {
    marginTop: 6,
    gap: 8,
  },
  chipsLabel: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wordChip: {
    minHeight: TOUCH.minTarget,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
  },
  wordChipSelected: {
    backgroundColor: COLORS.tint,
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  wordChipText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.text,
  },
  wordChipTextSelected: {
    color: COLORS.primaryDark,
  },
  resultsBar: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  resultsBarTitle: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  fallbackCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.accent,
    borderWidth: 1.5,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  fallbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fallbackTitle: {
    fontSize: TYPOGRAPHY.sectionTitle,
    fontWeight: '800',
    color: COLORS.accentText,
  },
  fallbackBody: {
    fontSize: TYPOGRAPHY.body,
    lineHeight: 28,
    color: COLORS.text,
  },
  fallbackSuggestions: {
    gap: 8,
  },
  wordHeroCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  wordHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  wordTitleGroup: {
    flex: 1,
    gap: 4,
  },
  wordHero: {
    fontSize: TYPOGRAPHY.wordHero,
    fontWeight: '800',
    color: COLORS.text,
  },
  wordMeaning: {
    fontSize: TYPOGRAPHY.sectionTitle,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  ipaPill: {
    backgroundColor: COLORS.tint,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  ipaPillText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  toggleBox: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  toggleTextGroup: {
    flex: 1,
    gap: 4,
  },
  toggleLabel: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  koPronunciationText: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  koHiddenText: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textMuted,
  },
  switchColumn: {
    alignItems: 'center',
    gap: 2,
  },
  switchStateText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  audioButtonsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  audioBtnFlex: {
    flex: 1,
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
  sectionCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sectionTitle,
    fontWeight: '800',
    color: COLORS.text,
  },
  sectionGuide: {
    fontSize: TYPOGRAPHY.body,
    lineHeight: 26,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  symbolChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  symbolBacktrackChip: {
    minHeight: TOUCH.recommendedHeight,
    minWidth: '47%',
    flexGrow: 1,
    backgroundColor: COLORS.background,
    borderColor: COLORS.primary,
    borderWidth: 1.5,
    borderRadius: RADIUS.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 4,
  },
  symbolBacktrackIpa: {
    fontSize: TYPOGRAPHY.ipa,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  symbolBacktrackHint: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.text,
  },
  symbolBacktrackAction: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  symbolBacktrackActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  pressed: {
    opacity: 0.82,
  },
});
