import {
  ArrowsClockwise,
  BookOpen,
  CaretRight,
  ChartBar,
  Check,
  CheckCircle,
  Clock,
  Fire,
  Gauge,
  Heart,
  MagnifyingGlass,
  PencilSimple,
  Play,
  Sparkle,
  SpeakerHigh,
  SpeakerLow,
  User,
  XCircle,
} from '../../components/PlumpIcons';
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
import { BookmarkFlipDeck } from '../../components/BookmarkFlipDeck';
import { DailyGoalRing } from '../../components/DailyGoalRing';
import { InfoTipBox, InfoTipButton } from '../../components/InfoTip';
import { SymbolDetailSheet } from '../../components/SymbolDetailSheet';
import { IPA_SYMBOL_BY_ID } from '../../data/categories';
import { useSpeechAudio } from '../../hooks/useSpeechAudio';
import {
  formatStudyDuration,
  getLocalDateKey,
  getRecentWeekDays,
  getReviewStatusMeta,
  isWordDueForReview,
  normalizeReviewWordKey,
  useLearningStore,
} from '../../store/useLearningStore';
import { useWordCacheStore } from '../../store/useWordCacheStore';
import { COLORS, LAYOUT, RADIUS, SHADOW, SPACING, TOUCH, TYPOGRAPHY } from '../../theme/tokens';
import type { CoreWord, IpaSymbol } from '../../types/learning';
import { triggerLightHaptic } from '../../utils/haptics';

type BookmarkFilter = 'all' | 'words' | 'symbols';
type WordViewMode = 'list' | 'deck';

