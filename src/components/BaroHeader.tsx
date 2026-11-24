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

interface TabMeta {
  name: BaroTabName;
  label: string;
  softBg: string;
  textColor: string;
}

const TAB_ITEMS: TabMeta[] = [
  { name: 'index', label: '단어 읽기', softBg: COLORS.tint, textColor: COLORS.primaryDark },
  { name: 'shorts', label: '발음 쇼츠', softBg: COLORS.roseSoft, textColor: COLORS.roseText },
  { name: 'symbols', label: '발음기호', softBg: COLORS.purpleSoft, textColor: COLORS.purpleText },
  { name: 'bookmarks', label: '마이페이지', softBg: COLORS.successSoft, textColor: COLORS.successText },
];

interface BaroHeaderProps {
  activeRouteName: string;
  onNavigateTab: (tabName: BaroTabName) => void;
}

export function BaroHeader({ activeRouteName, onNavigateTab }: BaroHeaderProps) {
  const insets = useSafeAreaInsets();
  const nickname = useLearningStore((state) => state.nickname);
  const currentStreakDays = useLearningStore((state) => state.currentStreakDays);

  const activeTab =
    TAB_ITEMS.find((item) => item.name === activeRouteName) ?? TAB_ITEMS[0];
  const displayLabel = nickname.trim()
    ? nickname.trim()
    : currentStreakDays > 0
      ? `${currentStreakDays}일 연속`
      : '마이';

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top }]}>
      <View style={styles.inner}>
        {/* 좌측: baro 브랜드 워드마크 로고 + 현재 탭 배지 */}
        <View style={styles.leftGroup}>
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

          <View
            style={[
              styles.sectionPill,
              { backgroundColor: activeTab.softBg },
            ]}
          >
            <Text
              style={[styles.sectionPillText, { color: activeTab.textColor }]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
            >
              {activeTab.label}
            </Text>
          </View>
        </View>

        {/* 우측: 빠른 액션 */}
        <View style={styles.rightGroup}>
          {activeTab.name !== 'index' ? (
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
              <MagnifyingGlass size={19} color={COLORS.primary} />
            </Pressable>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.bookmarkActionBtn,
              activeTab.name === 'bookmarks'
                ? styles.bookmarkActionBtnActive
                : null,
              pressed && styles.pressed,
            ]}
            onPress={() => onNavigateTab('bookmarks')}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="마이페이지로 이동"
          >
            <User
              size={17}
              color={activeTab.name === 'bookmarks' ? COLORS.white : COLORS.successText}
              weight={activeTab.name === 'bookmarks' ? 'fill' : 'regular'}
            />
            <Text
              style={[
                styles.bookmarkActionCount,
                activeTab.name === 'bookmarks'
                  ? styles.bookmarkActionCountActive
                  : null,
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
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
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
  sectionPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  sectionPillText: {
    fontFamily: FONTS.family,
    fontSize: 13,
    fontWeight: '500',
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
    backgroundColor: COLORS.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookmarkActionBtn: {
    minWidth: 38,
    maxWidth: 128,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.successSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  bookmarkActionBtnActive: {
    backgroundColor: COLORS.success,
  },
  bookmarkActionCount: {
    fontFamily: FONTS.family,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.successText,
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
