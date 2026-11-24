import { ArrowsClockwise, CheckCircle, Gauge, Heart, Smiley, Sparkle, SpeakerHigh, SpeakerLow, X } from './PlumpIcons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSpeechAudio } from '../hooks/useSpeechAudio';
import { fetchSymbolExamplesByLevel } from '../services/wordApi';
import { useLearningStore } from '../store/useLearningStore';
import { COLORS, LAYOUT, RADIUS, SHADOW, SPACING, TOUCH, TYPOGRAPHY } from '../theme/tokens';
import { InfoTipBox, InfoTipButton } from './InfoTip';
import type {
  ExampleDifficultyLevel,
  IpaSymbol,
  SymbolExampleWord,
} from '../types/learning';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

const DIFFICULTY_TABS: {
  id: ExampleDifficultyLevel;
  label: string;
  titleLabel: string;
  activeBg: string;
}[] = [
  { id: 'beginner', label: '초급', titleLabel: '초급', activeBg: COLORS.text },
  { id: 'intermediate', label: '중급', titleLabel: '중급', activeBg: COLORS.text },
  { id: 'advanced', label: '고급', titleLabel: '고급', activeBg: COLORS.text },
];

interface SymbolDetailSheetProps {
  symbol: IpaSymbol | null;
  visible: boolean;
  onClose: () => void;
  /** Tab 2 기호 역추적에서 열렸을 때 상단에 맥락 배지 표시 */
  contextLabel?: string;
}

