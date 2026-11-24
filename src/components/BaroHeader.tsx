import { Fire, MagnifyingGlass } from './PlumpIcons';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLearningStore } from '../store/useLearningStore';
import {
  COLORS,
  FONTS,
  RADIUS,
  SHADOW,
  SPACING,
} from '../theme/tokens';

export type BaroTabName = 'index' | 'shorts' | 'symbols' | 'bookmarks';

interface BaroHeaderProps {
  activeRouteName: string;
  onNavigateTab: (tabName: BaroTabName) => void;
}

export function BaroHeader({ activeRouteName, onNavigateTab }: BaroHeaderProps) {
  const insets = useSafeAreaInsets();
  const currentStreakDays = useLearningStore((state) => state.currentStreakDays);

  const isIndexTab = activeRouteName === 'index' || !activeRouteName;
  const hasStreak = currentStreakDays > 0;

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top }]}>
      <View style={styles.inner}>
        {/* 좌측: baro 브랜드 워드마크 로고 */}
        <Pressable
          style={({ pressed }) => [styles.brandButton, pressed && styles.pressed]}
          onPress={() => onNavigateTab('index')}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="baro 홈으로 이동"
        >
          <Text style={styles.brandText} maxFontSizeMultiplier={1.2}>
            baro
          </Text>
        </Pressable>

        {/* 우측: 빠른 검색 + 연속 학습 일수 */}
        <View style={styles.rightGroup}>
          {!isIndexTab ? (
            <Pressable
              style={({ pressed }) => [
                styles.iconActionBtn,
                pressed && styles.pressed,
              ]}
              onPress={() => onNavigateTab('index')}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="단어 검색으로 이동"
            >
              <MagnifyingGlass size={19} color={COLORS.text} />
            </Pressable>
          ) : null}

          <View
            style={styles.streakBadge}
            accessible
            accessibilityLabel={`연속 학습 ${currentStreakDays}일`}
          >
            <Fire
              size={16}
              color={hasStreak ? COLORS.primary : COLORS.textMuted}
              weight={hasStreak ? 'fill' : 'regular'}
            />
            <Text
              style={[
                styles.streakText,
                !hasStreak && styles.streakTextMuted,
              ]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.15}
            >
              {`${currentStreakDays}일`}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.card,
    zIndex: 10,
    ...SHADOW.header,
  },
  inner: {
    height: 60,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  brandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    paddingHorizontal: 2,
  },
  brandText: {
    fontFamily: FONTS.family,
    fontSize: 23,
    lineHeight: 27,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: -0.8,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  iconActionBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakBadge: {
    height: 36,
    paddingHorizontal: 11,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  streakText: {
    fontFamily: FONTS.family,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  streakTextMuted: {
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  pressed: {
    opacity: 0.78,
  },
});
