import { ArrowsClockwise, Eye, EyeSlash, Gauge, Heart, Info, Lightning, MagnifyingGlass, Microphone, Question, SpeakerHigh, Translate, XCircle } from '../../components/PlumpIcons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { HorizontalChipScroll } from '../../components/HorizontalChipScroll';
import { InfoTipBox, InfoTipButton } from '../../components/InfoTip';
import { PronunciationPracticeCard } from '../../components/PronunciationPracticeCard';
import { RhythmBlocks } from '../../components/RhythmBlocks';
import { SymbolDetailSheet } from '../../components/SymbolDetailSheet';
import { TappableExampleSentence } from '../../components/TappableExampleSentence';
import { WordMeaningSheet } from '../../components/WordMeaningSheet';
import { IPA_SYMBOL_BY_ID } from '../../data/categories';
import { useSpeechAudio } from '../../hooks/useSpeechAudio';
import {
  containsKorean,
  fetchRecommendedDailyWords,
  fetchWordSuggestions,
  lookupWordFromApis,
  translateEnglishSentenceToKorean,
  type RecommendedWordChip,
} from '../../services/wordApi';
import {
  normalizeReviewWordKey,
  useLearningStore,
} from '../../store/useLearningStore';
import { useWordCacheStore } from '../../store/useWordCacheStore';
import { COLORS, LAYOUT, RADIUS, SHADOW, SPACING, TOUCH, TYPOGRAPHY } from '../../theme/tokens';
import type { CoreWord, IpaSymbol, WordExample } from '../../types/learning';

function formatShortChipMeaning(raw?: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed || trimmed.includes('뜻 준비 중')) return '';
  const withoutParens = trimmed.replace(/\([^)]*\)/g, '').trim();
  const firstGloss = withoutParens.split(/[·,;/]/)[0]?.trim() ?? '';
  if (!firstGloss) return '';
  return firstGloss.length > 8 ? `${firstGloss.slice(0, 7)}…` : firstGloss;
}

