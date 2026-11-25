import { CloudSlash, Gauge, Heart, Lightning, Microphone, Sparkle, SpeakerHigh, SpeakerLow, Translate } from '../../components/PlumpIcons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewStyle,
} from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { InfoTipBox, InfoTipButton } from '../../components/InfoTip';
import { PronunciationPracticeSheet } from '../../components/PronunciationPracticeCard';
import { Tap } from '../../components/Tap';
import { TappableExampleSentence } from '../../components/TappableExampleSentence';
import { WordMeaningSheet } from '../../components/WordMeaningSheet';
import { useSpeechAudio } from '../../hooks/useSpeechAudio';
import {
  fetchDailyFeedCandidates,
  lookupWordFromApis,
  translateEnglishSentenceToKorean,
} from '../../services/wordApi';
import { useLearningStore, type ShortsMode } from '../../store/useLearningStore';
import { useWordCacheStore } from '../../store/useWordCacheStore';
import { COLORS, LAYOUT, PALETTE, RADIUS, SHADOW, SPACING, TOUCH, TYPOGRAPHY } from '../../theme/tokens';
import type { CoreWord } from '../../types/learning';
import { triggerLightHaptic, triggerSuccessHaptic } from '../../utils/haptics';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

const INITIAL_BATCH_SIZE = 4;
const PREFETCH_BATCH_SIZE = 4;
const PREFETCH_AHEAD_THRESHOLD = 4;

const WEB_LIST_SNAP_STYLE: ViewStyle | undefined =
  Platform.OS === 'web'
    ? ({ scrollSnapType: 'y mandatory' } as unknown as ViewStyle)
    : undefined;

const WEB_PAGE_SNAP_STYLE: ViewStyle | undefined =
  Platform.OS === 'web'
    ? ({
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
      } as unknown as ViewStyle)
    : undefined;

const SHORTS_MODES: { id: ShortsMode; label: string }[] = [
  { id: 'both', label: '함께' },
  { id: 'word', label: '단어' },
  { id: 'sentence', label: '문장' },
];

interface ShortsPracticeTarget {
  id: string;
  text: string;
  ipa?: string;
  syllableCount: number;
  audioUrl?: string;
  audioAsset?: CoreWord['audioAsset'];
  isSentence: boolean;
}

function getFirstExample(item: CoreWord): { en: string; ko?: string } | null {
  if (item.examples && item.examples.length > 0 && item.examples[0].en.trim()) {
    return item.examples[0];
  }
  if (item.exampleEn && item.exampleEn.trim()) {
    return { en: item.exampleEn, ko: undefined };
  }
  return null;
}