export default function BookmarksScreen() {
  const [filter, setFilter] = useState<BookmarkFilter>('all');
  const [wordViewMode, setWordViewMode] = useState<WordViewMode>('list');
  const [filterText, setFilterText] = useState('');
  const [activeSymbol, setActiveSymbol] = useState<IpaSymbol | null>(null);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState('');
  const [showSavedInfo, setShowSavedInfo] = useState(false);
  const navSeqRef = useRef(0);

  const cachedWords = useWordCacheStore((state) => state.cachedWords);
  const bookmarkedWordKeys = useWordCacheStore((state) => state.bookmarkedWordKeys);
  const cacheHasHydrated = useWordCacheStore((state) => state.hasHydrated);
  const toggleBookmark = useWordCacheStore((state) => state.toggleBookmark);

  const learnedSymbolIds = useLearningStore((state) => state.learnedSymbolIds);
  const bookmarkedSymbolIds = useLearningStore((state) => state.bookmarkedSymbolIds);
  const toggleSymbolBookmark = useLearningStore((state) => state.toggleSymbolBookmark);
  const showKoPronunciation = useLearningStore((state) => state.showKoPronunciation);
  const nickname = useLearningStore((state) => state.nickname);
  const setNickname = useLearningStore((state) => state.setNickname);
  const totalStudySeconds = useLearningStore((state) => state.totalStudySeconds);
  const todayDateKey = useLearningStore((state) => state.todayDateKey);
  const todayStudySeconds = useLearningStore((state) => state.todayStudySeconds);
  const currentStreakDays = useLearningStore((state) => state.currentStreakDays);
  const longestStreakDays = useLearningStore((state) => state.longestStreakDays);
  const activeDateHistory = useLearningStore((state) => state.activeDateHistory);
  const wordReviews = useLearningStore((state) => state.wordReviews);
  const recordWordReview = useLearningStore((state) => state.recordWordReview);
  const recordAppVisit = useLearningStore((state) => state.recordAppVisit);
  const learningHasHydrated = useLearningStore((state) => state.hasHydrated);

  const { playNormal, playSlow, stop, activeKey } = useSpeechAudio();

  useFocusEffect(
    useCallback(() => {
      if (learningHasHydrated) {
        recordAppVisit();
      }
      return () => {
        stop();
      };
    }, [learningHasHydrated, recordAppVisit, stop])
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

  const todayKey = getLocalDateKey();

  const dueWords = useMemo(() => {
    return bookmarkedWords.filter((w) => {
      const key = normalizeReviewWordKey(w.word);
      return isWordDueForReview(wordReviews[key], todayKey);
    });
  }, [bookmarkedWords, wordReviews, todayKey]);

  const handleReviewWord = useCallback(
    (wordKey: string, outcome: 'pass' | 'again') => {
      recordWordReview(wordKey, outcome);
    },
    [recordWordReview]
  );

  const handleOpenInReader = (word: string) => {
    stop();
    navSeqRef.current += 1;
    router.push({
      pathname: '/(tabs)',
      params: { word, ts: String(navSeqRef.current) },
    });
  };

  const handleStartEditNickname = () => {
    setNicknameDraft(nickname);
    setIsEditingNickname(true);
  };

  const handleSaveNickname = () => {
    setNickname(nicknameDraft);
    setIsEditingNickname(false);
  };

  const isHydrated = cacheHasHydrated && learningHasHydrated;
  const totalCount = bookmarkedWords.length + bookmarkedSymbols.length;
  const shouldShowKoHint = learningHasHydrated ? showKoPronunciation : true;

  const displayNickname = nickname.trim() || '학습자';
  const avatarInitial = nickname.trim().slice(0, 1);
  const displayStreak = Math.max(learningHasHydrated ? currentStreakDays : 1, 1);
  const displayLongest = Math.max(longestStreakDays, displayStreak);
  const displayTodaySec = todayDateKey === todayKey ? todayStudySeconds : 0;
  const safeHistory = useMemo(
    () => (Array.isArray(activeDateHistory) ? activeDateHistory : []),
    [activeDateHistory]
  );
  const recentWeek = useMemo(() => getRecentWeekDays(7), []);
  const activeDateSet = useMemo(() => new Set(safeHistory), [safeHistory]);
  const weekCheckedCount = recentWeek.filter(
    (d) => d.isToday || activeDateSet.has(d.key)
  ).length;
  const totalActiveDays = Math.max(safeHistory.length, 1);

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
        {/* 1. 마이 프로필 & 닉네임 설정 카드 */}
        <View style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <View style={styles.avatarCircle}>
              {avatarInitial ? (
                <Text style={styles.avatarInitialText} maxFontSizeMultiplier={1.2}>
                  {avatarInitial}
                </Text>
              ) : (
                <User size={26} color={COLORS.text} />
              )}
            </View>

            <View style={styles.profileInfoCol}>
              <Text style={styles.profileGreeting} maxFontSizeMultiplier={1.35}>
                {displayNickname}님
              </Text>
              <Text style={styles.profileSub} maxFontSizeMultiplier={1.35}>
                {displayStreak >= 2
                  ? `${displayStreak}일 연속으로 바로영어와 함께하는 중이에요`
                  : '오늘도 바로영어 학습을 시작했어요'}
              </Text>
            </View>

            {!isEditingNickname ? (
              <Pressable
                onPress={handleStartEditNickname}
                style={({ pressed }) => [
                  styles.editNicknameBtn,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="닉네임 설정 및 변경"
              >
                <PencilSimple size={16} color={COLORS.textMuted} />
                <Text style={styles.editNicknameBtnText} maxFontSizeMultiplier={1.2}>
                  {nickname.trim() ? '변경' : '닉네임'}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {isEditingNickname ? (
            <View style={styles.nicknameEditorBox}>
              <TextInput
                value={nicknameDraft}
                onChangeText={setNicknameDraft}
                placeholder="닉네임을 입력하세요 (최대 16자)"
                placeholderTextColor={COLORS.textMuted}
                style={styles.nicknameInput}
                maxLength={16}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSaveNickname}
                accessibilityLabel="닉네임 입력"
              />
              <View style={styles.nicknameEditorActions}>
                <Pressable
                  onPress={() => setIsEditingNickname(false)}
                  style={({ pressed }) => [
                    styles.nicknameCancelBtn,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="닉네임 수정 취소"
                >
                  <Text style={styles.nicknameCancelText} maxFontSizeMultiplier={1.25}>
                    취소
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleSaveNickname}
                  style={({ pressed }) => [
                    styles.nicknameSaveBtn,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="닉네임 저장"
                >
                  <Text style={styles.nicknameSaveText} maxFontSizeMultiplier={1.25}>
                    저장하기
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>

        {/* 2. 학습 통계 & 연속 실행 기록 카드 */}
        <View style={styles.statsCard}>
          <View style={styles.statsHeaderRow}>
            <Text style={styles.summaryTitle} maxFontSizeMultiplier={1.35}>
              나의 학습 통계
            </Text>
            <View style={styles.liveTrackingPill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveTrackingText} maxFontSizeMultiplier={1.2}>
                실시간 기록 중
              </Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            {/* 연속 실행 */}
            <View style={[styles.statTile, styles.statTileStreak]}>
              <View style={styles.statTileTop}>
                <Fire size={18} color={COLORS.accent} weight="fill" />
                <Text style={styles.statLabelStreak} maxFontSizeMultiplier={1.2}>
                  연속 실행
                </Text>
              </View>
              <Text style={styles.statValue} maxFontSizeMultiplier={1.25}>
                {displayStreak}일
              </Text>
              <Text style={styles.statSub} maxFontSizeMultiplier={1.2}>
                최고 {displayLongest}일
              </Text>
            </View>

            {/* 오늘 이용 시간 */}
            <View style={[styles.statTile, styles.statTileToday]}>
              <View style={styles.statTileTop}>
                <Clock size={18} color={COLORS.textSecondary} />
                <Text style={styles.statLabelToday} maxFontSizeMultiplier={1.2}>
                  오늘 이용
                </Text>
              </View>
              <Text style={styles.statValue} maxFontSizeMultiplier={1.25}>
                {formatStudyDuration(displayTodaySec)}
              </Text>
              <Text style={styles.statSub} maxFontSizeMultiplier={1.2}>
                오늘 누적
              </Text>
            </View>

            {/* 총 누적 이용 시간 */}
            <View style={[styles.statTile, styles.statTileTotal]}>
              <View style={styles.statTileTop}>
                <ChartBar size={18} color={COLORS.purple} />
                <Text style={styles.statLabelTotal} maxFontSizeMultiplier={1.2}>
                  총 이용
                </Text>
              </View>
              <Text style={styles.statValue} maxFontSizeMultiplier={1.25}>
                {formatStudyDuration(totalStudySeconds)}
              </Text>
              <Text style={styles.statSub} maxFontSizeMultiplier={1.2}>
                누적 {totalActiveDays}일 출석
              </Text>
            </View>
          </View>

          {/* 오늘 5분 목표 SVG 원형 프로그레스 링 */}
          <DailyGoalRing
            todaySeconds={displayTodaySec}
            streakDays={displayStreak}
          />

          {/* 최근 7일 연속 출석 기록 */}
          <View style={styles.streakWeekBox}>
            <View style={styles.streakWeekHeader}>
              <Text style={styles.streakWeekTitle} maxFontSizeMultiplier={1.25}>
                최근 7일 연속 실행 기록
              </Text>
              <Text style={styles.streakWeekCount} maxFontSizeMultiplier={1.2}>
                {weekCheckedCount}/7일
              </Text>
            </View>

            <View style={styles.streakWeekRow}>
              {recentWeek.map((day) => {
                const isDone = day.isToday || activeDateSet.has(day.key);
                return (
                  <View key={day.key} style={styles.streakDayCol}>
                    <Text
                      style={[
                        styles.streakWeekdayLabel,
                        day.isToday && styles.streakWeekdayToday,
                      ]}
                      maxFontSizeMultiplier={1.2}
                    >
                      {day.isToday ? '오늘' : day.weekdayKo}
                    </Text>
                    <View
                      style={[
                        styles.streakDayCircle,
                        isDone &&
                          (day.isToday
                            ? styles.streakDayCircleToday
                            : styles.streakDayCircleDone),
                      ]}
                    >
                      {isDone ? (
                        day.isToday ? (
                          <Fire size={17} color={COLORS.white} weight="fill" />
                        ) : (
                          <Check size={17} color={COLORS.white} weight="bold" />
                        )
                      ) : (
                        <Text
                          style={styles.streakDayNumText}
                          maxFontSizeMultiplier={1.15}
                        >
                          {day.dayNum}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* 3. 오늘 다시 꺼낼 단어 (간격 반복) */}
        {dueWords.length > 0 && (
          <View style={styles.dueCard}>
            <View style={styles.dueHeaderRow}>
              <Sparkle size={18} color={COLORS.accent} weight="fill" />
              <Text style={styles.dueTitle} maxFontSizeMultiplier={1.35}>
                오늘 다시 꺼낼 단어
              </Text>
              <View style={styles.dueBadge}>
                <Text style={styles.dueBadgeText} maxFontSizeMultiplier={1.2}>
                  {dueWords.length}개
                </Text>
              </View>
            </View>
            <Text style={styles.dueSub} maxFontSizeMultiplier={1.35}>
              며칠 뒤 다시 꺼내서 떠올리면 훨씬 오래 기억돼요
            </Text>
            <View style={styles.dueChipRow}>
              {dueWords.slice(0, 5).map((w) => (
                <View key={w.id} style={styles.dueChip}>
                  <Text style={styles.dueChipText} maxFontSizeMultiplier={1.2}>
                    {w.word}
                  </Text>
                </View>
              ))}
              {dueWords.length > 5 && (
                <View style={styles.dueChip}>
                  <Text style={styles.dueChipText} maxFontSizeMultiplier={1.2}>
                    +{dueWords.length - 5}
                  </Text>
                </View>
              )}
            </View>
            <Pressable
              onPress={() => {
                triggerLightHaptic();
                stop();
                setFilter('words');
                setWordViewMode('deck');
              }}
              style={({ pressed }) => [styles.dueStartBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="카드 복습 시작하기"
            >
              <ArrowsClockwise size={18} color={COLORS.white} />
              <Text style={styles.dueStartBtnText} maxFontSizeMultiplier={1.25}>
                카드 복습 시작
              </Text>
            </Pressable>
          </View>
        )}

        {/* 4. 저장한 단어 · 발음기호 섹션 */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeaderRow}>
            <View style={styles.summaryTitleRow}>
              <Text style={styles.summaryTitle} maxFontSizeMultiplier={1.4}>
                저장한 단어 · 발음기호
              </Text>
              <InfoTipButton
                open={showSavedInfo}
                onToggle={() => setShowSavedInfo((prev) => !prev)}
                accessibilityLabel="저장한 단어 안내 보기"
              />
            </View>
            <View style={styles.countBadge}>
              <Heart size={18} color="#FF3B30" weight="fill" />
              <Text style={styles.countBadgeText} maxFontSizeMultiplier={1.3}>
                {totalCount}개
              </Text>
            </View>
          </View>

          <InfoTipBox
            visible={showSavedInfo}
            text="하트를 눌러 저장한 영단어와 발음기호를 언제든 꺼내 복습할 수 있어요."
            onClose={() => setShowSavedInfo(false)}
          />

          <View style={styles.filterTabsRow}>
            {(
              [
                { id: 'all', label: `전체 ${totalCount}`, activeBg: COLORS.text },
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
              <MagnifyingGlass size={20} color={COLORS.textMuted} />
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
                  <XCircle size={22} color={COLORS.textMuted} />
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* 저장 목록 또는 빈 상태 */}
        {!isHydrated ? null : totalCount === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Heart size={38} color="#FF3B30" />
            </View>
            <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.4}>
              아직 저장한 항목이 없어요
            </Text>
            <Text style={styles.emptyBody} maxFontSizeMultiplier={1.45}>
              공부하다가 다시 보고 싶은 단어 또는 발음기호에서 하트를 눌러
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
                <BookOpen size={20} color={COLORS.white} />
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
                <Play size={20} color={COLORS.roseText} />
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
              accessibilityLabel="전체 저장 목록 보기"
            >
              <Text style={styles.emptyResetBtnText} maxFontSizeMultiplier={1.3}>
                전체 저장 목록 보기
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.sectionsStack}>
            {/* 저장한 단어 섹션 */}
            {showWordsSection ? (
              <View style={styles.listStack}>
                <View style={styles.wordSectionHeaderRow}>
                  <Text style={styles.sectionHeading} maxFontSizeMultiplier={1.35}>
                    저장한 영단어 ({filteredWords.length})
                  </Text>
                  <View style={styles.viewModeSwitch}>
                    <Pressable
                      onPress={() => {
                        triggerLightHaptic();
                        setWordViewMode('list');
                      }}
                      style={({ pressed }) => [
                        styles.viewModePill,
                        wordViewMode === 'list' && styles.viewModePillActive,
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: wordViewMode === 'list' }}
                    >
                      <Text
                        style={[
                          styles.viewModeText,
                          wordViewMode === 'list' && styles.viewModeTextActive,
                        ]}
                        maxFontSizeMultiplier={1.2}
                      >
                        목록
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        triggerLightHaptic();
                        stop();
                        setWordViewMode('deck');
                      }}
                      style={({ pressed }) => [
                        styles.viewModePill,
                        wordViewMode === 'deck' && styles.viewModePillDeckActive,
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: wordViewMode === 'deck' }}
                    >
                      <Text
                        style={[
                          styles.viewModeText,
                          wordViewMode === 'deck' && styles.viewModeTextActive,
                        ]}
                        maxFontSizeMultiplier={1.2}
                      >
                        카드 복습
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {wordViewMode === 'deck' ? (
                  <BookmarkFlipDeck
                    key={filteredWords.map((w) => w.id).join('|')}
                    words={filteredWords}
                    showKoHint={shouldShowKoHint}
                    onOpenInReader={handleOpenInReader}
                    onReviewWord={handleReviewWord}
                  />
                ) : filteredWords.map((item) => {
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
                          {(() => {
                            const meta = getReviewStatusMeta(
                              wordReviews[normalizeReviewWordKey(item.word)],
                              todayKey
                            );
                            return (
                              <View style={[
                                styles.reviewBadge,
                                meta.isMastered && styles.reviewBadgeMastered,
                                meta.isDue && styles.reviewBadgeDue,
                              ]}>
                                <Text style={[
                                  styles.reviewBadgeText,
                                  meta.isMastered && styles.reviewBadgeTextMastered,
                                  meta.isDue && styles.reviewBadgeTextDue,
                                ]} maxFontSizeMultiplier={1.2}>
                                  {meta.label}
                                </Text>
                              </View>
                            );
                          })()}
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
                          accessibilityLabel={`${item.word} 저장 해제`}
                        >
                          <Heart size={22} color="#FF3B30" weight="fill" />
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
                            <SpeakerHigh size={20} color={COLORS.white} />
                          ) : (
                            <SpeakerLow size={20} color={COLORS.white} />
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
                          <Gauge
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
                          <CaretRight
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
                              <CheckCircle
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
                        accessibilityLabel={`${sym.ipa} 저장 해제`}
                      >
                        <Heart size={22} color="#FF3B30" weight="fill" />
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
        contextLabel="저장한 발음기호"
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
  profileCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    gap: SPACING.sm,
    ...SHADOW.card,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  profileInfoCol: {
    flex: 1,
    gap: 3,
  },
  profileGreeting: {
    fontSize: TYPOGRAPHY.sectionTitle,
    fontWeight: '700',
    color: COLORS.text,
  },
  profileSub: {
    fontSize: 15,
    fontWeight: '400',
    color: COLORS.textMuted,
    lineHeight: 22,
  },
  editNicknameBtn: {
    minHeight: 42,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.background,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  editNicknameBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  nicknameEditorBox: {
    gap: SPACING.sm,
  },
  nicknameInput: {
    minHeight: TOUCH.minTarget,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.text,
  },
  nicknameEditorActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  nicknameCancelBtn: {
    flex: 1,
    minHeight: TOUCH.minTarget,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nicknameCancelText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  nicknameSaveBtn: {
    flex: 2,
    minHeight: TOUCH.minTarget,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nicknameSaveText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.white,
  },
  statsCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    gap: SPACING.sm,
    ...SHADOW.card,
  },
  statsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  liveTrackingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
  },
  liveTrackingText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  statTile: {
    flexGrow: 1,
    flexBasis: 100,
    borderRadius: RADIUS.lg,
    padding: 14,
    gap: 6,
  },
  statTileStreak: {
    backgroundColor: COLORS.background,
  },
  statTileToday: {
    backgroundColor: COLORS.background,
  },
  statTileTotal: {
    backgroundColor: COLORS.background,
  },
  statTileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statLabelStreak: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  statLabelToday: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  statLabelTotal: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  statSub: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  streakWeekBox: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  streakWeekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streakWeekTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  streakWeekCount: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.successText,
  },
  streakWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
  },
  streakDayCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  streakWeekdayLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  streakWeekdayToday: {
    fontWeight: '700',
    color: COLORS.accentText,
  },
  streakDayCircle: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakDayCircleDone: {
    backgroundColor: COLORS.success,
  },
  streakDayCircleToday: {
    backgroundColor: COLORS.accent,
  },
  streakDayNumText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    gap: SPACING.sm,
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
  summaryTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryTitle: {
    fontSize: TYPOGRAPHY.sectionTitle,
    fontWeight: '700',
    color: COLORS.text,
  },
  summarySub: {
    fontSize: TYPOGRAPHY.body,
    lineHeight: 21,
    color: COLORS.textMuted,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.tint,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
  },
  countBadgeText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.primaryDark,
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
    width: 64,
    height: 64,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.tint,
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
    lineHeight: 21,
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
    backgroundColor: COLORS.tint,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  emptyResetBtnText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.primaryDark,
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
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  posBadge: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  posBadgeText: {
    fontSize: 12,
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
    width: TOUCH.minTarget,
    height: TOUCH.minTarget,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.tint,
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
    backgroundColor: COLORS.card,
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
  wordSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  viewModeSwitch: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.pill,
    padding: 3,
    gap: 3,
    ...SHADOW.card,
  },
  viewModePill: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  viewModePillActive: {
    backgroundColor: COLORS.text,
  },
  viewModePillDeckActive: {
    backgroundColor: COLORS.primary,
  },
  viewModeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  viewModeTextActive: {
    color: COLORS.white,
  },
  dueCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    gap: SPACING.sm,
    ...SHADOW.card,
  },
  dueHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dueTitle: {
    flex: 1,
    fontSize: TYPOGRAPHY.sectionTitle,
    fontWeight: '700',
    color: COLORS.text,
  },
  dueBadge: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  dueBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.accentText,
  },
  dueSub: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  dueChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dueChip: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dueChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  dueStartBtn: {
    minHeight: TOUCH.recommendedHeight,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dueStartBtnText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.white,
  },
  reviewBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
  reviewBadgeMastered: {
    backgroundColor: COLORS.successSoft,
  },
  reviewBadgeDue: {
    backgroundColor: COLORS.accentSoft,
  },
  reviewBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  reviewBadgeTextMastered: {
    color: COLORS.successText,
    fontWeight: '700',
  },
  reviewBadgeTextDue: {
    color: COLORS.accentText,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.82,
  },
});
