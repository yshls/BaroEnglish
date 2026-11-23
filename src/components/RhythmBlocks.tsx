import { StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../theme/tokens';
import type { SyllableItem } from '../types/learning';

interface RhythmBlocksProps {
  syllables: SyllableItem[];
  showKoHint: boolean;
}

export function RhythmBlocks({ syllables, showKoHint }: RhythmBlocksProps) {
  return (
    <View style={styles.container}>
      {/* 상단 강약 박자 리듬 요약 (● ⬤ ●) */}
      <View style={styles.rhythmBar}>
        <Text style={styles.rhythmBarLabel}>강약 리듬 박자</Text>
        <View style={styles.dotsRow}>
          {syllables.map((syl, idx) => {
            const isPrimary = syl.stress === 'primary';
            return (
              <Text
                key={`dot-${idx}-${syl.text}`}
                style={isPrimary ? styles.dotPrimary : styles.dotNormal}
                accessibilityLabel={isPrimary ? '강세 박자' : '약한 박자'}
              >
                {isPrimary ? '⬤' : '●'}
              </Text>
            );
          })}
        </View>
      </View>

      {/* 음절별 리듬 블록 카드 */}
      <View style={styles.blocksRow}>
        {syllables.map((syl, idx) => {
          const isPrimary = syl.stress === 'primary';
          const isSchwa = Boolean(syl.isSchwa);

          return (
            <View
              key={`syl-${idx}-${syl.text}`}
              style={[
                styles.block,
                isPrimary && styles.blockPrimary,
                !isPrimary && isSchwa && styles.blockSchwa,
              ]}
            >
              {/* 음절 상단 박자 배지 */}
              {isPrimary ? (
                <View style={styles.primaryTag}>
                  <Text style={styles.primaryTagText}>⬤ 강하게</Text>
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
                ]}
              >
                {syl.text}
              </Text>

              {/* 음절 IPA */}
              <Text
                style={[
                  styles.syllableIpa,
                  isPrimary && styles.syllableIpaPrimary,
                ]}
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
                >
                  {syl.koHint}
                </Text>
              ) : null}

              {/* 약화 모음(Schwa) 힌트 */}
              {isSchwa ? (
                <View style={styles.schwaBadge}>
                  <Text style={styles.schwaBadgeText}>힘 빼고 약하게 &apos;어&apos;</Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  rhythmBar: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rhythmBarLabel: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.text,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dotPrimary: {
    fontSize: 26,
    color: COLORS.accent,
  },
  dotNormal: {
    fontSize: 16,
    color: COLORS.textMuted,
  },
  blocksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  block: {
    minWidth: 92,
    flexGrow: 1,
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1.5,
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 4,
  },
  blockPrimary: {
    minWidth: 112,
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accent,
    borderWidth: 2.5,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  blockSchwa: {
    minWidth: 84,
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    paddingVertical: 10,
  },
  primaryTag: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 4,
  },
  primaryTagText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white,
  },
  normalDotSmall: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  syllableText: {
    fontSize: TYPOGRAPHY.syllableNormal,
    fontWeight: '800',
    color: COLORS.text,
  },
  syllableTextPrimary: {
    fontSize: TYPOGRAPHY.syllablePrimary,
    color: COLORS.primaryDark,
  },
  syllableTextSchwa: {
    fontSize: TYPOGRAPHY.syllableSchwa,
    color: COLORS.textMuted,
  },
  syllableIpa: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  syllableIpaPrimary: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.accentText,
  },
  syllableKoHint: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  syllableKoHintPrimary: {
    fontSize: TYPOGRAPHY.bodyLarge,
    fontWeight: '800',
    color: COLORS.accentText,
  },
  schwaBadge: {
    marginTop: 4,
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  schwaBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