export default function WordReaderScreen() {
  const [query, setQuery] = useState('');
  const [chipTab, setChipTab] = useState<'recommend' | 'recent'>('recommend');
  const [displayedWord, setDisplayedWord] = useState<CoreWord | null>(null);
  const [activeSymbol, setActiveSymbol] = useState<IpaSymbol | null>(null);
  const [tappedExampleWord, setTappedExampleWord] = useState<string | null>(null);
  const [openTip, setOpenTip] = useState<'rhythm' | 'examples' | 'symbols' | null>(null);
  const [showExampleKo, setShowExampleKo] = useState(true);
  const [exampleKoMap, setExampleKoMap] = useState<Record<string, string>>({});
  const [translatingExamples, setTranslatingExamples] = useState<Record<string, boolean>>({});
  const [recommendedChips, setRecommendedChips] = useState<RecommendedWordChip[]>([]);
  const [isLoadingChips, setIsLoadingChips] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [failedQuery, setFailedQuery] = useState<string | null>(null);
  const [failedErrorType, setFailedErrorType] = useState<'not_found' | 'network' | null>(null);
  const [fallbackSuggestions, setFallbackSuggestions] = useState<string[]>([]);

  const params = useLocalSearchParams<{ word?: string; ts?: string }>();
  const requestSeqRef = useRef(0);
  const didInitialLoadRef = useRef(false);
  const lastHandledParamRef = useRef<string | null>(null);
  const recommendCursorRef = useRef<number | null>(null);
  const seenRecommendRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);
  const [heartScale] = useState(() => new Animated.Value(1));

  const triggerHeartPop = useCallback(() => {
    heartScale.setValue(0.6);
    Animated.spring(heartScale, {
      toValue: 1,
      stiffness: 300,
      damping: 10,
      mass: 0.6,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [heartScale]);

  const showKoPronunciation = useLearningStore((state) => state.showKoPronunciation);
  const learningHasHydrated = useLearningStore((state) => state.hasHydrated);
  const learnedSymbolIds = useLearningStore((state) => state.learnedSymbolIds);
  const showSymbolNudge = learningHasHydrated && (!Array.isArray(learnedSymbolIds) || learnedSymbolIds.length === 0);
  const setShowKoPronunciation = useLearningStore(
    (state) => state.setShowKoPronunciation
  );
  const recordMasteryMissionComplete = useLearningStore(
    (state) => state.recordMasteryMissionComplete
  );

  const cachedWords = useWordCacheStore((state) => state.cachedWords);
  const recentWords = useWordCacheStore((state) => state.recentWords);
  const bookmarkedWordKeys = useWordCacheStore((state) => state.bookmarkedWordKeys);
  const cacheHasHydrated = useWordCacheStore((state) => state.hasHydrated);
  const saveWord = useWordCacheStore((state) => state.saveWord);
  const toggleBookmark = useWordCacheStore((state) => state.toggleBookmark);
  const findCachedByQuery = useWordCacheStore((state) => state.findCachedByQuery);

  const { playNormal, playSlow, playFast, stop, activeKey } = useSpeechAudio();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 탭 전환/화면 이탈 시 재생 중인 음성 즉시 중단
  useFocusEffect(
    useCallback(() => {
      return () => {
        stop();
      };
    }, [stop])
  );

  const executeLookup = useCallback(
    async (rawInput: string, options?: { keepInput?: boolean }) => {
      const trimmed = rawInput.trim();
      if (!trimmed) return;

      Keyboard.dismiss();
      stop();

      // 진행 중인 이전 API 요청을 즉시 무효화해 스탈 응답 덮어쓰기 차단
      requestSeqRef.current += 1;
      const seq = requestSeqRef.current;

      setSuggestions([]);
      setFailedQuery(null);
      setFailedErrorType(null);
      setFallbackSuggestions([]);

      // 1) 로컬 AsyncStorage 캐시 먼저 확인 (0ms 즉시 표시 & 오프라인 지원)
      const cached = findCachedByQuery(trimmed);
      if (cached) {
        setIsLoading(false);
        setDisplayedWord(cached);
        if (!options?.keepInput) setQuery('');
        return;
      }

      // 2) 상업용 무료 API 멀티 조회 (try/catch/finally로 로딩 고착 차단)
      setIsLoading(true);
      try {
        const result = await lookupWordFromApis(trimmed);
        if (requestSeqRef.current !== seq) return;

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
      } catch {
        if (requestSeqRef.current !== seq) return;
        setDisplayedWord(null);
        setFailedQuery(trimmed);
        setFailedErrorType('network');
        setFallbackSuggestions([]);
      } finally {
        if (requestSeqRef.current === seq) {
          setIsLoading(false);
        }
      }
    },
    [findCachedByQuery, saveWord, stop]
  );

  // 초급·중급 일상 추천 단어를 하드코딩 없이 실시간 동적 조회
  const loadRecommendedChips = useCallback(
    async (options?: { autoOpenFirst?: boolean }) => {
      if (recommendCursorRef.current === null) {
        recommendCursorRef.current = Math.floor(Math.random() * 60);
      } else {
        recommendCursorRef.current += 1;
      }

      if (mountedRef.current) {
        setIsLoadingChips(true);
      }

      try {
        const nextChips = await fetchRecommendedDailyWords(
          recommendCursorRef.current,
          seenRecommendRef.current
        );
        if (!mountedRef.current) return;

        if (nextChips.length > 0) {
          for (const chip of nextChips) {
            seenRecommendRef.current.add(chip.word);
          }
          // 누적 제외셋이 너무 커지면 초기화해 언제든 새 조합 순환 가능
          if (seenRecommendRef.current.size > 160) {
            seenRecommendRef.current.clear();
          }
          setRecommendedChips(nextChips);
          if (options?.autoOpenFirst) {
            void executeLookup(nextChips[0].word);
          }
        }
      } finally {
        if (mountedRef.current) {
          setIsLoadingChips(false);
        }
      }
    },
    [executeLookup]
  );

  // AsyncStorage 캐시 하이드레이션 완료 후 초기 단어 복원 + 실시간 일상 추천 단어 로딩
  useEffect(() => {
    if (!cacheHasHydrated || didInitialLoadRef.current) return;
    didInitialLoadRef.current = true;

    let cancelled = false;
    const firstRecentKey = recentWords[0];
    const cachedInitial =
      firstRecentKey && cachedWords[firstRecentKey]
        ? cachedWords[firstRecentKey]
        : null;

    void Promise.resolve().then(() => {
      if (cancelled) return;
      if (cachedInitial) {
        setDisplayedWord(cachedInitial);
        void loadRecommendedChips();
        return;
      }
      void loadRecommendedChips({ autoOpenFirst: true });
    });

    return () => {
      cancelled = true;
    };
  }, [cacheHasHydrated, cachedWords, loadRecommendedChips, recentWords]);

  // 북마크 탭 등에서 단어를 선택해 이동한 경우 해당 단어 즉시 로드
  useEffect(() => {
    const incomingWord = typeof params.word === 'string' ? params.word.trim() : '';
    if (!incomingWord) return;
    const token = `${incomingWord}:${typeof params.ts === 'string' ? params.ts : ''}`;
    if (lastHandledParamRef.current === token) return;
    lastHandledParamRef.current = token;

    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      void executeLookup(incomingWord);
    });
    return () => {
      cancelled = true;
    };
  }, [executeLookup, params.ts, params.word]);

  // 영문 2글자 이상 입력 시 Datamuse 자동완성 칩 디바운스 조회
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || containsKorean(trimmed)) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const list = await fetchWordSuggestions(trimmed, 6);
        if (!cancelled) {
          setSuggestions(list);
        }
      } catch {
        if (!cancelled) {
          setSuggestions([]);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const trimmedQuery = query.trim();
  const visibleSuggestions =
    trimmedQuery.length >= 2 && !containsKorean(trimmedQuery)
      ? suggestions
      : [];

  const handleSelectCachedWord = (item: CoreWord) => {
    stop();
    requestSeqRef.current += 1;
    setIsLoading(false);
    setFailedQuery(null);
    setFailedErrorType(null);
    setDisplayedWord(item);
  };

  const normalKey = displayedWord ? `word:${displayedWord.id}:normal` : '';
  const slowKey = displayedWord ? `word:${displayedWord.id}:slow` : '';
  const fallbackSlowKey = failedQuery ? `fallback:${failedQuery.toLowerCase()}:slow` : '';

  const isNormalPlaying = Boolean(displayedWord && activeKey === normalKey);
  const isSlowPlaying = Boolean(displayedWord && activeKey === slowKey);
  const isFallbackSlowPlaying = Boolean(failedQuery && activeKey === fallbackSlowKey);

  const displayedExamples: WordExample[] = displayedWord
    ? displayedWord.examples && displayedWord.examples.length > 0
      ? displayedWord.examples
      : displayedWord.exampleEn
        ? [{ en: displayedWord.exampleEn }]
        : []
    : [];

  // 이전에 캐시된 단어에 예문 한글 해석(ko)이 비어 있으면 자동으로 보강 후 캐시 업데이트
  const attemptedExampleRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!displayedWord) return;
    const baseExamples: WordExample[] =
      displayedWord.examples && displayedWord.examples.length > 0
        ? displayedWord.examples
        : displayedWord.exampleEn
          ? [{ en: displayedWord.exampleEn }]
          : [];

    const missing = baseExamples.filter(
      (ex) => !ex.ko && !attemptedExampleRef.current.has(ex.en)
    );
    if (missing.length === 0) return;

    for (const ex of missing) {
      attemptedExampleRef.current.add(ex.en);
    }

    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (cancelled) return;
      setTranslatingExamples((prev) => {
        const next = { ...prev };
        for (const ex of missing) {
          next[ex.en] = true;
        }
        return next;
      });

      const resolvedPairs = await Promise.all(
        missing.map(async (ex) => ({
          en: ex.en,
          ko: await translateEnglishSentenceToKorean(ex.en),
        }))
      );
      if (cancelled) return;

      const foundMap: Record<string, string> = {};
      for (const pair of resolvedPairs) {
        if (pair.ko) {
          foundMap[pair.en] = pair.ko;
        }
      }

      setTranslatingExamples((prev) => {
        const next = { ...prev };
        for (const ex of missing) {
          delete next[ex.en];
        }
        return next;
      });

      if (Object.keys(foundMap).length > 0) {
        setExampleKoMap((prev) => ({ ...prev, ...foundMap }));
        const updatedExamples = baseExamples.map((ex) => ({
          ...ex,
          ko: ex.ko || foundMap[ex.en],
        }));
        const enrichedWord: CoreWord = {
          ...displayedWord,
          examples: updatedExamples,
        };
        saveWord(enrichedWord);
        setDisplayedWord((prev) =>
          prev && prev.id === displayedWord.id ? enrichedWord : prev
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [displayedWord, saveWord]);

  const handleTranslateExample = useCallback(
    async (sentence: string) => {
      setTranslatingExamples((prev) => ({ ...prev, [sentence]: true }));
      try {
        const ko = await translateEnglishSentenceToKorean(sentence);
        if (ko && mountedRef.current) {
          setExampleKoMap((prev) => ({ ...prev, [sentence]: ko }));
          if (displayedWord) {
            const baseExamples: WordExample[] =
              displayedWord.examples && displayedWord.examples.length > 0
                ? displayedWord.examples
                : displayedWord.exampleEn
                  ? [{ en: displayedWord.exampleEn }]
                  : [];
            const updatedExamples = baseExamples.map((ex) =>
              ex.en === sentence ? { ...ex, ko } : ex
            );
            const enrichedWord: CoreWord = {
              ...displayedWord,
              examples: updatedExamples,
            };
            saveWord(enrichedWord);
            setDisplayedWord((prev) =>
              prev && prev.id === displayedWord.id ? enrichedWord : prev
            );
          }
        }
      } finally {
        if (mountedRef.current) {
          setTranslatingExamples((prev) => {
            const next = { ...prev };
            delete next[sentence];
            return next;
          });
        }
      }
    },
    [displayedWord, saveWord]
  );

  const recentWordItems = recentWords
    .map((key) => cachedWords[key])
    .filter((item): item is CoreWord => Boolean(item))
    .slice(0, 6);

  const safeBookmarkKeys = Array.isArray(bookmarkedWordKeys)
    ? bookmarkedWordKeys
    : [];

  const isDisplayedWordBookmarked = Boolean(
    displayedWord &&
      safeBookmarkKeys.includes(displayedWord.word.toLowerCase())
  );

  const activeChipTab: 'recommend' | 'recent' =
    chipTab === 'recent' && recentWordItems.length > 0 ? 'recent' : 'recommend';

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {/* 심플 검색 Bento 카드 */}
        <View style={styles.searchCard}>
          <View style={styles.searchRow}>
            <MagnifyingGlass size={22} color={COLORS.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => void executeLookup(query)}
              placeholder="영단어 또는 한글 뜻 (예: strawberry, 딸기)"
              placeholderTextColor={COLORS.textMuted}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={60}
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
                  styles.clearIconBtn,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="검색어 지우기"
              >
                <XCircle
                  size={22}
                  color={COLORS.textMuted}
                />
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => void executeLookup(query)}
              disabled={!query.trim() || isLoading}
              style={({ pressed }) => [
                styles.searchInlineBtn,
                (!query.trim() || isLoading) && styles.searchInlineBtnDisabled,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="단어 찾기"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text
                  style={styles.searchInlineBtnText}
                  maxFontSizeMultiplier={1.25}
                >
                  찾기
                </Text>
              )}
            </Pressable>
          </View>

          {/* 실시간 영단어 자동완성 후보 */}
          {visibleSuggestions.length > 0 ? (
            <HorizontalChipScroll
              contentContainerStyle={styles.chipsScrollContent}
            >
              {visibleSuggestions.map((sug) => (
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
                  <Text
                    style={styles.suggestionChipText}
                    maxFontSizeMultiplier={1.3}
                  >
                    {sug}
                  </Text>
                </Pressable>
              ))}
            </HorizontalChipScroll>
          ) : null}

          {/* 추천 / 최근 전환 탭 + 한 줄 가로 스크롤 칩 */}
          <View style={styles.chipToolbarRow}>
            <View style={styles.chipTabGroup}>
              <Pressable
                onPress={() => setChipTab('recommend')}
                style={({ pressed }) => [
                  styles.chipTabPill,
                  activeChipTab === 'recommend' && styles.chipTabPillRecommendActive,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeChipTab === 'recommend' }}
                accessibilityLabel="일상 추천 단어 보기"
              >
                <Text
                  style={[
                    styles.chipTabText,
                    activeChipTab === 'recommend' && styles.chipTabTextRecommendActive,
                  ]}
                  maxFontSizeMultiplier={1.25}
                >
                  추천
                </Text>
              </Pressable>

              {recentWordItems.length > 0 ? (
                <Pressable
                  onPress={() => setChipTab('recent')}
                  style={({ pressed }) => [
                    styles.chipTabPill,
                    activeChipTab === 'recent' && styles.chipTabPillRecentActive,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: activeChipTab === 'recent' }}
                  accessibilityLabel={`최근 찾아본 단어 ${recentWordItems.length}개 보기`}
                >
                  <Text
                    style={[
                      styles.chipTabText,
                      activeChipTab === 'recent' && styles.chipTabTextRecentActive,
                    ]}
                    maxFontSizeMultiplier={1.25}
                  >
                    최근 {recentWordItems.length}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {activeChipTab === 'recommend' ? (
              <Pressable
                onPress={() => void loadRecommendedChips()}
                disabled={isLoadingChips}
                style={({ pressed }) => [
                  styles.refreshChipsBtn,
                  isLoadingChips && styles.refreshChipsBtnDisabled,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="다른 일상 추천 단어 새로 받기"
              >
                <ArrowsClockwise size={16} color={COLORS.indigoText} />
                <Text
                  style={styles.refreshChipsBtnText}
                  maxFontSizeMultiplier={1.25}
                >
                  {isLoadingChips ? '고르는 중' : '다른 단어'}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {activeChipTab === 'recent' ? (
            <HorizontalChipScroll
              contentContainerStyle={styles.chipsScrollContent}
            >
              {recentWordItems.map((item) => {
                const isSelected = displayedWord?.id === item.id;
                const shortKo = formatShortChipMeaning(item.meaningKo);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => handleSelectCachedWord(item)}
                    style={({ pressed }) => [
                      styles.compactChip,
                      isSelected && styles.wordChipSelected,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.word} ${shortKo || item.meaningKo} 선택`}
                  >
                    <Text
                      style={[
                        styles.compactChipWord,
                        isSelected && styles.wordChipTextSelected,
                      ]}
                      maxFontSizeMultiplier={1.3}
                    >
                      {item.word}
                    </Text>
                    {shortKo ? (
                      <Text
                        style={[
                          styles.compactChipKo,
                          isSelected && styles.compactChipKoSelected,
                        ]}
                        maxFontSizeMultiplier={1.25}
                      >
                        {shortKo}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </HorizontalChipScroll>
          ) : recommendedChips.length > 0 ? (
            <HorizontalChipScroll
              contentContainerStyle={styles.chipsScrollContent}
            >
              {recommendedChips.map((chip) => {
                const isSelected =
                  displayedWord?.word.toLowerCase() === chip.word.toLowerCase();
                const isIntermediate = chip.level === 'intermediate';
                const shortKo = formatShortChipMeaning(chip.labelKo);
                return (
                  <Pressable
                    key={chip.word}
                    onPress={() => void executeLookup(chip.word)}
                    style={({ pressed }) => [
                      styles.compactChip,
                      isSelected && styles.wordChipSelected,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${isIntermediate ? '중급' : '초급'} ${chip.word} ${shortKo || chip.labelKo} 검색`}
                  >
                    <View
                      style={[
                        styles.levelDot,
                        isIntermediate && styles.levelDotMid,
                      ]}
                    />
                    <Text
                      style={[
                        styles.compactChipWord,
                        isSelected && styles.wordChipTextSelected,
                      ]}
                      maxFontSizeMultiplier={1.3}
                    >
                      {chip.word}
                    </Text>
                    {shortKo ? (
                      <Text
                        style={[
                          styles.compactChipKo,
                          isSelected && styles.compactChipKoSelected,
                        ]}
                        maxFontSizeMultiplier={1.25}
                      >
                        {shortKo}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </HorizontalChipScroll>
          ) : isLoadingChips ? (
            <View style={styles.chipsLoadingRow}>
              <ActivityIndicator size="small" color={COLORS.indigo} />
              <Text style={styles.chipsLoadingText} maxFontSizeMultiplier={1.35}>
                오늘의 일상 단어를 고르고 있어요...
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={() => void loadRecommendedChips()}
              style={({ pressed }) => [
                styles.wordChip,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="일상 추천 단어 불러오기"
            >
              <Text style={styles.wordChipText} maxFontSizeMultiplier={1.35}>
                탭해서 추천 단어 불러오기
              </Text>
            </Pressable>
          )}
        </View>

        {/* 발음기호 유도 카드 (기호를 하나도 안 익힌 왕초보에게만) */}
        {showSymbolNudge && !displayedWord && !isLoading ? (
          <Pressable
            onPress={() => router.navigate('/(tabs)/symbols')}
            style={({ pressed }) => [styles.symbolNudgeCard, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="발음기호 기초 화면으로 이동"
          >
            <Text style={styles.symbolNudgeTitle} maxFontSizeMultiplier={1.35}>
              발음기호 먼저 익혀볼까요?
            </Text>
            <Text style={styles.symbolNudgeSub} maxFontSizeMultiplier={1.4}>
              영어 소리의 기초를 배우면 모르는 단어도 읽을 수 있어요
            </Text>
            <Text style={styles.symbolNudgeLink} maxFontSizeMultiplier={1.3}>
              발음기호 기초 보러가기 →
            </Text>
          </Pressable>
        ) : null}

        {/* 로딩 카드 */}
        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingTitle} maxFontSizeMultiplier={1.4}>
              단어 소리와 뜻을 찾아오고 있어요
            </Text>
            <Text style={styles.loadingSub} maxFontSizeMultiplier={1.45}>
              원어민 발음, 강약 리듬, 한글 뜻을 함께 정리하고 있습니다...
            </Text>
          </View>
        ) : null}

        {/* 검색 실패 / 네트워크 오류 폴백 카드 */}
        {!isLoading && failedQuery ? (
          <View style={styles.fallbackCard}>
            <View style={styles.fallbackHeader}>
              <Info
                size={28}
                color={COLORS.rose}
              />
              <Text style={styles.fallbackTitle} maxFontSizeMultiplier={1.4}>
                {failedErrorType === 'network'
                  ? '인터넷 연결을 확인해 주세요'
                  : '단어를 찾지 못했어요'}
              </Text>
            </View>
            <Text style={styles.fallbackBody} maxFontSizeMultiplier={1.45}>
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
                <SpeakerHigh size={24} color={COLORS.white} />
                <Text style={styles.primaryBtnText} maxFontSizeMultiplier={1.35}>
                  {isFallbackSlowPlaying
                    ? '천천히 소리 재생 중...'
                    : '천천히 소리만 먼저 듣기'}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.koreanOnlyNotice}>
                <Text
                  style={styles.koreanOnlyNoticeText}
                  maxFontSizeMultiplier={1.45}
                >
                  영어 철자로 입력하시면 천천히 소리만 먼저 들어볼 수 있어요.
                </Text>
              </View>
            )}

            {fallbackSuggestions.length > 0 ? (
              <View style={styles.fallbackSuggestions}>
                <Text style={styles.chipsLabel} maxFontSizeMultiplier={1.4}>
                  비슷한 영단어 추천
                </Text>
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
                      <Text style={styles.wordChipText} maxFontSizeMultiplier={1.35}>
                        {item}
                      </Text>
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
              <View style={styles.heroTopBar}>
                <View style={styles.badgesRow}>
                  {displayedWord.partOfSpeech ? (
                    <View style={styles.posBadge}>
                      <Text
                        style={styles.posBadgeText}
                        maxFontSizeMultiplier={1.35}
                      >
                        {displayedWord.partOfSpeech}
                      </Text>
                    </View>
                  ) : null}
                  {displayedWord.audioUrl ? (
                    <View style={styles.nativeAudioBadge}>
                      <Microphone
                        size={16}
                        color={COLORS.textSecondary}
                      />
                      <Text
                        style={styles.nativeAudioBadgeText}
                        maxFontSizeMultiplier={1.35}
                      >
                        원어민 원음
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Pressable
                  onPress={() => {
                    if (!isDisplayedWordBookmarked) triggerHeartPop();
                    toggleBookmark(displayedWord);
                  }}
                  style={({ pressed }) => [
                    styles.bookmarkToggleBtn,
                    isDisplayedWordBookmarked && styles.bookmarkToggleBtnActive,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isDisplayedWordBookmarked }}
                  accessibilityLabel={
                    isDisplayedWordBookmarked
                      ? `${displayedWord.word} 저장 해제`
                      : `${displayedWord.word} 저장`
                  }
                >
                  <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                    <Heart
                      size={24}
                      color={isDisplayedWordBookmarked ? '#FF3B30' : COLORS.textMuted}
                      weight={isDisplayedWordBookmarked ? 'fill' : 'regular'}
                    />
                  </Animated.View>
                </Pressable>
              </View>

              <View style={styles.wordHeaderRow}>
                <View style={styles.wordTitleGroup}>
                  <Text style={styles.wordHero} maxFontSizeMultiplier={1.35}>
                    {displayedWord.word}
                  </Text>
                  <Text style={styles.wordMeaning} maxFontSizeMultiplier={1.4}>
                    {displayedWord.meaningKo}
                  </Text>
                </View>

                <View style={styles.ipaPill}>
                  <Text style={styles.ipaPillText} maxFontSizeMultiplier={1.3}>
                    {displayedWord.ipa}
                  </Text>
                </View>
              </View>

              {/* 한글 발음 힌트 토글 (행 전체 터치 지원 + 하이드레이션 후 안정 표시) */}
              {learningHasHydrated ? (
                <Pressable
                  onPress={() => setShowKoPronunciation(!showKoPronunciation)}
                  style={({ pressed }) => [
                    styles.toggleBox,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: showKoPronunciation }}
                  accessibilityLabel="한글 발음 힌트 보기 토글"
                >
                  <View style={styles.toggleTextGroup}>
                    <Text style={styles.toggleLabel} maxFontSizeMultiplier={1.4}>
                      한글 발음 힌트
                    </Text>
                    {showKoPronunciation ? (
                      <Text
                        style={styles.koPronunciationText}
                        maxFontSizeMultiplier={1.4}
                      >
                        {displayedWord.koPronunciation}
                      </Text>
                    ) : (
                      <Text
                        style={styles.koHiddenText}
                        maxFontSizeMultiplier={1.4}
                      >
                        발음기호와 소리에 집중해요
                      </Text>
                    )}
                  </View>
                  <Switch
                    value={showKoPronunciation}
                    onValueChange={setShowKoPronunciation}
                    trackColor={{
                      false: COLORS.border,
                      true: COLORS.primary,
                    }}
                    thumbColor={COLORS.white}
                    accessibilityLabel="한글 발음 힌트 표시"
                  />
                </Pressable>
              ) : null}

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
                  <SpeakerHigh size={24} color={COLORS.white} />
                  <Text style={styles.primaryBtnText} maxFontSizeMultiplier={1.3}>
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
                  <Gauge
                    size={24}
                    color={isSlowPlaying ? COLORS.white : COLORS.tealText}
                  />
                  <Text
                    style={[
                      styles.slowBtnText,
                      isSlowPlaying && styles.primaryBtnText,
                    ]}
                    maxFontSizeMultiplier={1.3}
                  >
                    {isSlowPlaying ? '천천히 중...' : '천천히 (0.6x)'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* 강세 리듬 블록 카드 */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleLeft}>
                <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.4}>
                  음절별 강약 리듬
                </Text>
                <InfoTipButton
                  open={openTip === 'rhythm'}
                  onToggle={() =>
                    setOpenTip((prev) => (prev === 'rhythm' ? null : 'rhythm'))
                  }
                  accessibilityLabel="강약 리듬 설명 보기"
                />
              </View>
              <InfoTipBox
                visible={openTip === 'rhythm'}
                text="노란 카드(⬤) 음절은 크고 또렷하게, 나머지 음절은 힘을 빼고 부드럽게 읽어 보세요."
                onClose={() => setOpenTip(null)}
              />
              <RhythmBlocks
                syllables={displayedWord.syllables}
                showKoHint={learningHasHydrated ? showKoPronunciation : true}
                word={displayedWord.word}
                onPlayWord={() =>
                  playNormal(displayedWord.word, {
                    audioAsset: displayedWord.audioAsset,
                    audioUrl: displayedWord.audioUrl,
                    key: normalKey,
                  })
                }
              />
            </View>

            {/* 따라 말하며 내 발음 비교 카드 (미저장 · 즉시 삭제) */}
            <PronunciationPracticeCard
              word={displayedWord.word}
              ipa={displayedWord.ipa}
              syllableCount={Math.max(1, displayedWord.syllables.length)}
              onPlayNative={() =>
                playNormal(displayedWord.word, {
                  audioAsset: displayedWord.audioAsset,
                  audioUrl: displayedWord.audioUrl,
                  key: normalKey,
                })
              }
              onStopNative={stop}
              koPronunciation={displayedWord.koPronunciation}
              exampleSentence={displayedExamples[0]?.en}
              onMasteryComplete={() =>
                recordMasteryMissionComplete(
                  normalizeReviewWordKey(displayedWord.word)
                )
              }
            />

            {/* 관련 생활 예문 카드 (Tatoeba · Wiktionary 상업용 무료 API) */}
            {displayedExamples.length > 0 ? (
              <View style={styles.sectionCard}>
                <View style={styles.sectionTitleRow}>
                  <View style={styles.sectionTitleLeft}>
                    <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.4}>
                      관련 생활 예문
                    </Text>
                    <View style={styles.exampleCountBadge}>
                      <Text
                        style={styles.exampleCountBadgeText}
                        maxFontSizeMultiplier={1.3}
                      >
                        {displayedExamples.length}개
                      </Text>
                    </View>
                    <InfoTipButton
                      open={openTip === 'examples'}
                      onToggle={() =>
                        setOpenTip((prev) =>
                          prev === 'examples' ? null : 'examples'
                        )
                      }
                      accessibilityLabel="예문 사용법 보기"
                    />
                  </View>

                  <Pressable
                    onPress={() => setShowExampleKo((prev) => !prev)}
                    style={({ pressed }) => [
                      styles.exampleKoToggleBtn,
                      showExampleKo && styles.exampleKoToggleBtnActive,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showExampleKo ? '예문 한글 뜻 숨기기' : '예문 한글 뜻 보기'
                    }
                  >
                    {showExampleKo ? (
                      <Eye size={17} color={COLORS.indigoText} />
                    ) : (
                      <EyeSlash size={17} color={COLORS.textMuted} />
                    )}
                    <Text
                      style={[
                        styles.exampleKoToggleText,
                        showExampleKo && styles.exampleKoToggleTextActive,
                      ]}
                      maxFontSizeMultiplier={1.25}
                    >
                      뜻
                    </Text>
                  </Pressable>
                </View>
                <InfoTipBox
                  visible={openTip === 'examples'}
                  text="문장 속 궁금한 단어를 누르면 바로 뜻과 발음이 나타나요. 소리로 듣고 따라 읽어 보세요."
                  onClose={() => setOpenTip(null)}
                />

                <View style={styles.examplesList}>
                  {displayedExamples.map((ex, idx) => {
                    const exSlowKey = `word:${displayedWord.id}:ex:${idx}:slow`;
                    const exNormalKey = `word:${displayedWord.id}:ex:${idx}:normal`;
                    const exFastKey = `word:${displayedWord.id}:ex:${idx}:fast`;
                    const isExSlowPlaying = activeKey === exSlowKey;
                    const isExNormalPlaying = activeKey === exNormalKey;
                    const isExFastPlaying = activeKey === exFastKey;
                    const resolvedKo = ex.ko || exampleKoMap[ex.en];
                    const isTranslating = Boolean(translatingExamples[ex.en]);

                    return (
                      <View
                        key={`${displayedWord.id}-ex-${idx}`}
                        style={styles.exampleItemBox}
                      >
                        <Text
                          style={styles.exampleIndexBadge}
                          maxFontSizeMultiplier={1.3}
                        >
                          예문 {idx + 1}
                        </Text>
                        <TappableExampleSentence
                          sentence={ex.en}
                          targetWord={displayedWord.word}
                          selectedWord={tappedExampleWord}
                          onWordPress={(w) => setTappedExampleWord(w)}
                        />
                        {showExampleKo ? (
                          resolvedKo ? (
                            <View style={styles.exampleKoBox}>
                              <View style={styles.exampleKoTag}>
                                <Text
                                  style={styles.exampleKoTagText}
                                  maxFontSizeMultiplier={1.2}
                                >
                                  뜻
                                </Text>
                              </View>
                              <Text
                                style={styles.exampleKoText}
                                maxFontSizeMultiplier={1.45}
                              >
                                {resolvedKo}
                              </Text>
                            </View>
                          ) : isTranslating ? (
                            <View style={styles.exampleKoLoadingRow}>
                              <ActivityIndicator size="small" color={COLORS.indigo} />
                              <Text
                                style={styles.exampleKoLoadingText}
                                maxFontSizeMultiplier={1.35}
                              >
                                예문 뜻을 불러오고 있어요...
                              </Text>
                            </View>
                          ) : (
                            <Pressable
                              onPress={() => void handleTranslateExample(ex.en)}
                              style={({ pressed }) => [
                                styles.exampleKoRetryBtn,
                                pressed && styles.pressed,
                              ]}
                              accessibilityRole="button"
                              accessibilityLabel={`예문 ${idx + 1} 한글 뜻 불러오기`}
                            >
                              <Translate
                                size={18}
                                color={COLORS.indigoText}
                              />
                              <Text
                                style={styles.exampleKoRetryText}
                                maxFontSizeMultiplier={1.3}
                              >
                                예문 뜻 보기
                              </Text>
                            </Pressable>
                          )
                        ) : null}

                        <View style={styles.exampleAudioRow}>
                          <Pressable
                            onPress={() => playSlow(ex.en, { key: exSlowKey })}
                            style={({ pressed }) => [
                              styles.exampleSlowBtn,
                              isExSlowPlaying && styles.exampleSlowBtnActive,
                              pressed && styles.pressed,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={`예문 ${idx + 1} 천천히 듣기`}
                          >
                            <Gauge
                              size={20}
                              color={
                                isExSlowPlaying ? COLORS.white : COLORS.tealText
                              }
                            />
                            <Text
                              style={[
                                styles.exampleSlowBtnText,
                                isExSlowPlaying && styles.exampleBtnTextActive,
                              ]}
                              maxFontSizeMultiplier={1.3}
                            >
                              {isExSlowPlaying ? '천천히 중...' : '천천히 (0.6x)'}
                            </Text>
                          </Pressable>

                          <Pressable
                            onPress={() =>
                              playNormal(ex.en, { key: exNormalKey })
                            }
                            style={({ pressed }) => [
                              styles.exampleNormalBtn,
                              isExNormalPlaying && styles.primaryBtnActive,
                              pressed && styles.pressed,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={`예문 ${idx + 1} 보통 속도 듣기`}
                          >
                            <SpeakerHigh
                              size={20}
                              color={COLORS.white}
                            />
                            <Text
                              style={styles.exampleNormalBtnText}
                              maxFontSizeMultiplier={1.3}
                            >
                              {isExNormalPlaying ? '재생 중...' : '보통 (1.0x)'}
                            </Text>
                          </Pressable>

                          <Pressable
                            onPress={() => playFast(ex.en, { key: exFastKey })}
                            style={({ pressed }) => [
                              styles.exampleFastBtn,
                              isExFastPlaying && styles.exampleFastBtnActive,
                              pressed && styles.pressed,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={`예문 ${idx + 1} 빠르게 듣기`}
                          >
                            <Lightning
                              size={20}
                              color={
                                isExFastPlaying ? COLORS.white : COLORS.purpleText
                              }
                            />
                            <Text
                              style={[
                                styles.exampleFastBtnText,
                                isExFastPlaying && styles.exampleBtnTextActive,
                              ]}
                              maxFontSizeMultiplier={1.3}
                            >
                              {isExFastPlaying ? '빠르게 중...' : '빠르게 (1.25x)'}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* 기호 역추적 카드 (Tab 1 바텀시트 연동) */}
            {displayedWord.symbolIds.length > 0 ? (
              <View style={styles.sectionCard}>
                <View style={styles.sectionTitleLeft}>
                  <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.4}>
                    이 단어의 핵심 발음기호
                  </Text>
                  <InfoTipButton
                    open={openTip === 'symbols'}
                    onToggle={() =>
                      setOpenTip((prev) =>
                        prev === 'symbols' ? null : 'symbols'
                      )
                    }
                    accessibilityLabel="발음기호 보기 안내"
                  />
                </View>
                <InfoTipBox
                  visible={openTip === 'symbols'}
                  text="기호 버튼을 누르면 입 모양과 소리 내는 법을 바로 확인할 수 있어요."
                  onClose={() => setOpenTip(null)}
                />
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
                        <Text
                          style={styles.symbolBacktrackIpa}
                          maxFontSizeMultiplier={1.35}
                        >
                          {sym.ipa}
                        </Text>
                        <Text
                          style={styles.symbolBacktrackHint}
                          maxFontSizeMultiplier={1.4}
                        >
                          {sym.koHint}
                        </Text>
                        <View style={styles.symbolBacktrackAction}>
                          <Question
                            size={18}
                            color={COLORS.purpleText}
                          />
                          <Text
                            style={styles.symbolBacktrackActionText}
                            maxFontSizeMultiplier={1.35}
                          >
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
          <Text style={styles.attributionText} maxFontSizeMultiplier={1.4}>
            사전·발음·예문 데이터 출처: Wiktionary (CC BY-SA 4.0) · Tatoeba (CC BY
            2.0 FR) · CMUdict / Datamuse · MyMemory
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

      {/* 예문 속 단어 빠른 뜻 바텀시트 */}
      <WordMeaningSheet
        word={tappedExampleWord}
        visible={tappedExampleWord !== null}
        onClose={() => setTappedExampleWord(null)}
        currentMainWord={displayedWord?.word}
        onOpenFullWord={(w) => void executeLookup(w)}
      />
    </KeyboardAvoidingView>
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
  searchCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: SPACING.sm,
    gap: 8,
    ...SHADOW.card,
  },
  searchRow: {
    minHeight: 54,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.body,
    color: COLORS.text,
    paddingVertical: 8,
  },
  clearIconBtn: {
    minWidth: 44,
    minHeight: TOUCH.minTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInlineBtn: {
    minHeight: TOUCH.minTarget,
    minWidth: 72,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInlineBtnDisabled: {
    opacity: 0.45,
  },
  searchInlineBtnText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.white,
  },
  chipsLabel: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipsScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 4,
  },
  chipToolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  chipTabGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipTabPill: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipTabPillRecommendActive: {
    backgroundColor: COLORS.surface,
  },
  chipTabPillRecentActive: {
    backgroundColor: COLORS.surface,
  },
  chipTabText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  chipTabTextRecommendActive: {
    fontWeight: '700',
    color: COLORS.text,
  },
  chipTabTextRecentActive: {
    fontWeight: '700',
    color: COLORS.text,
  },
  suggestionChip: {
    minHeight: TOUCH.minTarget,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.indigoSoft,
    justifyContent: 'center',
  },
  suggestionChipText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.indigoText,
  },
  wordChip: {
    minHeight: TOUCH.minTarget,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
  },
  compactChip: {
    minHeight: TOUCH.minTarget,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.background,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactChipWord: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.text,
  },
  compactChipKo: {
    fontSize: 15,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  compactChipKoSelected: {
    color: COLORS.primaryDark,
  },
  levelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.borderStrong,
  },
  levelDotMid: {
    backgroundColor: COLORS.textMuted,
  },
  refreshChipsBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.indigoSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  refreshChipsBtnDisabled: {
    opacity: 0.6,
  },
  refreshChipsBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.indigoText,
  },
  chipsLoadingRow: {
    minHeight: TOUCH.minTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  chipsLoadingText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  wordChipSelected: {
    backgroundColor: COLORS.tint,
  },
  wordChipText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.text,
  },
  wordChipTextSelected: {
    color: COLORS.primaryDark,
  },
  symbolNudgeCard: {
    backgroundColor: COLORS.indigoSoft,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    gap: 6,
  },
  symbolNudgeTitle: {
    fontSize: TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.indigoText,
  },
  symbolNudgeSub: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.indigoText,
    lineHeight: 22,
  },
  symbolNudgeLink: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.indigo,
    marginTop: 4,
  },
  loadingCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
    ...SHADOW.card,
  },
  loadingTitle: {
    fontSize: TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  loadingSub: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 21,
  },
  fallbackCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    gap: SPACING.md,
    ...SHADOW.card,
  },
  fallbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fallbackTitle: {
    flex: 1,
    fontSize: TYPOGRAPHY.sectionTitle,
    fontWeight: '700',
    color: COLORS.roseText,
  },
  fallbackBody: {
    fontSize: TYPOGRAPHY.body,
    lineHeight: 21,
    color: COLORS.text,
  },
  fallbackSuggestions: {
    gap: 8,
  },
  koreanOnlyNotice: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  koreanOnlyNoticeText: {
    fontSize: TYPOGRAPHY.body,
    lineHeight: 21,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  wordHeroCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    gap: SPACING.sm,
    ...SHADOW.card,
  },
  heroTopBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  bookmarkToggleBtn: {
    width: TOUCH.minTarget,
    height: TOUCH.minTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookmarkToggleBtnActive: {},
  wordHeaderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  wordTitleGroup: {
    flex: 1,
    minWidth: 170,
    gap: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  posBadge: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  posBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  nativeAudioBadge: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nativeAudioBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  wordHero: {
    fontSize: TYPOGRAPHY.wordHero,
    fontWeight: '700',
    color: COLORS.text,
  },
  wordMeaning: {
    fontSize: TYPOGRAPHY.sectionTitle,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  ipaPill: {
    backgroundColor: COLORS.purpleSoft,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ipaPillText: {
    fontSize: TYPOGRAPHY.ipa,
    fontWeight: '500',
    color: COLORS.purpleText,
  },
  toggleBox: {
    backgroundColor: COLORS.background,
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
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  koPronunciationText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  koHiddenText: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textMuted,
  },
  audioButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  audioBtnFlex: {
    flexGrow: 1,
    minWidth: 150,
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
    fontWeight: '700',
    color: COLORS.white,
  },
  slowBtn: {
    minHeight: TOUCH.recommendedHeight,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.tealSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  slowBtnActive: {
    backgroundColor: COLORS.teal,
  },
  slowBtnText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.tealText,
  },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    gap: SPACING.sm,
    ...SHADOW.card,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sectionTitle,
    fontWeight: '700',
    color: COLORS.text,
  },
  exampleCountBadge: {
    backgroundColor: COLORS.indigoSoft,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  exampleCountBadgeText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.indigoText,
  },
  exampleKoToggleBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.background,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  exampleKoToggleBtnActive: {
    backgroundColor: COLORS.indigoSoft,
  },
  exampleKoToggleText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  exampleKoToggleTextActive: {
    fontWeight: '700',
    color: COLORS.indigoText,
  },
  sectionGuide: {
    fontSize: TYPOGRAPHY.body,
    lineHeight: 21,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  examplesList: {
    gap: SPACING.sm,
  },
  exampleItemBox: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: 8,
  },
  exampleIndexBadge: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.indigoText,
    backgroundColor: COLORS.indigoSoft,
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
  },
  exampleKoBox: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  exampleKoTag: {
    backgroundColor: COLORS.indigoSoft,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 2,
  },
  exampleKoTagText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.indigoText,
  },
  exampleKoText: {
    flex: 1,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 21,
    fontWeight: '400',
    color: COLORS.text,
  },
  exampleKoLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  exampleKoLoadingText: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  exampleKoRetryBtn: {
    alignSelf: 'flex-start',
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.indigoSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exampleKoRetryText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.indigoText,
  },
  exampleAudioRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  exampleNormalBtn: {
    minHeight: TOUCH.minTarget,
    flexGrow: 1,
    minWidth: 108,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  exampleNormalBtnText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.white,
  },
  exampleSlowBtn: {
    minHeight: TOUCH.minTarget,
    flexGrow: 1,
    minWidth: 108,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.tealSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  exampleSlowBtnActive: {
    backgroundColor: COLORS.teal,
  },
  exampleSlowBtnText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.tealText,
  },
  exampleFastBtn: {
    minHeight: TOUCH.minTarget,
    flexGrow: 1,
    minWidth: 108,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.purpleSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  exampleFastBtnActive: {
    backgroundColor: COLORS.purple,
  },
  exampleFastBtnText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.purpleText,
  },
  exampleBtnTextActive: {
    color: COLORS.white,
  },
  symbolChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  symbolBacktrackChip: {
    minHeight: TOUCH.recommendedHeight,
    flexBasis: '46%',
    flexGrow: 1,
    minWidth: 148,
    backgroundColor: COLORS.purpleSoft,
    borderRadius: RADIUS.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 4,
  },
  symbolBacktrackIpa: {
    fontSize: TYPOGRAPHY.ipa,
    fontWeight: '700',
    color: COLORS.purpleText,
  },
  symbolBacktrackHint: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.text,
  },
  symbolBacktrackAction: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  symbolBacktrackActionText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.purpleText,
  },
  attributionBox: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    alignItems: 'center',
  },
  attributionText: {
    fontSize: 16,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  pressed: {
    opacity: 0.82,
  },
});