function renderEmphasizedExampleWord(ex: SymbolExampleWord) {
  if (!ex.segments || ex.segments.length === 0) {
    return (
      <Text style={styles.exampleWord} maxFontSizeMultiplier={1.4}>
        {ex.word}
      </Text>
    );
  }

  if (ex.isSyllableSplit) {
    return (
      <View style={styles.splitWordBlock}>
        {/* 전체 영단어 원형 (철자 한눈에 확인 + 강세 구간 은은한 강조) */}
        <Text style={styles.exampleWord} maxFontSizeMultiplier={1.4}>
          {ex.segments.map((seg, idx) => (
            <Text
              key={`${ex.word}-full-${idx}`}
              style={
                seg.role === 'stress'
                  ? styles.fullWordStressSpan
                  : undefined
              }
            >
              {seg.text}
            </Text>
          ))}
        </Text>

        {/* 음절별 발음 강약 가이드 */}
        <View style={styles.syllableWordRow}>
          {ex.segments.map((seg, idx) => (
            <View key={`${ex.word}-seg-${idx}`} style={styles.syllableUnit}>
              {idx > 0 ? (
                <Text style={styles.syllableDot} maxFontSizeMultiplier={1.3}>
                  ·
                </Text>
              ) : null}
              {seg.role === 'stress' ? (
                <View style={styles.stressChip}>
                  <Text style={styles.stressChipDot} maxFontSizeMultiplier={1.2}>
                    ⬤
                  </Text>
                  <Text style={styles.stressChipText} maxFontSizeMultiplier={1.35}>
                    {seg.text}
                  </Text>
                </View>
              ) : seg.role === 'weak' ? (
                <View style={styles.weakChip}>
                  <Text style={styles.weakChipText} maxFontSizeMultiplier={1.35}>
                    {seg.text}
                  </Text>
                </View>
              ) : (
                <Text style={styles.normalSyllableText} maxFontSizeMultiplier={1.35}>
                  {seg.text}
                </Text>
              )}
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.inlineWordRow}>
      <Text style={styles.exampleWord} maxFontSizeMultiplier={1.4}>
        {ex.segments.map((seg, idx) => (
          <Text
            key={`${ex.word}-inline-${idx}`}
            style={
              seg.role === 'stress'
                ? styles.inlineStressSpan
                : seg.role === 'weak'
                  ? styles.inlineWeakSpan
                  : undefined
            }
          >
            {seg.text}
          </Text>
        ))}
      </Text>
    </View>
  );
}

export function SymbolDetailSheet({
  symbol,
  visible,
  onClose,
  contextLabel,
}: SymbolDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const { playNormal, playSlow, stop, activeKey } = useSpeechAudio();
  const learnedSymbolIds = useLearningStore((state) => state.learnedSymbolIds);
  const bookmarkedSymbolIds = useLearningStore(
    (state) => state.bookmarkedSymbolIds
  );
  const toggleSymbolLearned = useLearningStore(
    (state) => state.toggleSymbolLearned
  );
  const toggleSymbolBookmark = useLearningStore(
    (state) => state.toggleSymbolBookmark
  );

  const [heartScale] = useState(() => new Animated.Value(1));
  const triggerHeartPop = useCallback(() => {
    heartScale.setValue(0.6);
    Animated.spring(heartScale, {
      toValue: 1,
      stiffness: 300,
      damping: 10,
      mass: 0.6,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, [heartScale]);

  const [difficulty, setDifficulty] = useState<ExampleDifficultyLevel>('beginner');
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [showExamplesInfo, setShowExamplesInfo] = useState(false);
  const [loadedState, setLoadedState] = useState<{
    key: string;
    items: SymbolExampleWord[];
    failed: boolean;
  }>({ key: '', items: [], failed: false });

  // 닫기 슬라이드 애니메이션 중 내용이 즉시 사라지지 않도록 직전 기호 유지
  const [cachedSymbol, setCachedSymbol] = useState<IpaSymbol | null>(symbol);
  if (symbol && symbol !== cachedSymbol) {
    setCachedSymbol(symbol);
    setShowExamplesInfo(false);
    if (refreshSeed !== 0) {
      setRefreshSeed(0);
    }
  }
  const activeSymbol = symbol ?? cachedSymbol;
  const requestKey = activeSymbol
    ? `${activeSymbol.id}:${difficulty}:${refreshSeed}`
    : '';

  // 바텀시트가 열릴 때 이전 화면의 오디오 즉시 중단
  useEffect(() => {
    if (visible) {
      stop();
    }
  }, [visible, stop]);

  // 현재 기호·난이도의 대표 단어 3개를 실시간 API로 동적 로드
  useEffect(() => {
    if (!visible || !activeSymbol) return;
    let cancelled = false;
    const currentKey = `${activeSymbol.id}:${difficulty}:${refreshSeed}`;

    fetchSymbolExamplesByLevel(activeSymbol, difficulty, refreshSeed)
      .then((items) => {
        if (cancelled) return;
        setLoadedState({
          key: currentKey,
          items,
          failed: items.length === 0,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setLoadedState({
          key: currentKey,
          items: [],
          failed: true,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [visible, activeSymbol, difficulty, refreshSeed]);

  if (!activeSymbol) return null;

  const isLearned = learnedSymbolIds.includes(activeSymbol.id);
  const isBookmarked = Array.isArray(bookmarkedSymbolIds)
    ? bookmarkedSymbolIds.includes(activeSymbol.id)
    : false;
  const currentTabMeta =
    DIFFICULTY_TABS.find((t) => t.id === difficulty) ?? DIFFICULTY_TABS[0];
  const isExamplesLoading = visible && loadedState.key !== requestKey;
  const levelExamples =
    loadedState.key === requestKey ? loadedState.items : [];
  const hasLoadError = loadedState.key === requestKey && loadedState.failed;

  const handleSelectDifficulty = (nextLevel: ExampleDifficultyLevel) => {
    if (nextLevel === difficulty) return;
    stop();
    setDifficulty(nextLevel);
    setRefreshSeed(0);
  };

  const handleRefreshExamples = () => {
    stop();
    setRefreshSeed((prev) => prev + 1);
  };

  const handleClose = () => {
    stop();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={styles.backdropDismiss}
          onPress={handleClose}
          accessibilityLabel="창 닫기"
        />
        <View
          style={[
            styles.sheetContainer,
            { paddingBottom: Math.max(insets.bottom, SPACING.md) },
          ]}
        >
          <View style={styles.handleBar} />

          {/* 헤더 */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              {contextLabel ? (
                <View style={styles.contextBadge}>
                  <Text style={styles.contextBadgeText} maxFontSizeMultiplier={1.35}>
                    {contextLabel}
                  </Text>
                </View>
              ) : null}
              <Text style={styles.ipaHero} maxFontSizeMultiplier={1.35}>
                {activeSymbol.ipa}
              </Text>
              <Text style={styles.titleKo} maxFontSizeMultiplier={1.4}>
                {activeSymbol.titleKo}
              </Text>
            </View>

            <View style={styles.headerActions}>
              <Pressable
                onPress={() => {
                  if (!isBookmarked) triggerHeartPop();
                  toggleSymbolBookmark(activeSymbol.id);
                }}
                style={({ pressed }) => [
                  styles.bookmarkIconBtn,
                  isBookmarked && styles.bookmarkIconBtnActive,
                  pressed && styles.buttonPressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isBookmarked }}
                accessibilityLabel={
                  isBookmarked
                    ? `${activeSymbol.ipa} 저장 해제`
                    : `${activeSymbol.ipa} 저장`
                }
              >
                <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                  <Heart
                    size={24}
                    color={isBookmarked ? '#FF3B30' : COLORS.textMuted}
                    weight={isBookmarked ? 'fill' : 'regular'}
                  />
                </Animated.View>
              </Pressable>

              <Pressable
                onPress={handleClose}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.buttonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="닫기"
              >
                <X size={24} color={COLORS.text} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 입 모양·혀 위치 안내 카드 */}
            <View style={styles.guideCard}>
              <View style={styles.guideHeaderRow}>
                <Smiley size={24} color={COLORS.teal} />
                <Text style={styles.guideLabel} maxFontSizeMultiplier={1.4}>
                  입 모양 · 혀 위치 안내
                </Text>
              </View>
              <Text style={styles.guideBody} maxFontSizeMultiplier={1.5}>
                {activeSymbol.mouthGuideKo}
              </Text>

              <View style={styles.hintPill}>
                <Text style={styles.hintPillLabel} maxFontSizeMultiplier={1.4}>
                  비슷한 한글 소리
                </Text>
                <Text style={styles.hintPillValue} maxFontSizeMultiplier={1.4}>
                  {activeSymbol.koHint}
                </Text>
              </View>
            </View>

            {/* 대표 단어 3개 (초급 / 중급 / 고급 실시간 동적 로드) */}
            <View style={styles.examplesSection}>
              <View style={styles.sectionHeaderBlock}>
                <View style={styles.sectionTitleRow}>
                  <View style={styles.sectionTitleLeft}>
                    <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.4}>
                      대표 단어 3개 · {currentTabMeta.titleLabel}
                    </Text>
                    <InfoTipButton
                      open={showExamplesInfo}
                      onToggle={() => setShowExamplesInfo((prev) => !prev)}
                      accessibilityLabel="대표 단어 강세 안내 보기"
                    />
                  </View>
                  <Pressable
                    onPress={handleRefreshExamples}
                    disabled={isExamplesLoading}
                    style={({ pressed }) => [
                      styles.refreshExamplesBtn,
                      pressed && styles.buttonPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="다른 대표 단어 3개 불러오기"
                  >
                    <ArrowsClockwise size={18} color={COLORS.indigoText} />
                    <Text style={styles.refreshExamplesText} maxFontSizeMultiplier={1.3}>
                      다른 단어
                    </Text>
                  </Pressable>
                </View>
                <InfoTipBox
                  visible={showExamplesInfo}
                  text={
                    activeSymbol.id === 'sym_schwa'
                      ? '노란 표시(⬤)를 세게, 회색 표시는 힘 빼고 약하게 읽어 보세요.'
                      : '노란 표시(⬤) 부분을 세게·또렷하게 발음해 보세요.'
                  }
                  variant="surface"
                  onClose={() => setShowExamplesInfo(false)}
                />
              </View>

              {/* 초급 / 중급 / 고급 난이도 선택 탭 (보더 없는 UI) */}
              <View style={styles.levelSwitchRow}>
                {DIFFICULTY_TABS.map((tab) => {
                  const isActive = difficulty === tab.id;
                  return (
                    <Pressable
                      key={tab.id}
                      onPress={() => handleSelectDifficulty(tab.id)}
                      style={({ pressed }) => [
                        styles.levelSwitchBtn,
                        isActive && { backgroundColor: tab.activeBg },
                        pressed && styles.buttonPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                      accessibilityLabel={`${tab.label} 단어 3개 보기`}
                    >
                      <Text
                        style={[
                          styles.levelSwitchText,
                          isActive && styles.levelSwitchTextActive,
                        ]}
                        maxFontSizeMultiplier={1.3}
                      >
                        {tab.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.exampleList}>
                {isExamplesLoading ? (
                  <View style={styles.examplesLoadingCard}>
                    <ActivityIndicator size="small" color={currentTabMeta.activeBg} />
                    <Text style={styles.examplesLoadingText} maxFontSizeMultiplier={1.4}>
                      {activeSymbol.ipa} 소리가 들어간 {currentTabMeta.titleLabel} 단어를 찾고 있어요...
                    </Text>
                  </View>
                ) : hasLoadError || levelExamples.length === 0 ? (
                  <View style={styles.examplesLoadingCard}>
                    <Text style={styles.examplesLoadingText} maxFontSizeMultiplier={1.4}>
                      단어를 불러오지 못했어요. 인터넷 연결을 확인한 뒤 다시 눌러 주세요.
                    </Text>
                    <Pressable
                      onPress={handleRefreshExamples}
                      style={({ pressed }) => [
                        styles.retryBtn,
                        pressed && styles.buttonPressed,
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
                  levelExamples.map((ex) => {
                  const normalKey = `sym:${activeSymbol.id}:${difficulty}:${ex.word}:normal`;
                  const slowKey = `sym:${activeSymbol.id}:${difficulty}:${ex.word}:slow`;
                  const isNormalPlaying = activeKey === normalKey;
                  const isSlowPlaying = activeKey === slowKey;

                  return (
                    <View
                      key={`${activeSymbol.id}-${difficulty}-${ex.word}`}
                      style={[
                        styles.exampleCard,
                        (isNormalPlaying || isSlowPlaying) && styles.exampleCardActive,
                      ]}
                    >
                      <Pressable
                        style={styles.exampleInfoArea}
                        onPress={() => playNormal(ex.word, { key: normalKey })}
                        accessibilityRole="button"
                        accessibilityLabel={`${ex.word} ${ex.meaningKo} 소리 듣기`}
                      >
                        {renderEmphasizedExampleWord(ex)}
                        <Text style={styles.exampleMeta} maxFontSizeMultiplier={1.45}>
                          {ex.ipa} · {ex.meaningKo}
                        </Text>
                        {ex.emphasisTipKo ? (
                          <View style={styles.emphasisTipBox}>
                            <Sparkle
                              size={18}
                              color={COLORS.gold}
                              style={styles.emphasisTipIcon}
                            />
                            <Text style={styles.emphasisTipText} maxFontSizeMultiplier={1.45}>
                              {ex.emphasisTipKo}
                            </Text>
                          </View>
                        ) : null}
                      </Pressable>

                      <View style={styles.exampleButtons}>
                        <Pressable
                          onPress={() => playNormal(ex.word, { key: normalKey })}
                          style={({ pressed }) => [
                            styles.playBtnPrimary,
                            isNormalPlaying && styles.playBtnPrimaryActive,
                            pressed && styles.buttonPressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`${ex.word} 소리 듣기`}
                        >
                          {isNormalPlaying ? (
                            <SpeakerHigh size={20} color={COLORS.white} />
                          ) : (
                            <SpeakerLow size={20} color={COLORS.white} />
                          )}
                          <Text
                            style={styles.playBtnPrimaryText}
                            maxFontSizeMultiplier={1.3}
                          >
                            {isNormalPlaying ? '재생 중' : '듣기'}
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => playSlow(ex.word, { key: slowKey })}
                          style={({ pressed }) => [
                            styles.playBtnSlow,
                            isSlowPlaying && styles.playBtnSlowActive,
                            pressed && styles.buttonPressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`${ex.word} 천천히 듣기`}
                        >
                          <Gauge
                            size={20}
                            color={isSlowPlaying ? COLORS.white : COLORS.tealText}
                          />
                          <Text
                            style={[
                              styles.playBtnSlowText,
                              isSlowPlaying && styles.playBtnPrimaryText,
                            ]}
                            maxFontSizeMultiplier={1.3}
                          >
                            {isSlowPlaying ? '천천히 중' : '천천히'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })
                )}
              </View>
            </View>
          </ScrollView>

          {/* 하단 익혔어요 버튼 */}
          <View style={styles.footer}>
            <Pressable
              onPress={() => toggleSymbolLearned(activeSymbol.id)}
              style={({ pressed }) => [
                styles.learnedButton,
                isLearned ? styles.learnedButtonDone : styles.learnedButtonTodo,
                pressed && styles.buttonPressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ checked: isLearned }}
              accessibilityLabel={isLearned ? '익힘 완료 해제하기' : '익혔어요 완료 체크'}
            >
              <CheckCircle
                size={26}
                color={isLearned ? COLORS.successText : COLORS.white}
                weight={isLearned ? 'fill' : 'regular'}
              />
              <Text
                style={[
                  styles.learnedButtonText,
                  isLearned ? styles.learnedButtonTextDone : styles.learnedButtonTextTodo,
                ]}
                maxFontSizeMultiplier={1.35}
              >
                {isLearned ? '익힘 완료 (눌러서 해제)' : '익혔어요 (완료 체크)'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    justifyContent: 'flex-end',
  },
  backdropDismiss: {
    flex: 1,
  },
  sheetContainer: {
    width: '100%',
    maxWidth: LAYOUT.mobileFrameMaxWidth,
    alignSelf: 'center',
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '88%',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  handleBar: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  headerLeft: {
    flex: 1,
    gap: 4,
  },
  contextBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.purpleSoft,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    marginBottom: 4,
  },
  contextBadgeText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.purpleText,
  },
  ipaHero: {
    fontSize: TYPOGRAPHY.wordHero,
    fontWeight: '700',
    color: COLORS.purpleText,
  },
  titleKo: {
    fontSize: TYPOGRAPHY.sectionTitle,
    fontWeight: '500',
    color: COLORS.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookmarkIconBtn: {
    width: TOUCH.minTarget,
    height: TOUCH.minTarget,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.card,
  },
  bookmarkIconBtnActive: {
    backgroundColor: COLORS.tint,
  },
  closeButton: {
    width: TOUCH.minTarget,
    height: TOUCH.minTarget,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.card,
  },
  scrollBody: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: SPACING.md,
    gap: SPACING.md,
  },
  guideCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    gap: SPACING.sm,
    ...SHADOW.card,
  },
  guideHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guideLabel: {
    fontSize: TYPOGRAPHY.bodyLarge,
    fontWeight: '500',
    color: COLORS.tealText,
  },
  guideBody: {
    fontSize: TYPOGRAPHY.bodyLarge,
    lineHeight: 24,
    color: COLORS.text,
  },
  hintPill: {
    marginTop: 4,
    backgroundColor: COLORS.tealSoft,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  hintPillLabel: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '400',
    color: COLORS.tealText,
  },
  hintPillValue: {
    fontSize: TYPOGRAPHY.bodyLarge,
    fontWeight: '500',
    color: COLORS.tealText,
  },
  examplesSection: {
    gap: SPACING.sm,
  },
  sectionHeaderBlock: {
    gap: 6,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  sectionTitleLeft: {
    flex: 1,
    minWidth: 160,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.text,
  },
  refreshExamplesBtn: {
    minHeight: TOUCH.minTarget,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.indigoSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  refreshExamplesText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.indigoText,
  },
  examplesLoadingCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    ...SHADOW.card,
  },
  examplesLoadingText: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textMuted,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 21,
  },
  retryBtn: {
    minHeight: TOUCH.minTarget,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.indigo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.white,
  },
  sectionLegend: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '400',
    color: COLORS.accentText,
  },
  levelSwitchRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 5,
    gap: 6,
    ...SHADOW.card,
  },
  levelSwitchBtn: {
    flex: 1,
    minHeight: TOUCH.minTarget,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  levelSwitchText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  levelSwitchTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  exampleList: {
    gap: SPACING.sm,
  },
  exampleCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
    ...SHADOW.card,
  },
  exampleCardActive: {
    backgroundColor: COLORS.tint,
  },
  exampleInfoArea: {
    gap: 6,
  },
  splitWordBlock: {
    gap: 6,
  },
  fullWordStressSpan: {
    color: COLORS.accentText,
    fontWeight: '700',
  },
  syllableWordRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
  },
  syllableUnit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  syllableDot: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  stressChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accentSoft,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  stressChipDot: {
    fontSize: 10,
    color: COLORS.accent,
  },
  stressChipText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.accentText,
  },
  weakChip: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  weakChipText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  normalSyllableText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  inlineWordRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  exampleWord: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  inlineStressSpan: {
    backgroundColor: COLORS.accentSoft,
    color: COLORS.accentText,
    fontWeight: '700',
  },
  inlineWeakSpan: {
    color: COLORS.textMuted,
    fontWeight: '400',
  },
  exampleMeta: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textMuted,
    fontWeight: '400',
  },
  emphasisTipBox: {
    marginTop: 2,
    backgroundColor: COLORS.goldSoft,
    borderRadius: RADIUS.md,
    paddingVertical: 9,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  emphasisTipIcon: {
    marginTop: 2,
  },
  emphasisTipText: {
    flex: 1,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 21,
    fontWeight: '500',
    color: COLORS.goldText,
  },
  exampleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  playBtnPrimary: {
    flexGrow: 1,
    minWidth: 120,
    minHeight: TOUCH.minTarget,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  playBtnPrimaryActive: {
    backgroundColor: COLORS.primaryDark,
  },
  playBtnPrimaryText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.white,
  },
  playBtnSlow: {
    flexGrow: 1,
    minWidth: 120,
    minHeight: TOUCH.minTarget,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.tealSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  playBtnSlowActive: {
    backgroundColor: COLORS.teal,
  },
  playBtnSlowText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.tealText,
  },
  footer: {
    paddingTop: SPACING.sm,
  },
  learnedButton: {
    minHeight: TOUCH.recommendedHeight,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
  },
  learnedButtonTodo: {
    backgroundColor: COLORS.success,
  },
  learnedButtonDone: {
    backgroundColor: COLORS.successSoft,
  },
  learnedButtonText: {
    fontSize: TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
  },
  learnedButtonTextTodo: {
    color: COLORS.white,
  },
  learnedButtonTextDone: {
    color: COLORS.successText,
  },
  buttonPressed: {
    opacity: 0.82,
  },
});
