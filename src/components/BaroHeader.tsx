import { MagnifyingGlass, User } from './PlumpIcons';
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
  const nickname = useLearningStore((state) => state.nickname);
  const currentStreakDays = useLearningStore((state) => state.currentStreakDays);

  const isIndexTab = activeRouteName === 'index' || !activeRouteName;
  const isMyPageTab = activeRouteName === 'bookmarks';
  const displayLabel = nickname.trim()
    ? nickname.trim()
    : currentStreakDays > 0
      ? `${currentStreakDays}일 연속`
      : '마이';

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

        {/* 우측: 빠른 액션 */}
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

          <Pressable
            style={({ pressed }) => [
              styles.bookmarkActionBtn,
              isMyPageTab ? styles.bookmarkActionBtnActive : null,
              pressed && styles.pressed,
            ]}
            onPress={() => onNavigateTab('bookmarks')}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="마이페이지로 이동"
          >
            <User
              size={17}
              color={isMyPageTab ? COLORS.white : COLORS.text}
              weight={isMyPageTab ? 'fill' : 'regular'}
            />
            <Text
              style={[
                styles.bookmarkActionCount,
                isMyPageTab ? styles.bookmarkActionCountActive : null,
              ]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.15}
            >
              {displayLabel}
            </Text>
          </Pressable>
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
  bookmarkActionBtn: {
    minWidth: 38,
    maxWidth: 128,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  bookmarkActionBtnActive: {
    backgroundColor: COLORS.text,
  },
  bookmarkActionCount: {
    fontFamily: FONTS.family,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    flexShrink: 1,
  },
  bookmarkActionCountActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.78,
  },
});
