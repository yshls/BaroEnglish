import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
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
import { useSpeechAudio } from '../../hooks/useSpeechAudio';
import {
  containsKorean,
  fetchWordSuggestions,
  lookupWordFromApis,
} from '../../services/wordApi';
import { useLearningStore } from '../../store/useLearningStore';
import {
  STARTER_SEARCH_CHIPS,
  useWordCacheStore,
} from '../../store/useWordCacheStore';
import { COLORS, RADIUS, SPACING, TOUCH, TYPOGRAPHY } from '../../theme/tokens';
import type { CoreWord, IpaSymbol } from '../../types/learning';

export default function WordReaderScreen() {
  const [query, setQuery] = useState('');
  const [displayedWord, setDisplayedWord] = useState<CoreWord | null>(null);
  const [activeSymbol, setActiveSymbol] = useState<IpaSymbol | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [failedQuery, setFailedQuery] = useState<string | null>(null);
  const [failedErrorType, setFailedErrorType] = useState<'not_found' | 'network' | null>(null);
  const [fallbackSuggestions, setFallbackSuggestions] = useState<string[]>([]);

  const requestSeqRef = useRef(0);
  const didInitialLoadRef = useRef(false);

  const showKoPronunciation = useLearningStore((state) => state.showKoPronunciation);
  const setShowKoPronunciation = useLearningStore(
    (state) => state.setShowKoPronunciation
  );

  const cachedWords = useWordCacheStore((state) => state.cachedWords);
  const recentWords = useWordCacheStore((state) => state.recentWords);
  const saveWord = useWordCacheStore((state) => state.saveWord);
  const findCachedByQuery = useWordCacheStore((state) => state.findCachedByQuery);

  const { playNormal, playSlow, activeKey } = useSpeechAudio();

  const executeLookup = useCallback(
    async (rawInput: string, options?: { keepInput?: boolean }) => {
      const trimmed = rawInput.trim();
      if (!trimmed) return;

      Keyboard.dismiss();
      setSuggestions([]);
      setFailedQuery(null);
      setFailedErrorType(null);
      setFallbackSuggestions([]);

      // 1) 로컬 AsyncStorage 캐시 먼저 확인 (0ms 즉시 표시 & 오프라인 지원)
      const cached = findCachedByQuery(trimmed);
      if (cached) {
        setDisplayedWord(cached);
        if (!options?.keepInput) setQuery('');
        return;
      }

      // 2) 상업용 무료 API 멀티 조회
      requestSeqRef.current += 1;
      const seq = requestSeqRef.current;
      setIsLoading(true);

      const result = await lookupWordFromApis(trimmed);
      if (requestSeqRef.current !== seq) return;

      setIsLoading(false);

      if (result.word) {
        saveWord(result.word);
        setDisplayedWord(result.word);
        if (!options?.keepInput) setQuery('');
      } else {
        setDisplayedWord(null);
        setFailedQuery(trimmed);
        setFailedErrorType(result.errorType ?? 'not_found');
        setFallbackSuggestions(result.suggestions);
      }
    },
    [findCachedByQuery, saveWord]
  );

  // 첫 진입 시 최근 단어 또는 첫 추천 단어를 자동 로드 (빈 화면 방지)
  useEffect(() => {
    if (didInitialLoadRef.current) return;
    didInitialLoadRef.current = true;

    const firstRecentKey = recentWords[0];
    if (firstRecentKey && cachedWords[firstRecentKey]) {
      setDisplayedWord(cachedWords[firstRecentKey]);
      return;
    }

    void executeLookup(STARTER_SEARCH_CHIPS[0].word);
  }, [cachedWords, executeLookup, recentWords]);

  // 영문 2글자 이상 입력 시 Datamuse 자동완성 칩 디바운스 조회
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || containsKorean(trimmed)) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      const list = await fetchWordSuggestions(trimmed, 6);
      if (!cancelled) {
        setSuggestions(list);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const normalKey = displayedWord ? `word:${displayedWord.id}:normal` : '';
  const slowKey = displayedWord ? `word:${displayedWord.id}:slow` : '';
  const exampleKey = displayedWord ? `word:${displayedWord.id}:example` : '';
  const fallbackSlowKey = failedQuery ? `fallback:${failedQuery.toLowerCase()}:slow` : '';

  const isNormalPlaying = Boolean(displayedWord && activeKey === normalKey);
  const isSlowPlaying = Boolean(displayedWord && activeKey === slowKey);
  const isExamplePlaying = Boolean(displayedWord && activeKey === exampleKey);
  const isFallbackSlowPlaying = Boolean(failedQuery && activeKey === fallbackSlowKey);

  const recentWordItems = recentWords
    .map((key) => cachedWords[key])
    .filter((item): item is CoreWord => Boolean(item))
    .slice(0, 6);

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
              onSubmitEditing={() => void executeLookup(query)}
              placeholder="예: strawberry 또는 딸기"
              placeholderTextColor={COLORS.textMuted}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="영단어 또는 한글 뜻 입력창"
            />
            {query.length > 0 ? (
              <Pressable
                onPress={() => {
                  setQuery('');
                  setSuggestions([]);
                }}
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

          <Pressable
            onPress={() => void executeLookup(query)}
            disabled={!query.trim() || isLoading}
            style={({ pressed }) => [
              styles.searchSubmitBtn,
              (!query.trim() || isLoading) && styles.searchSubmitBtnDisabled,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="단어 찾기"
          >
            <Ionicons name="search" size={22} color={COLORS.white} />
            <Text style={styles.searchSubmitBtnText}>
              {isLoading ? '단어를 찾는 중...' : '단어 찾기'}
            </Text>
          </Pressable>

          {/* 실시간 영단어 자동완성 후보 */}
          {suggestions.length > 0 ? (
            <View style={styles.chipsSection}>
              <Text style={styles.chipsLabel}>혹시 이 단어를 찾으시나요?</Text>
              <View style={styles.chipsWrap}>
                {suggestions.map((sug) => (
                  <Pressable
                    key={sug}
                    onPress={() => void executeLookup(sug)}
                    style={({ pressed }) => [
                      styles.suggestionChip,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${sug} 단어 검색`}
                  >
                    <Text style={styles.suggestionChipText}>{sug}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {/* 최근 찾아본 단어 (오프라인 캐시) */}
          {recentWordItems.length > 0 ? (
            <View style={styles.chipsSection}>
              <Text style={styles.chipsLabel}>최근 찾아본 단어 (오프라인 가능)</Text>
              <View style={styles.chipsWrap}>
                {recentWordItems.map((item) => {
                  const isSelected = displayedWord?.id === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        setFailedQuery(null);
                        setDisplayedWord(item);
                      }}
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
          ) : null}

          {/* 바로 눌러보는 추천 검색어 */}
          <View style={styles.chipsSection}>
            <Text style={styles.chipsLabel}>바로 눌러보는 추천 기초 단어</Text>
            <View style={styles.chipsWrap}>
              {STARTER_SEARCH_CHIPS.map((chip) => {
                const isSelected =
                  displayedWord?.word.toLowerCase() === chip.word.toLowerCase();
                return (
                  <Pressable
                    key={chip.word}
                    onPress={() => void executeLookup(chip.word)}
                    style={({ pressed }) => [
                      styles.wordChip,
                      isSelected && styles.wordChipSelected,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${chip.word} ${chip.labelKo} 검색`}
                  >
                    <Text
                      style={[
                        styles.wordChipText,
                        isSelected && styles.wordChipTextSelected,
                      ]}
                    >
                      {chip.word} ({chip.labelKo})
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* 로딩 카드 */}
        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingTitle}>단어 소리와 뜻을 찾아오고 있어요</Text>
            <Text style={styles.loadingSub}>
              원어민 발음, 강세 리듬, 한글 뜻을 함께 정리하고 있습니다...
            </Text>
          </View>
        ) : null}

        {/* 검색 실패 / 네트워크 오류 폴백 카드 */}
        {!isLoading && failedQuery ? (
          <View style={styles.fallbackCard}>
            <View style={styles.fallbackHeader}>
              <Ionicons
                name="information-circle"
                size={28}
                color={COLORS.accent}
              />
              <Text style={styles.fallbackTitle}>
                {failedErrorType === 'network'
                  ? '인터넷 연결을 확인해 주세요'
                  : '단어를 찾지 못했어요'}
              </Text>
            </View>
            <Text style={styles.fallbackBody}>
              {failedErrorType === 'network'
                ? '새로운 단어를 검색하려면 인터넷 연결이 필요해요. 최근 찾아본 단어는 오프라인에서도 바로 열 수 있습니다.'
                : `"${failedQuery}" 단어의 철자를 다시 확인하거나 아래 비슷한 단어를 눌러 보세요.`}
            </Text>

            {/[a-zA-Z]/.test(failedQuery) ? (
              <Pressable
                onPress={() => playSlow(failedQuery, { key: fallbackSlowKey })}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  isFallbackSlowPlaying && styles.primaryBtnActive,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${failedQuery} 천천히 소리만 먼저 듣기`}
              >
                <Ionicons name="volume-high" size={24} color={COLORS.white} />
                <Text style={styles.primaryBtnText}>
                  {isFallbackSlowPlaying
                    ? '천천히 소리 재생 중...'
                    : '천천히 소리만 먼저 듣기'}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.koreanOnlyNotice}>
                <Text style={styles.koreanOnlyNoticeText}>
                  영어 철자로 입력하시면 천천히 소리만 먼저 들어볼 수 있어요.
                </Text>
              </View>
            )}

            {fallbackSuggestions.length > 0 ? (
              <View style={styles.fallbackSuggestions}>
                <Text style={styles.chipsLabel}>비슷한 영단어 추천</Text>
                <View style={styles.chipsWrap}>
                  {fallbackSuggestions.map((item) => (
                    <Pressable
                      key={item}
                      onPress={() => void executeLookup(item)}
                      style={({ pressed }) => [
                        styles.wordChip,
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${item} 검색`}
                    >
                      <Text style={styles.wordChipText}>{item}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* 선택된 단어 해독기 Bento 카드 */}
        {!isLoading && displayedWord ? (
          <>
            <View style={styles.wordHeroCard}>
              <View style={styles.wordHeaderRow}>
                <View style={styles.wordTitleGroup}>
                  <View style={styles.badgesRow}>
                    {displayedWord.partOfSpeech ? (
                      <View style={styles.posBadge}>
                        <Text style={styles.posBadgeText}>
                          {displayedWord.partOfSpeech}
                        </Text>
                      </View>
                    ) : null}
                    {displayedWord.audioUrl ? (
                      <View style={styles.nativeAudioBadge}>
                        <Ionicons
                          name="mic"
                          size={16}
                          color={COLORS.primaryDark}
                        />
                        <Text style={styles.nativeAudioBadgeText}>
                          원어민 원음
                        </Text>
                      </View>
                    ) : null}
                  </View>

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
                      audioUrl: displayedWord.audioUrl,
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

            {/* 짧은 생활 예문 카드 (API 제공 시) */}
            {displayedWord.exampleEn ? (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>짧은 예문으로 들어보기</Text>
                <Text style={styles.exampleSentence}>
                  &ldquo;{displayedWord.exampleEn}&rdquo;
                </Text>
                <Pressable
                  onPress={() =>
                    playSlow(displayedWord.exampleEn!, { key: exampleKey })
                  }
                  style={({ pressed }) => [
                    styles.slowBtn,
                    isExamplePlaying && styles.slowBtnActive,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="예문 천천히 듣기"
                >
                  <Ionicons
                    name="volume-medium"
                    size={22}
                    color={COLORS.primaryDark}
                  />
                  <Text style={styles.slowBtnText}>
                    {isExamplePlaying ? '예문 재생 중...' : '예문 천천히 듣기'}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {/* 기호 역추적 카드 (Tab 1 바텀시트 연동) */}
            {displayedWord.symbolIds.length > 0 ? (
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
            ) : null}
          </>
        ) : null}

        {/* 상업용 오픈 라이선스 출처 표기 */}
        <View style={styles.attributionBox}>
          <Text style={styles.attributionText}>
            사전·발음 데이터 출처: Wiktionary (CC BY-SA 4.0) · CMUdict / Datamuse ·
            MyMemory
          </Text>
        </View>
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
  searchSubmitBtn: {
    minHeight: TOUCH.recommendedHeight,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  searchSubmitBtnDisabled: {
    opacity: 0.55,
  },
  searchSubmitBtnText: {
    fontSize: TYPOGRAPHY.bodyLarge,
    fontWeight: '800',
    color: COLORS.white,
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
  suggestionChip: {
    minHeight: TOUCH.minTarget,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    justifyContent: 'center',
  },
  suggestionChipText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '800',
    color: COLORS.accentText,
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
  loadingCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.card,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  loadingTitle: {
    fontSize: TYPOGRAPHY.bodyLarge,
    fontWeight: '800',
    color: COLORS.primaryDark,
    textAlign: 'center',
  },
  loadingSub: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 26,
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
  koreanOnlyNotice: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  koreanOnlyNoticeText: {
    fontSize: TYPOGRAPHY.body,
    lineHeight: 26,
    fontWeight: '600',
    color: COLORS.textMuted,
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
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  posBadge: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  posBadgeText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  nativeAudioBadge: {
    backgroundColor: COLORS.tint,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nativeAudioBadgeText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primaryDark,
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
  exampleSentence: {
    fontSize: TYPOGRAPHY.bodyLarge,
    lineHeight: 30,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
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
  attributionBox: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    alignItems: 'center',
  },
  attributionText: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  pressed: {
    opacity: 0.82,
  },
});
