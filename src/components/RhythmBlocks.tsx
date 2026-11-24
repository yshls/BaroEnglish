import { MusicNote, Play, SpeakerHigh, SpeakerLow } from './PlumpIcons';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSpeechAudio } from '../hooks/useSpeechAudio';
import { COLORS, RADIUS, SPACING, TOUCH, TYPOGRAPHY } from '../theme/tokens';
import type { SyllableItem } from '../types/learning';
import { InfoTipBox, InfoTipButton } from './InfoTip';
import { Tap } from './Tap';

interface RhythmBlocksProps {
  syllables: SyllableItem[];
  showKoHint: boolean;
}

export function RhythmBlocks({ syllables, showKoHint }: RhythmBlocksProps) {
  const { playSlow, stop, activeKey } = useSpeechAudio();
  const [rhythmIndex, setRhythmIndex] = useState<number | null>(null);
  const [showTip, setShowTip] = useState(false);
  const rhythmSessionRef = useRef(0);

  const handleSyllableTap = useCallback(
    (syl: SyllableItem, idx: number) => {
      rhythmSessionRef.current += 1;
      setRhythmIndex(null);
      void playSlow(syl.text, { key: `rhythm:syl:${idx}:${syl.text}` });
    },
    [playSlow]
  );

  const handleRhythmPlay = useCallback(() => {
    rhythmSessionRef.current += 1;
    const session = rhythmSessionRef.current;
    stop();

    let cumulativeDelay = 100;

    syllables.forEach((syl, idx) => {
      const delay = cumulativeDelay;

      setTimeout(() => {
        if (rhythmSessionRef.current !== session) return;
        setRhythmIndex(idx);
        void playSlow(syl.text, { key: `rhythm:seq:${idx}:${syl.text}` });
      }, delay);

      const duration =
        syl.stress === 'primary'
          ? 750
          : syl.stress === 'secondary'
            ? 600
            : syl.isSchwa
              ? 450
              : 500;
      cumulativeDelay += duration;
    });

    setTimeout(() => {
      if (rhythmSessionRef.current !== session) return;
      setRhythmIndex(null);
    }, cumulativeDelay + 400);
  }, [syllables, playSlow, stop]);

  const isRhythmPlaying = rhythmIndex !== null;

  return (
    <View style={styles.container}>
      {/* 상단 강약 박자 리듬 요약 (● ⬤ ●) + 리듬 연속 듣기 버튼 */}
      <View style={styles.rhythmBar}>
        <View style={styles.rhythmBarLeft}>
          <Text style={styles.rhythmBarLabel} maxFontSizeMultiplier={1.4}>
            강약 리듬 박자
          </Text>
          <InfoTipButton
            open={showTip}
            onToggle={() => setShowTip((prev) => !prev)}
            accessibilityLabel="음절 리듬 사용법 보기"
          />
          <View style={styles.dotsRow}>
            {syllables.map((syl, idx) => {
              const isPrimary = syl.stress === 'primary';
              const isSecondary = syl.stress === 'secondary';
              const isActive = rhythmIndex === idx;
              return (
                <Text
                  key={`dot-${idx}-${syl.text}`}
                  style={[
                    isPrimary
                      ? styles.dotPrimary
                      : isSecondary
                        ? styles.dotSecondary
                        : styles.dotNormal,
                    isActive && styles.dotActive,
                  ]}
                  maxFontSizeMultiplier={1.25}
                  accessibilityLabel={
                    isPrimary
                      ? '강세 박자'
                      : isSecondary
                        ? '보조 강세 박자'
                        : '약한 박자'
                  }
                >
                  {isPrimary ? '⬤' : '●'}
                </Text>
              );
            })}
          </View>
        </View>

        <Pressable
          onPress={handleRhythmPlay}
          style={({ pressed }) => [
            styles.rhythmPlayBtn,
            isRhythmPlaying && styles.rhythmPlayBtnActive,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="음절별 리듬으로 연속 듣기"
        >
          {isRhythmPlaying ? (
            <MusicNote size={18} color={COLORS.white} />
          ) : (
            <Play size={18} color={COLORS.accentText} />
          )}
          <Text
            style={[
              styles.rhythmPlayBtnText,
              isRhythmPlaying && styles.rhythmPlayBtnTextActive,
            ]}
            maxFontSizeMultiplier={1.25}
          >
            {isRhythmPlaying ? '재생 중...' : '리듬 듣기'}
          </Text>
        </Pressable>
      </View>

      <InfoTipBox
        visible={showTip}
        text="각 음절 카드를 누르면 해당 음절 소리를 따로 들어볼 수 있어요."
        onClose={() => setShowTip(false)}
      />

      {/* 음절별 리듬 블록 카드 (터치 인터랙티브) */}
      <View style={styles.blocksRow}>
        {syllables.map((syl, idx) => {
          const isPrimary = syl.stress === 'primary';
          const isSecondary = syl.stress === 'secondary';
          const isSchwa = Boolean(syl.isSchwa);
          const isSylActive =
            activeKey === `rhythm:syl:${idx}:${syl.text}` ||
            activeKey === `rhythm:seq:${idx}:${syl.text}`;

          return (
            <Tap
              key={`syl-${idx}-${syl.text}`}
              onPress={() => handleSyllableTap(syl, idx)}
              style={[
                styles.block,
                isPrimary && styles.blockPrimary,
                !isPrimary && isSecondary && styles.blockSecondary,
                !isPrimary && !isSecondary && isSchwa && styles.blockSchwa,
                isSylActive && styles.blockActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${syl.text} 음절 듣기, ${isPrimary ? '강세' : isSecondary ? '보조 강세' : '약한'} 음절`}
            >
              {/* 음절 상단 박자 배지 */}
              {isPrimary ? (
                <View style={styles.primaryTag}>
                  <Text style={styles.primaryTagText} maxFontSizeMultiplier={1.3}>
                    ⬤ 강하게
                  </Text>
                </View>
              ) : isSecondary ? (
                <View style={styles.secondaryTag}>
                  <Text
                    style={styles.secondaryTagText}
                    maxFontSizeMultiplier={1.3}
                  >
                    ● 살짝 강하게
                  </Text>
                </View>
              ) : (
                <Text style={styles.normalDotSmall}>●</Text>
              )}

              {/* 음절 영문 */}
              <Text
                style={[
                  styles.syllableText,
                  isPrimary && styles.syllableTextPrimary,
                  !isPrimary && isSchwa && styles.syllableTextSchwa,
                  isSylActive && styles.syllableTextActive,
                ]}
                maxFontSizeMultiplier={1.4}
              >
                {syl.text}
              </Text>

              {/* 음절 IPA */}
              <Text
                style={[
                  styles.syllableIpa,
                  isPrimary && styles.syllableIpaPrimary,
                ]}
                maxFontSizeMultiplier={1.4}
              >
                /{syl.ipa}/
              </Text>

              {/* 한글 발음 힌트 (토글 On일 때) */}
              {showKoHint ? (
                <Text
                  style={[
                    styles.syllableKoHint,
                    isPrimary && styles.syllableKoHintPrimary,
                  ]}
                  maxFontSizeMultiplier={1.4}
                >
                  {syl.koHint}
                </Text>
              ) : null}

              {/* 약화 모음(Schwa) 힌트 */}
              {isSchwa ? (
                <View style={styles.schwaBadge}>
                  <Text style={styles.schwaBadgeText} maxFontSizeMultiplier={1.3}>
                    힘 빼고 약하게 &apos;어&apos;
                  </Text>
                </View>
              ) : null}

              {/* 소리 아이콘 */}
              {isSylActive ? (
                <SpeakerHigh
                  size={18}
                  color={COLORS.primary}
                  style={styles.speakerIcon}
                />
              ) : (
                <SpeakerLow
                  size={18}
                  color={isPrimary ? COLORS.accentText : COLORS.textMuted}
                  style={styles.speakerIcon}
                />
              )}
            </Tap>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.sm,
  },
  rhythmBar: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  rhythmBarLeft: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  rhythmBarLabel: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.text,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dotPrimary: {
    fontSize: 20,
    color: COLORS.accentText,
  },
  dotSecondary: {
    fontSize: 16,
    color: COLORS.teal,
  },
  dotNormal: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  dotActive: {
    color: COLORS.primary,
  },
  rhythmPlayBtn: {
    minHeight: TOUCH.minTarget,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accentSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  rhythmPlayBtnActive: {
    backgroundColor: COLORS.accent,
  },
  rhythmPlayBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.accentText,
  },
  rhythmPlayBtnTextActive: {
    color: COLORS.white,
  },
  tapHint: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  blocksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  block: {
    minWidth: 84,
    flexGrow: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 3,
  },
  blockPrimary: {
    minWidth: 96,
    backgroundColor: COLORS.accentSoft,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  blockSecondary: {
    minWidth: 88,
    backgroundColor: COLORS.tealSoft,
  },
  blockSchwa: {
    minWidth: 76,
    backgroundColor: COLORS.background,
    paddingVertical: 9,
  },
  blockActive: {
    backgroundColor: COLORS.tint,
  },
  primaryTag: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 3,
  },
  primaryTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  secondaryTag: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 3,
  },
  secondaryTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.tealText,
  },
  normalDotSmall: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  syllableText: {
    fontSize: TYPOGRAPHY.syllableNormal,
    fontWeight: '500',
    color: COLORS.text,
  },
  syllableTextPrimary: {
    fontSize: TYPOGRAPHY.syllablePrimary,
    fontWeight: '700',
    color: COLORS.accentText,
  },
  syllableTextSchwa: {
    fontSize: TYPOGRAPHY.syllableSchwa,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  syllableTextActive: {
    color: COLORS.primary,
  },
  syllableIpa: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  syllableIpaPrimary: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.accentText,
  },
  syllableKoHint: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.text,
    marginTop: 2,
  },
  syllableKoHintPrimary: {
    fontSize: TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.accentText,
  },
  schwaBadge: {
    marginTop: 4,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  schwaBadgeText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  speakerIcon: {
    marginTop: 4,
  },
  pressed: {
    opacity: 0.82,
  },
});