export default function PronunciationShortsScreen() {
  const shortsMode = useLearningStore((s) => s.shortsMode);
  const setShortsMode = useLearningStore((s) => s.setShortsMode);

  // 세그먼트 컨트롤 슬라이딩 인디케이터
  const modeIndex = SHORTS_MODES.findIndex((m) => m.id === shortsMode);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable animated value
  const slideAnim = useMemo(() => new Animated.Value(modeIndex), []);
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: modeIndex,
      useNativeDriver: USE_NATIVE_DRIVER,
      tension: 300,
      friction: 25,
    }).start();
  }, [modeIndex, slideAnim]);
  const [feedWords, setFeedWords] = useState<CoreWord[]>([]);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [studiedIds, setStudiedIds] = useState<Record<string, boolean>>({});
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [feedError, setFeedError] = useState(false);
  const [tappedExampleWord, setTappedExampleWord] = useState<string | null>(null);
  const [openExampleTipId, setOpenExampleTipId] = useState<string | null>(null);
  const [practiceTarget, setPracticeTarget] = useState<ShortsPracticeTarget | null>(null);
  const [exampleKoMap, setExampleKoMap] = useState<Record<string, string>>({});
  const [translatingExamples, setTranslatingExamples] = useState<Record<string, boolean>>({});
  const [heartBurstWordId, setHeartBurstWordId] = useState<string | null>(null);

  const flatListRef = useRef<FlatList<CoreWord>>(null);
  const seenWordsRef = useRef<Set<string>>(new Set());
  const attemptedExampleRef = useRef<Set<string>>(new Set());
  const candidateQueueRef = useRef<string[]>([]);
  const discoveryCursorRef = useRef<number | null>(null);
  const lastSeedWordRef = useRef<string | undefined>(undefined);
  const isFetchingRef = useRef(false);
  const didInitRef = useRef(false);
  const mountedRef = useRef(true);
  const lastActiveIndexRef = useRef(0);
  const lastHeroTapRef = useRef<{ wordId: string; ts: number }>({ wordId: '', ts: 0 });
  const [heartBurstScale] = useState(() => new Animated.Value(0));
  const [heartBurstOpacity] = useState(() => new Animated.Value(0));

  const cachedWords = useWordCacheStore((state) => state.cachedWords);
  const bookmarkedWordKeys = useWordCacheStore((state) => state.bookmarkedWordKeys);
  const cacheHasHydrated = useWordCacheStore((state) => state.hasHydrated);
  const saveWord = useWordCacheStore((state) => state.saveWord);
  const toggleBookmark = useWordCacheStore((state) => state.toggleBookmark);

  const { playNormal, playSlow, playFast, stop, activeKey } = useSpeechAudio();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const emptySentenceFetchCountRef = useRef(0);

  // 탭 포커스 추적 + 이탈 시 재생 중인 음성 즉시 중단
  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      return () => {
        setIsScreenFocused(false);
        stop();
      };
    }, [stop])
  );

  const markStudied = useCallback((wordId: string) => {
    setStudiedIds((prev) => (prev[wordId] ? prev : { ...prev, [wordId]: true }));
  }, []);

  const triggerHeartBurst = useCallback(
    (wordId: string) => {
      setHeartBurstWordId(wordId);
      heartBurstScale.stopAnimation();
      heartBurstOpacity.stopAnimation();
      heartBurstScale.setValue(0.35);
      heartBurstOpacity.setValue(0);

      Animated.sequence([
        Animated.parallel([
          Animated.spring(heartBurstScale, {
            toValue: 1.15,
            speed: 24,
            bounciness: 14,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(heartBurstOpacity, {
            toValue: 1,
            duration: 130,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]),
        Animated.delay(340),
        Animated.parallel([
          Animated.timing(heartBurstScale, {
            toValue: 1.4,
            duration: 240,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(heartBurstOpacity, {
            toValue: 0,
            duration: 240,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]),
      ]).start(({ finished }) => {
        if (finished && mountedRef.current) {
          setHeartBurstWordId((prev) => (prev === wordId ? null : prev));
        }
      });
    },
    [heartBurstOpacity, heartBurstScale]
  );

  const handleHeroTap = useCallback(
    (item: CoreWord, isAlreadyBookmarked: boolean) => {
      const now = Date.now();
      const prev = lastHeroTapRef.current;
      if (prev.wordId === item.id && now - prev.ts < 320) {
        lastHeroTapRef.current = { wordId: '', ts: 0 };
        if (!isAlreadyBookmarked) {
          toggleBookmark(item);
        }
        markStudied(item.id);
        triggerSuccessHaptic();
        triggerHeartBurst(item.id);
        return;
      }
      lastHeroTapRef.current = { wordId: item.id, ts: now };
    },
    [markStudied, toggleBookmark, triggerHeartBurst]
  );

  const loadNextBatch = useCallback(
    async (count: number) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      if (discoveryCursorRef.current === null) {
        discoveryCursorRef.current = Math.floor(Math.random() * 130);
      }
      if (mountedRef.current) {
        setIsFetchingMore(true);
        setFeedError(false);
      }

      try {
        // 하드코딩 단어 목록 없이 Datamuse 알파벳 와일드카드 + 연상어 그래프 탐색으로 무한 수급
        let attempts = 0;
        while (candidateQueueRef.current.length < count && attempts < 5) {
          const candidates = await fetchDailyFeedCandidates(
            discoveryCursorRef.current,
            seenWordsRef.current,
            lastSeedWordRef.current
          );
          discoveryCursorRef.current += 1;
          attempts += 1;

          for (const w of candidates) {
            if (
              !seenWordsRef.current.has(w) &&
              !candidateQueueRef.current.includes(w)
            ) {
              candidateQueueRef.current.push(w);
            }
          }
        }

        const nextBatchKeys = candidateQueueRef.current.splice(0, count);
        if (nextBatchKeys.length === 0) {
          if (mountedRef.current) {
            setFeedError(true);
          }
          return;
        }

        for (const k of nextBatchKeys) {
          seenWordsRef.current.add(k);
        }

        let addedCount = 0;

        // 전체 배치를 기다리지 않고 각 단어가 완료되는 즉시 피드에 스트리밍 추가 (~0.5초)
        await Promise.allSettled(
          nextBatchKeys.map(async (w) => {
            const res = await lookupWordFromApis(w, { fastFeedMode: true });
            if (!res.word || !mountedRef.current) return;
            const resolvedWord = res.word;
            addedCount += 1;
            lastSeedWordRef.current = resolvedWord.word;
            saveWord(resolvedWord);
            setFeedWords((prev) => {
              if (prev.some((item) => item.id === resolvedWord.id)) {
                return prev;
              }
              return [...prev, resolvedWord];
            });
          })
        );

        if (mountedRef.current && addedCount === 0) {
          setFeedError(true);
        }
      } catch {
        if (mountedRef.current) {
          setFeedError(true);
        }
      } finally {
        isFetchingRef.current = false;
        if (mountedRef.current) {
          setIsFetchingMore(false);
        }
      }
    },
    [saveWord]
  );

  // 캐시 하이드레이션 완료 후 초기 피드 구성 (캐시 단어 즉시 표시 + 실시간 무한 API 선로딩)
  useEffect(() => {
    if (!cacheHasHydrated || didInitRef.current) return;
    didInitRef.current = true;

    let cancelled = false;
    const cachedList = Object.values(cachedWords).filter(
      (item) => item && item.word && item.syllables?.length > 0
    );

    void Promise.resolve().then(() => {
      if (cancelled) return;
      if (cachedList.length > 0) {
        const initialSlice = cachedList.slice(0, 4);
        for (const item of initialSlice) {
          seenWordsRef.current.add(item.word.toLowerCase());
        }
        lastSeedWordRef.current = initialSlice[initialSlice.length - 1]?.word;
        setFeedWords(initialSlice);
        // 처음부터 바로 뒤쪽 릴스 카드를 백그라운드에서 채워 끊김 방지
        void loadNextBatch(INITIAL_BATCH_SIZE);
      } else {
        void loadNextBatch(INITIAL_BATCH_SIZE);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [cacheHasHydrated, cachedWords, loadNextBatch]);

  const visibleFeedWords = useMemo(
    () =>
      shortsMode === 'sentence'
        ? feedWords.filter((w) => getFirstExample(w) !== null)
        : feedWords,
    [feedWords, shortsMode]
  );

  const handleChangeMode = useCallback(
    (nextMode: ShortsMode) => {
      if (nextMode === shortsMode) return;
      triggerLightHaptic();
      stop();
      emptySentenceFetchCountRef.current = 0;
      setShortsMode(nextMode);
      lastActiveIndexRef.current = 0;
      setActiveIndex(0);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      if (nextMode === 'sentence') {
        const sentenceCount = feedWords.filter((w) => getFirstExample(w) !== null).length;
        if (sentenceCount < 3 && !isFetchingRef.current) {
          void loadNextBatch(PREFETCH_BATCH_SIZE);
        }
      }
    },
    [feedWords, loadNextBatch, setShortsMode, shortsMode, stop]
  );

  // visibleFeedWords 길이가 줄어들었을 때(예: 하이드레이션 후 문장 모드 전환) 인덱스 클램핑
  const clampedActiveIndex =
    visibleFeedWords.length > 0
      ? Math.min(activeIndex, visibleFeedWords.length - 1)
      : 0;

  useEffect(() => {
    if (visibleFeedWords.length > 0) {
      emptySentenceFetchCountRef.current = 0;
    }
    if (lastActiveIndexRef.current !== clampedActiveIndex) {
      lastActiveIndexRef.current = clampedActiveIndex;
      if (viewportHeight > 0) {
        flatListRef.current?.scrollToOffset({
          offset: clampedActiveIndex * viewportHeight,
          animated: false,
        });
      }
    }
  }, [clampedActiveIndex, viewportHeight, visibleFeedWords.length]);

  // 현재 카드 기준 남은 카드가 4장 이하이고 로딩 중이 아니면 다음 배치를 자동으로 미리 불러옴
  useEffect(() => {
    if (!didInitRef.current || feedWords.length === 0 || isFetchingMore || feedError) {
      return;
    }
    if (shortsMode === 'sentence' && visibleFeedWords.length === 0) {
      if (emptySentenceFetchCountRef.current >= 2) return;
      emptySentenceFetchCountRef.current += 1;
    }
    if (visibleFeedWords.length - 1 - clampedActiveIndex > PREFETCH_AHEAD_THRESHOLD) return;

    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) {
        void loadNextBatch(PREFETCH_BATCH_SIZE);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [clampedActiveIndex, feedError, feedWords.length, isFetchingMore, loadNextBatch, shortsMode, visibleFeedWords.length]);

  const handleViewportLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    if (nextHeight > 0) {
      setViewportHeight((prev) => {
        if (Math.abs(prev - nextHeight) <= 2) return prev;
        if (prev > 0 && lastActiveIndexRef.current > 0) {
          flatListRef.current?.scrollToOffset({
            offset: lastActiveIndexRef.current * nextHeight,
            animated: false,
          });
        }
        return nextHeight;
      });
    }
  }, []);

  // 모바일 스와이프 + 웹 마우스 휠/트랙패드 스크롤 모두에서 현재 카드 인덱스를 실시간 추적
  const syncIndexFromOffset = useCallback(
    (offsetY: number) => {
      if (viewportHeight <= 0 || visibleFeedWords.length === 0) return;
      const rawIndex = Math.round(offsetY / viewportHeight);
      const nextIndex = Math.max(0, Math.min(visibleFeedWords.length - 1, rawIndex));
      if (nextIndex !== lastActiveIndexRef.current) {
        lastActiveIndexRef.current = nextIndex;
        setActiveIndex(nextIndex);
        stop();
      }
      // 끝부분이나 하단 로딩 카드로 스크롤했을 때 대기 중이 아니라면 즉시 추가 로드
      if (
        rawIndex >= visibleFeedWords.length - PREFETCH_AHEAD_THRESHOLD &&
        !isFetchingRef.current
      ) {
        void loadNextBatch(PREFETCH_BATCH_SIZE);
      }
    },
    [loadNextBatch, stop, viewportHeight, visibleFeedWords.length]
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      syncIndexFromOffset(event.nativeEvent.contentOffset.y);
    },
    [syncIndexFromOffset]
  );

  const scrollToCard = useCallback(
    (targetIndex: number) => {
      if (viewportHeight <= 0 || targetIndex < 0 || targetIndex >= visibleFeedWords.length) return;
      stop();
      lastActiveIndexRef.current = targetIndex;
      setActiveIndex(targetIndex);
      flatListRef.current?.scrollToOffset({
        offset: targetIndex * viewportHeight,
        animated: true,
      });
    },
    [stop, viewportHeight, visibleFeedWords.length]
  );

  // 웹에서 키보드 ↑ / ↓ 방향키로도 릴스처럼 한 장씩 넘기기 지원 (포커스된 탭 & 비입력 상태에서만)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !isScreenFocused) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (typeof document !== 'undefined') {
        const el = document.activeElement as HTMLElement | null;
        if (
          el &&
          (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
        ) {
          return;
        }
      }
      if (tappedExampleWord !== null || practiceTarget !== null || viewportHeight <= 0) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const cur = Math.min(lastActiveIndexRef.current, Math.max(0, visibleFeedWords.length - 1));
        if (cur < visibleFeedWords.length - 1) {
          scrollToCard(cur + 1);
        } else {
          void loadNextBatch(PREFETCH_BATCH_SIZE);
        }
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        const cur = Math.min(lastActiveIndexRef.current, Math.max(0, visibleFeedWords.length - 1));
        if (cur > 0) {
          scrollToCard(cur - 1);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isScreenFocused, loadNextBatch, practiceTarget, scrollToCard, tappedExampleWord, viewportHeight, visibleFeedWords.length]);

  const ensureExampleTranslation = useCallback(
    async (wordItem: CoreWord, sentence: string) => {
      setTranslatingExamples((prev) => ({ ...prev, [sentence]: true }));
      try {
        const ko = await translateEnglishSentenceToKorean(sentence);
        if (ko && mountedRef.current) {
          setExampleKoMap((prev) => ({ ...prev, [sentence]: ko }));
          const baseExamples =
            wordItem.examples && wordItem.examples.length > 0
              ? wordItem.examples
              : wordItem.exampleEn
                ? [{ en: wordItem.exampleEn }]
                : [];
          const updatedExamples = baseExamples.map((ex) =>
            ex.en === sentence ? { ...ex, ko } : ex
          );
          const enriched: CoreWord = {
            ...wordItem,
            examples: updatedExamples,
          };
          saveWord(enriched);
          setFeedWords((prev) =>
            prev.map((w) => (w.id === wordItem.id ? enriched : w))
          );
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
    [saveWord]
  );

  // 현재 보고 있는 쇼츠 카드의 예문에 한글 뜻이 없으면 자동으로 보강
  useEffect(() => {
    const activeItem = visibleFeedWords[clampedActiveIndex];
    if (!activeItem) return;
    const firstEx = getFirstExample(activeItem);
    if (!firstEx || firstEx.ko || attemptedExampleRef.current.has(firstEx.en)) {
      return;
    }
    attemptedExampleRef.current.add(firstEx.en);
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      void ensureExampleTranslation(activeItem, firstEx.en);
    });
    return () => {
      cancelled = true;
    };
  }, [clampedActiveIndex, ensureExampleTranslation, visibleFeedWords]);

  const studiedCount = Object.keys(studiedIds).length;
  const safeBookmarkKeys = useMemo(
    () => (Array.isArray(bookmarkedWordKeys) ? bookmarkedWordKeys : []),
    [bookmarkedWordKeys]
  );

  const renderCard = useCallback(
    ({ item, index }: { item: CoreWord; index: number }) => {
      const isBookmarked = safeBookmarkKeys.includes(item.word.toLowerCase());
      const firstExample = getFirstExample(item);
      const isSentenceOnly = shortsMode === 'sentence' && firstExample !== null;
      const isWordOnly = shortsMode === 'word';

      const slowKey = `shorts:${item.id}:slow`;
      const normalKey = `shorts:${item.id}:normal`;
      const fastKey = `shorts:${item.id}:fast`;
      const exSlowKey = `shorts:${item.id}:ex:slow`;
      const exNormalKey = `shorts:${item.id}:ex:normal`;
      const exFastKey = `shorts:${item.id}:ex:fast`;

      const isSlowPlaying = activeKey === slowKey;
      const isNormalPlaying = activeKey === normalKey;
      const isFastPlaying = activeKey === fastKey;
      const isExSlowPlaying = activeKey === exSlowKey;
      const isExNormalPlaying = activeKey === exNormalKey;
      const isExFastPlaying = activeKey === exFastKey;

      const showStressChips = item.syllables.length > 1;

      const resolvedExKo = firstExample
        ? firstExample.ko || exampleKoMap[firstExample.en]
        : undefined;
      const isExTranslating = Boolean(
        firstExample && translatingExamples[firstExample.en]
      );

      const openWordPractice = () => {
        stop();
        markStudied(item.id);
        setPracticeTarget({
          id: item.id,
          text: item.word,
          ipa: item.ipa,
          syllableCount: Math.max(1, item.syllables.length),
          audioUrl: item.audioUrl,
          audioAsset: item.audioAsset,
          isSentence: false,
        });
      };

      const openSentencePractice = () => {
        if (!firstExample) return;
        stop();
        markStudied(item.id);
        const wordCount = firstExample.en.trim().split(/\s+/).filter(Boolean).length;
        setPracticeTarget({
          id: `${item.id}:sentence`,
          text: firstExample.en,
          syllableCount: Math.max(3, wordCount * 2),
          isSentence: true,
        });
      };

      return (
        <View
          style={[
            styles.pageSlot,
            viewportHeight > 0 ? { height: viewportHeight } : styles.pageSlotFallback,
            WEB_PAGE_SNAP_STYLE,
          ]}
        >
          <View style={styles.shortsCard}>
            {/* 심플 상단 바: 품사·순번 (문장 모드에서는 핵심 단어 칩) + 북마크 */}
            <View style={styles.topBar}>
              <View style={styles.topMetaRow}>
                {isSentenceOnly ? (
                  <Pressable
                    onPress={() => setTappedExampleWord(item.word)}
                    style={({ pressed }) => [
                      styles.sentenceWordPill,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.word} ${item.meaningKo} 단어 뜻 보기`}
                  >
                    <Text style={styles.sentenceWordPillText} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                      {item.word}
                    </Text>
                    <Text style={styles.sentenceWordPillKo} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                      {item.meaningKo}
                    </Text>
                  </Pressable>
                ) : item.partOfSpeech ? (
                  <View style={styles.posBadge}>
                    <Text style={styles.posBadgeText} maxFontSizeMultiplier={1.25}>
                      {item.partOfSpeech}
                    </Text>
                  </View>
                ) : null}
                <Text style={styles.indexCaption} maxFontSizeMultiplier={1.25}>
                  #{index + 1}
                  {studiedCount > 0 ? ` · 오늘 ${studiedCount}` : ''}
                </Text>
              </View>

              <Tap
                onPress={() => {
                  triggerLightHaptic();
                  toggleBookmark(item);
                }}
                style={[
                  styles.bookmarkBtn,
                  isBookmarked && styles.bookmarkBtnActive,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isBookmarked }}
                accessibilityLabel={
                  isBookmarked ? `${item.word} 저장 해제` : `${item.word} 저장`
                }
              >
                <Heart
                  size={22}
                  color={isBookmarked ? '#FF3B30' : COLORS.textMuted}
                  weight={isBookmarked ? 'fill' : 'regular'}
                />
              </Tap>
            </View>

            {isSentenceOnly && firstExample ? (
              /* 문장 전용 쉐도잉 모드 */
              <View style={styles.sentenceHeroCenter}>
                <Pressable
                  onPress={() => handleHeroTap(item, isBookmarked)}
                  style={styles.sentenceHeroTapArea}
                  accessibilityHint="두 번 빠르게 누르면 단어장에 저장돼요"
                >
                  <View style={styles.sentenceHeroBox}>
                    <TappableExampleSentence
                      sentence={firstExample.en}
                      targetWord={item.word}
                      selectedWord={tappedExampleWord}
                      onWordPress={(w) => {
                        lastHeroTapRef.current = { wordId: '', ts: 0 };
                        setTappedExampleWord(w);
                      }}
                    />
                  </View>

                  {resolvedExKo ? (
                    <Text
                      style={styles.sentenceHeroKo}
                      numberOfLines={3}
                      maxFontSizeMultiplier={1.35}
                    >
                      {resolvedExKo}
                    </Text>
                  ) : isExTranslating ? (
                    <View style={styles.exampleKoLoadingRow}>
                      <ActivityIndicator size="small" color={COLORS.indigo} />
                      <Text
                        style={styles.exampleKoLoadingText}
                        maxFontSizeMultiplier={1.25}
                      >
                        문장 뜻 불러오는 중...
                      </Text>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() =>
                        void ensureExampleTranslation(item, firstExample.en)
                      }
                      style={({ pressed }) => [
                        styles.exampleKoRetryBtn,
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="문장 한글 뜻 보기"
                    >
                      <Translate size={16} color={COLORS.indigoText} />
                      <Text
                        style={styles.exampleKoRetryText}
                        maxFontSizeMultiplier={1.25}
                      >
                        문장 뜻 보기
                      </Text>
                    </Pressable>
                  )}
                </Pressable>

                {/* 핵심 단어 강세 리듬 (문장 모드에서도 단어 리듬 확인) */}
                {showStressChips ? (
                  <View style={styles.sentenceRhythmBox}>
                    <Text
                      style={styles.sentenceRhythmLabel}
                      maxFontSizeMultiplier={1.2}
                    >
                      핵심 단어 리듬 · {item.word}
                    </Text>
                    <View style={styles.syllablesRow}>
                      {item.syllables.map((syl, sIdx) => {
                        const isPrimary = syl.stress === 'primary';
                        const isSecondary = syl.stress === 'secondary';
                        const sentSylKey = `shorts:sent:${item.id}:syl:${sIdx}`;
                        const isSentSylPlaying = activeKey === sentSylKey;
                        return (
                          <Tap
                            key={`${item.id}-sent-syl-${sIdx}`}
                            onPress={() => {
                              triggerLightHaptic();
                              markStudied(item.id);
                              void playSlow(syl.text, { key: sentSylKey });
                            }}
                            style={[
                              styles.sylChip,
                              isPrimary && styles.sylChipPrimary,
                              !isPrimary && isSecondary && styles.sylChipSecondary,
                              isSentSylPlaying && styles.sylChipActive,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={`${syl.text} 음절 듣기`}
                          >
                            <View
                              style={[
                                styles.sylDot,
                                isPrimary ? styles.sylDotPrimary : isSecondary ? styles.sylDotSecondary : null,
                              ]}
                            />
                            <Text
                              style={[
                                styles.sylText,
                                isPrimary && styles.sylTextPrimary,
                                isSentSylPlaying && styles.sylTextActive,
                              ]}
                              maxFontSizeMultiplier={1.3}
                            >
                              {syl.text}
                            </Text>
                          </Tap>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                {/* 문장 전용 듣기·말하기 1줄 통합 버튼 */}
                <View style={styles.speedRow}>
                  <Tap
                    onPress={() => {
                      markStudied(item.id);
                      void playSlow(firstExample.en, { key: exSlowKey });
                    }}
                    style={[
                      styles.speedSlowBtn,
                      isExSlowPlaying && styles.speedSlowBtnActive,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="문장 천천히 듣기"
                  >
                    <Gauge
                      size={19}
                      color={isExSlowPlaying ? COLORS.white : COLORS.tealText}
                    />
                    <Text
                      style={[
                        styles.speedSlowText,
                        isExSlowPlaying && styles.speedTextActive,
                      ]}
                      maxFontSizeMultiplier={1.25}
                    >
                      {isExSlowPlaying ? '중' : '천천히'}
                    </Text>
                  </Tap>

                  <Tap
                    onPress={() => {
                      markStudied(item.id);
                      void playNormal(firstExample.en, { key: exNormalKey });
                    }}
                    style={[
                      styles.speedNormalBtn,
                      isExNormalPlaying && styles.speedNormalBtnActive,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="문장 보통 속도 듣기"
                  >
                    {!isExNormalPlaying ? (
                      <LinearGradient
                        pointerEvents="none"
                        colors={[PALETTE.brand[400], PALETTE.brand[600]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.md }]}
                      />
                    ) : null}
                    <View style={styles.ctaRow}>
                      <SpeakerHigh size={20} color={COLORS.white} />
                      <Text style={styles.speedNormalText} maxFontSizeMultiplier={1.25}>
                        {isExNormalPlaying ? '재생 중' : '듣기'}
                      </Text>
                    </View>
                  </Tap>

                  <Tap
                    onPress={() => {
                      markStudied(item.id);
                      void playFast(firstExample.en, { key: exFastKey });
                    }}
                    style={[
                      styles.speedFastBtn,
                      isExFastPlaying && styles.speedFastBtnActive,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="문장 빠르게 듣기"
                  >
                    <Lightning
                      size={19}
                      color={isExFastPlaying ? COLORS.white : COLORS.purpleText}
                    />
                    <Text
                      style={[
                        styles.speedFastText,
                        isExFastPlaying && styles.speedTextActive,
                      ]}
                      maxFontSizeMultiplier={1.25}
                    >
                      {isExFastPlaying ? '중' : '빠르게'}
                    </Text>
                  </Tap>

                  <Tap
                    onPress={openSentencePractice}
                    style={styles.speakCompactBtn}
                    accessibilityRole="button"
                    accessibilityLabel="문장 따라 말하고 내 발음 비교하기"
                  >
                    <Microphone size={19} color={COLORS.roseText} />
                    <Text style={styles.speakCompactText} maxFontSizeMultiplier={1.25}>
                      말하기
                    </Text>
                  </Tap>
                </View>
              </View>
            ) : (
              <>
                {/* 중앙 핵심 영역: 단어 (함께 / 단어 전용 모드) */}
                <View style={[styles.heroCenter, isWordOnly && styles.heroCenterWordOnly]}>
                  <Pressable
                    onPress={() => handleHeroTap(item, isBookmarked)}
                    style={styles.heroDoubleTapZone}
                    accessibilityHint="두 번 빠르게 누르면 단어장에 저장돼요"
                  >
                    <Text
                      style={[styles.heroWord, isWordOnly && styles.heroWordLarge]}
                      adjustsFontSizeToFit
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.3}
                    >
                      {item.word}
                    </Text>

                    <Text style={styles.heroMeaning} maxFontSizeMultiplier={1.35}>
                      {item.meaningKo}
                    </Text>

                    <View style={styles.pronRow}>
                      <View style={styles.ipaPill}>
                        <Text style={styles.ipaText} maxFontSizeMultiplier={1.3}>
                          {item.ipa}
                        </Text>
                      </View>
                      {item.koPronunciation ? (
                        <Text style={styles.koPronText} maxFontSizeMultiplier={1.3}>
                          {item.koPronunciation}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>

                  {/* 2음절 이상일 때만 강세 리듬 칩 표시 (터치하면 개별 음절 소리 재생) */}
                  {showStressChips ? (
                    <View style={styles.syllablesRow}>
                      {item.syllables.map((syl, sIdx) => {
                        const isPrimary = syl.stress === 'primary';
                        const isSecondary = syl.stress === 'secondary';
                        const sylKey = `shorts:${item.id}:syl:${sIdx}`;
                        const isSylPlaying = activeKey === sylKey;
                        return (
                          <Tap
                            key={`${item.id}-syl-${sIdx}`}
                            onPress={() => {
                              triggerLightHaptic();
                              markStudied(item.id);
                              void playSlow(syl.text, { key: sylKey });
                            }}
                            style={[
                              styles.sylChip,
                              isPrimary && styles.sylChipPrimary,
                              !isPrimary && isSecondary && styles.sylChipSecondary,
                              isSylPlaying && styles.sylChipActive,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={`${syl.text} 음절 듣기`}
                          >
                            <View
                              style={[
                                styles.sylDot,
                                isPrimary ? styles.sylDotPrimary : isSecondary ? styles.sylDotSecondary : null,
                              ]}
                            />
                            <Text
                              style={[
                                styles.sylText,
                                isPrimary && styles.sylTextPrimary,
                                isSylPlaying && styles.sylTextActive,
                              ]}
                              maxFontSizeMultiplier={1.3}
                            >
                              {syl.text}
                            </Text>
                            {isSylPlaying ? (
                              <SpeakerHigh size={14} color={COLORS.primary} />
                            ) : (
                              <SpeakerLow size={14} color={COLORS.textMuted} />
                            )}
                          </Tap>
                        );
                      })}
                    </View>
                  ) : null}

                  {/* 핵심 듣기·말하기 1줄 통합 버튼 */}
                  <View style={styles.speedRow}>
                    <Tap
                      onPress={() => {
                        markStudied(item.id);
                        void playSlow(item.word, { key: slowKey });
                      }}
                      style={[
                        styles.speedSlowBtn,
                        isSlowPlaying && styles.speedSlowBtnActive,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.word} 천천히 듣기`}
                    >
                      <Gauge
                        size={19}
                        color={isSlowPlaying ? COLORS.white : COLORS.tealText}
                      />
                      <Text
                        style={[
                          styles.speedSlowText,
                          isSlowPlaying && styles.speedTextActive,
                        ]}
                        maxFontSizeMultiplier={1.25}
                      >
                        {isSlowPlaying ? '중' : '천천히'}
                      </Text>
                    </Tap>

                    <Tap
                      onPress={() => {
                        markStudied(item.id);
                        void playNormal(item.word, {
                          audioUrl: item.audioUrl,
                          audioAsset: item.audioAsset,
                          key: normalKey,
                        });
                      }}
                      style={[
                        styles.speedNormalBtn,
                        isNormalPlaying && styles.speedNormalBtnActive,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.word} 보통 속도 듣기`}
                    >
                      {!isNormalPlaying ? (
                        <LinearGradient
                          pointerEvents="none"
                          colors={[PALETTE.brand[400], PALETTE.brand[600]]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.md }]}
                        />
                      ) : null}
                      <View style={styles.ctaRow}>
                        <SpeakerHigh size={20} color={COLORS.white} />
                        <Text style={styles.speedNormalText} maxFontSizeMultiplier={1.25}>
                          {isNormalPlaying ? '재생 중' : '듣기'}
                        </Text>
                      </View>
                    </Tap>

                    <Tap
                      onPress={() => {
                        markStudied(item.id);
                        void playFast(item.word, { key: fastKey });
                      }}
                      style={[
                        styles.speedFastBtn,
                        isFastPlaying && styles.speedFastBtnActive,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.word} 빠르게 듣기`}
                    >
                      <Lightning
                        size={19}
                        color={isFastPlaying ? COLORS.white : COLORS.purpleText}
                      />
                      <Text
                        style={[
                          styles.speedFastText,
                          isFastPlaying && styles.speedTextActive,
                        ]}
                        maxFontSizeMultiplier={1.25}
                      >
                        {isFastPlaying ? '중' : '빠르게'}
                      </Text>
                    </Tap>

                    <Tap
                      onPress={openWordPractice}
                      style={styles.speakCompactBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.word} 따라 말하고 내 발음 비교하기`}
                    >
                      <Microphone size={19} color={COLORS.roseText} />
                      <Text style={styles.speakCompactText} maxFontSizeMultiplier={1.25}>
                        말하기
                      </Text>
                    </Tap>
                  </View>
                </View>

                {/* 예문 + 한글 뜻 (함께 모드에서만 표시, 문장 말하기 버튼 포함) */}
                {!isWordOnly && firstExample ? (
                  <View style={styles.exampleBox}>
                    <View style={styles.exampleTopRow}>
                      <View style={styles.exampleLabelRow}>
                        <Text style={styles.exampleLabel} maxFontSizeMultiplier={1.25}>
                          예문
                        </Text>
                        <InfoTipButton
                          open={openExampleTipId === item.id}
                          onToggle={() =>
                            setOpenExampleTipId((prev) =>
                              prev === item.id ? null : item.id
                            )
                          }
                          accessibilityLabel="예문 단어 뜻 보기 안내"
                        />
                      </View>
                      <View style={styles.exampleMiniAudioRow}>
                        <Pressable
                          onPress={() =>
                            void playSlow(firstExample.en, { key: exSlowKey })
                          }
                          style={({ pressed }) => [
                            styles.exMiniSlowBtn,
                            isExSlowPlaying && styles.speedSlowBtnActive,
                            pressed && styles.pressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel="예문 천천히 듣기"
                        >
                          <Text
                            style={[
                              styles.exMiniSlowText,
                              isExSlowPlaying && styles.speedTextActive,
                            ]}
                            maxFontSizeMultiplier={1.2}
                          >
                            0.6x
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() =>
                            void playNormal(firstExample.en, { key: exNormalKey })
                          }
                          style={({ pressed }) => [
                            styles.exMiniPlayBtn,
                            isExNormalPlaying && styles.speedNormalBtnActive,
                            pressed && styles.pressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel="예문 듣기"
                        >
                          <SpeakerLow
                            size={16}
                            color={isExNormalPlaying ? COLORS.white : COLORS.primaryDark}
                          />
                          <Text
                            style={[
                              styles.exMiniPlayText,
                              isExNormalPlaying && styles.speedTextActive,
                            ]}
                            maxFontSizeMultiplier={1.2}
                          >
                            듣기
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={openSentencePractice}
                          style={({ pressed }) => [
                            styles.exMiniSpeakBtn,
                            pressed && styles.pressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel="예문 따라 말하기"
                        >
                          <Microphone size={15} color={COLORS.text} />
                        </Pressable>
                      </View>
                    </View>

                    <InfoTipBox
                      visible={openExampleTipId === item.id}
                      text="문장 속 궁금한 단어를 누르면 뜻과 발음을 바로 볼 수 있어요."
                      variant="surface"
                      onClose={() => setOpenExampleTipId(null)}
                    />

                    <TappableExampleSentence
                      sentence={firstExample.en}
                      targetWord={item.word}
                      selectedWord={tappedExampleWord}
                      onWordPress={(w) => setTappedExampleWord(w)}
                      compact
                    />

                    {resolvedExKo ? (
                      <Text
                        style={styles.exampleKo}
                        numberOfLines={2}
                        maxFontSizeMultiplier={1.35}
                      >
                        {resolvedExKo}
                      </Text>
                    ) : isExTranslating ? (
                      <View style={styles.exampleKoLoadingRow}>
                        <ActivityIndicator size="small" color={COLORS.indigo} />
                        <Text
                          style={styles.exampleKoLoadingText}
                          maxFontSizeMultiplier={1.25}
                        >
                          예문 뜻 불러오는 중...
                        </Text>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() =>
                          void ensureExampleTranslation(item, firstExample.en)
                        }
                        style={({ pressed }) => [
                          styles.exampleKoRetryBtn,
                          pressed && styles.pressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="예문 한글 뜻 보기"
                      >
                        <Translate size={16} color={COLORS.indigoText} />
                        <Text
                          style={styles.exampleKoRetryText}
                          maxFontSizeMultiplier={1.25}
                        >
                          예문 뜻 보기
                        </Text>
                      </Pressable>
                    )}
                  </View>
                ) : null}
              </>
            )}

            {/* 스와이프 안내 (위·아래 버튼 없이 직접 넘기기) */}
            <View style={styles.reelCueRow}>
              <Text style={styles.reelSwipeText} maxFontSizeMultiplier={1.2}>
                {isFetchingMore && index === visibleFeedWords.length - 1
                  ? '새 카드 불러오는 중...'
                  : '두 번 탭해서 저장 · 스와이프해서 다음'}
              </Text>
            </View>

            {/* 더블탭 코랄 하트 팝업 오버레이 */}
            {heartBurstWordId === item.id ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.heartBurstOverlay,
                  {
                    opacity: heartBurstOpacity,
                    transform: [{ scale: heartBurstScale }],
                  },
                ]}
              >
                {/* ④ 저장 축하 코랄 라디얼 글로우 (고정 px — 웹 svg 안전) */}
                <Svg
                  pointerEvents="none"
                  width={280}
                  height={280}
                  style={styles.heartGlow}
                >
                  <Defs>
                    <RadialGradient id="heartGlow" cx="50%" cy="50%" r="50%">
                      <Stop offset="0" stopColor={COLORS.primary} stopOpacity={0.3} />
                      <Stop offset="1" stopColor={COLORS.primary} stopOpacity={0} />
                    </RadialGradient>
                  </Defs>
                  <Rect width={280} height={280} fill="url(#heartGlow)" />
                </Svg>
                <View style={styles.heartBurstCircle}>
                  <Heart size={56} color="#FF3B30" weight="fill" />
                </View>
                <View style={styles.heartBurstPill}>
                  <Text style={styles.heartBurstText} maxFontSizeMultiplier={1.2}>
                    단어장에 저장했어요!
                  </Text>
                </View>
              </Animated.View>
            ) : null}
          </View>
        </View>
      );
    },
    [
      activeKey,
      ensureExampleTranslation,
      exampleKoMap,
      handleHeroTap,
      heartBurstOpacity,
      heartBurstScale,
      heartBurstWordId,
      isFetchingMore,
      markStudied,
      openExampleTipId,
      playFast,
      playNormal,
      playSlow,
      safeBookmarkKeys,
      shortsMode,
      stop,
      studiedCount,
      tappedExampleWord,
      toggleBookmark,
      translatingExamples,
      viewportHeight,
      visibleFeedWords.length,
    ]
  );

  const renderFooter = useCallback(() => {
    return (
      <View
        style={[
          styles.pageSlot,
          viewportHeight > 0 ? { height: viewportHeight } : styles.pageSlotFallback,
          WEB_PAGE_SNAP_STYLE,
        ]}
      >
        <View style={styles.footerLoadingCard}>
          {feedError ? (
            <>
              <CloudSlash size={34} color={COLORS.roseText} />
              <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.4}>
                다음 단어를 잠시 불러오지 못했어요
              </Text>
              <Text style={styles.emptySub} maxFontSizeMultiplier={1.45}>
                네트워크 연결을 확인한 뒤 다시 눌러 주세요.
              </Text>
              <Pressable
                onPress={() => void loadNextBatch(PREFETCH_BATCH_SIZE)}
                style={({ pressed }) => [
                  styles.retryBtn,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="새 단어 계속 불러오기"
              >
                <Text style={styles.retryBtnText} maxFontSizeMultiplier={1.3}>
                  계속 불러오기
                </Text>
              </Pressable>
            </>
          ) : isFetchingMore ? (
            <>
              <ActivityIndicator size="large" color={COLORS.rose} />
              <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.4}>
                다음 발음 피드를 불러오는 중...
              </Text>
              <Text style={styles.emptySub} maxFontSizeMultiplier={1.45}>
                새로운 실생활 영단어와 원어민 발음을 실시간으로 가져오고 있어요.
              </Text>
            </>
          ) : (
            <>
              <Sparkle size={34} color={COLORS.rose} />
              <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.4}>
                새로운 발음 피드가 준비돼 있어요
              </Text>
              <Text style={styles.emptySub} maxFontSizeMultiplier={1.45}>
                아래 버튼을 누르면 새 실생활 영단어를 바로 이어서 볼 수 있어요.
              </Text>
              <Pressable
                onPress={() => void loadNextBatch(PREFETCH_BATCH_SIZE)}
                style={({ pressed }) => [
                  styles.retryBtn,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="새 발음 피드 바로 불러오기"
              >
                <Text style={styles.retryBtnText} maxFontSizeMultiplier={1.3}>
                  새 단어 바로 불러오기
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    );
  }, [feedError, isFetchingMore, loadNextBatch, viewportHeight]);

  if (feedWords.length === 0) {
    return (
      <View style={styles.centerState}>
        {feedError ? (
          <View style={styles.emptyCard}>
            <CloudSlash size={36} color={COLORS.roseText} />
            <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.4}>
              단어 피드를 불러오지 못했어요
            </Text>
            <Text style={styles.emptySub} maxFontSizeMultiplier={1.45}>
              인터넷 연결을 확인한 뒤 다시 시도해 주세요.
            </Text>
            <Pressable
              onPress={() => void loadNextBatch(INITIAL_BATCH_SIZE)}
              style={({ pressed }) => [
                styles.retryBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="다시 불러오기"
            >
              <Text style={styles.retryBtnText} maxFontSizeMultiplier={1.3}>
                다시 불러오기
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <ActivityIndicator size="large" color={COLORS.rose} />
            <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.4}>
              발음 피드 카드를 준비하고 있어요
            </Text>
            <Text style={styles.emptySub} maxFontSizeMultiplier={1.45}>
              원어민 음성과 생활 예문을 실시간으로 모으는 중입니다...
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* 모드 전환 바: 함께 · 단어 · 문장 */}
      <View style={styles.modeBarWrap}>
        <View
          style={styles.modeSwitchTrack}
          accessibilityRole="tablist"
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        >
          {trackWidth > 0 && (
            <Animated.View
              style={[
                styles.modeSwitchIndicator,
                {
                  width: (trackWidth - 4) / SHORTS_MODES.length,
                  transform: [
                    {
                      translateX: slideAnim.interpolate({
                        inputRange: SHORTS_MODES.map((_, i) => i),
                        outputRange: SHORTS_MODES.map(
                          (_, i) => 2 + i * ((trackWidth - 4) / SHORTS_MODES.length),
                        ),
                      }),
                    },
                  ],
                },
              ]}
            />
          )}
          {SHORTS_MODES.map((m) => {
            const active = shortsMode === m.id;
            return (
              <Tap
                key={m.id}
                feel="playful"
                onPress={() => handleChangeMode(m.id)}
                style={styles.modeSwitchBtn}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${m.label} 모드`}
              >
                <Text
                  style={[
                    styles.modeSwitchText,
                    active && styles.modeSwitchTextActive,
                  ]}
                  maxFontSizeMultiplier={1.2}
                >
                  {m.label}
                </Text>
              </Tap>
            );
          })}
        </View>
      </View>

      <View style={styles.listViewport} onLayout={handleViewportLayout}>
        <FlatList
          ref={flatListRef}
          style={WEB_LIST_SNAP_STYLE}
          data={visibleFeedWords}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          ListFooterComponent={renderFooter}
          pagingEnabled={viewportHeight > 0}
          snapToInterval={viewportHeight > 0 ? viewportHeight : undefined}
          snapToAlignment="start"
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={handleScroll}
          onScrollEndDrag={handleScroll}
          onEndReached={() => void loadNextBatch(PREFETCH_BATCH_SIZE)}
          onEndReachedThreshold={1.5}
          onScrollToIndexFailed={({ index }) => {
            if (viewportHeight > 0) {
              flatListRef.current?.scrollToOffset({
                offset: index * viewportHeight,
                animated: true,
              });
            }
          }}
          getItemLayout={
            viewportHeight > 0
              ? (_, idx) => ({
                  length: viewportHeight,
                  offset: viewportHeight * idx,
                  index: idx,
                })
              : undefined
          }
          windowSize={5}
          initialNumToRender={2}
          maxToRenderPerBatch={3}
          removeClippedSubviews={false}
        />

        {/* ① 피드 위/아래 소프트 스크림 (카드가 부드럽게 사라지며 스크롤) */}
        <LinearGradient
          pointerEvents="none"
          colors={[COLORS.background, `${COLORS.background}00`]}
          style={styles.feedScrimTop}
        />
        <LinearGradient
          pointerEvents="none"
          colors={[`${COLORS.background}00`, COLORS.background]}
          style={styles.feedScrimBottom}
        />
      </View>

      <WordMeaningSheet
        word={tappedExampleWord}
        visible={tappedExampleWord !== null}
        onClose={() => setTappedExampleWord(null)}
      />

      <PronunciationPracticeSheet
        visible={practiceTarget !== null}
        word={practiceTarget?.text ?? null}
        ipa={practiceTarget?.ipa}
        syllableCount={Math.max(1, practiceTarget?.syllableCount ?? 1)}
        onPlayNative={() => {
          if (!practiceTarget) return;
          return playNormal(practiceTarget.text, {
            audioUrl: practiceTarget.isSentence ? undefined : practiceTarget.audioUrl,
            audioAsset: practiceTarget.isSentence ? undefined : practiceTarget.audioAsset,
            key: `shorts:practice:${practiceTarget.id}`,
          });
        }}
        onStopNative={stop}
        onClose={() => setPracticeTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modeBarWrap: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
    paddingBottom: 2,
    alignItems: 'center',
  },
  modeSwitchTrack: {
    width: '100%',
    maxWidth: 300,
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    padding: 2,
  },
  modeSwitchIndicator: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.card,
    ...SHADOW.card,
  },
  modeSwitchBtn: {
    flex: 1,
    minHeight: 34,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  modeSwitchText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  modeSwitchTextActive: {
    fontWeight: '700',
    color: COLORS.text,
  },
  listViewport: {
    flex: 1,
  },
  heartGlow: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -140,
    marginLeft: -140,
  },
  feedScrimTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 28,
    zIndex: 5,
  },
  feedScrimBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 44,
    zIndex: 5,
  },
  centerState: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
    ...SHADOW.card,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.sectionTitle,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 26,
  },
  retryBtn: {
    marginTop: SPACING.sm,
    minHeight: TOUCH.recommendedHeight,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: {
    fontSize: TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.white,
  },
  pageSlot: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: LAYOUT.floatingTabClearance - 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageSlotFallback: {
    minHeight: 560,
  },
  shortsCard: {
    position: 'relative',
    flex: 1,
    width: '100%',
    maxWidth: 560,
    backgroundColor: COLORS.card,
    borderRadius: 26,
    padding: SPACING.lg,
    justifyContent: 'space-between',
    gap: SPACING.md,
    overflow: 'hidden',
    ...SHADOW.card,
  },
  heroDoubleTapZone: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  heartBurstOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    zIndex: 10,
  },
  heartBurstCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartBurstPill: {
    backgroundColor: COLORS.text,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  heartBurstText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  topMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  posBadge: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  posBadgeText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  sentenceWordPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    maxWidth: '72%',
  },
  sentenceWordPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  sentenceWordPillKo: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textMuted,
    flexShrink: 1,
  },
  indexCaption: {
    fontSize: 15,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  bookmarkBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookmarkBtnActive: {},
  sentenceHeroCenter: {
    flex: 1,
    justifyContent: 'center',
    gap: SPACING.md,
  },
  sentenceHeroTapArea: {
    width: '100%',
    gap: SPACING.md,
  },
  sentenceHeroBox: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  sentenceHeroKo: {
    fontSize: 17,
    fontWeight: '500',
    color: COLORS.textSecondary,
    lineHeight: 25,
    textAlign: 'center',
    paddingHorizontal: SPACING.xs,
  },
  sentenceRhythmBox: {
    alignItems: 'center',
    gap: 6,
  },
  sentenceRhythmLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  heroCenter: {
    alignItems: 'center',
    gap: 10,
  },
  heroCenterWordOnly: {
    flex: 1,
    justifyContent: 'center',
    gap: 14,
  },
  heroWord: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  heroWordLarge: {
    fontSize: 38,
  },
  heroMeaning: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  pronRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ipaPill: {
    backgroundColor: COLORS.purpleSoft,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  ipaText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.purpleText,
  },
  koPronText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  syllablesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  sylChip: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 11,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sylChipPrimary: {
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sylChipSecondary: {
    backgroundColor: COLORS.tint,
  },
  sylDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.textMuted,
  },
  sylDotPrimary: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF6B6B',
  },
  sylDotSecondary: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.teal,
  },
  sylText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  sylTextPrimary: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.accentText,
  },
  sylChipActive: {
    backgroundColor: COLORS.tint,
  },
  sylTextActive: {
    color: COLORS.primaryDark,
  },
  speedRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  speedSlowBtn: {
    flex: 1,
    minWidth: 80,
    minHeight: TOUCH.minTarget,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.tealSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  speedSlowBtnActive: {
    backgroundColor: COLORS.teal,
  },
  speedSlowText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.tealText,
  },
  speedNormalBtn: {
    flex: 1.2,
    minWidth: 86,
    minHeight: TOUCH.minTarget,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  speedNormalBtnActive: {
    backgroundColor: COLORS.primaryDark,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    zIndex: 1,
  },
  speedNormalText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.white,
  },
  speedFastBtn: {
    flex: 1,
    minWidth: 80,
    minHeight: TOUCH.minTarget,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.purpleSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  speedFastBtnActive: {
    backgroundColor: COLORS.purple,
  },
  speedFastText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.purpleText,
  },
  speakCompactBtn: {
    flex: 1,
    minWidth: 80,
    minHeight: TOUCH.minTarget,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.roseSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  speakCompactText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.roseText,
  },
  speedTextActive: {
    color: COLORS.white,
  },
  exampleBox: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: 8,
  },
  exampleTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  exampleLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exampleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.indigoText,
  },
  exampleMiniAudioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exMiniSlowBtn: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exMiniSlowText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.tealText,
  },
  exMiniPlayBtn: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.tint,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exMiniPlayText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.primaryDark,
  },
  exMiniSpeakBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exampleKo: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textMuted,
    lineHeight: 23,
  },
  exampleKoLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exampleKoLoadingText: {
    fontSize: 15,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  exampleKoRetryBtn: {
    alignSelf: 'flex-start',
    minHeight: 38,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.indigoSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  exampleKoRetryText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.indigoText,
  },
  reelCueRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  reelSwipeText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  footerLoadingCard: {
    flex: 1,
    width: '100%',
    maxWidth: 560,
    backgroundColor: COLORS.card,
    borderRadius: 26,
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    ...SHADOW.card,
  },
  pressed: {
    opacity: 0.82,
  },
});
