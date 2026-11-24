import { IconBookmark, IconBookmarkFilled, IconSearch } from '@tabler/icons-react-native';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLearningStore } from '../store/useLearningStore';
import { useWordCacheStore } from '../store/useWordCacheStore';
import {
  COLORS,
  FONTS,
  RADIUS,
  SHADOW,
  SPACING,
} from '../theme/tokens';

export type BaroTabName = 'index' | 'shorts' | 'bookmarks' | 'symbols';

interface TabMeta {
  name: BaroTabName;
  label: string;
  softBg: string;
  textColor: string;
}

const TAB_ITEMS: TabMeta[] = [
  { name: 'index', label: '단어 읽기', softBg: COLORS.tint, textColor: COLORS.primary },
  { name: 'shorts', label: '발음 쇼츠', softBg: COLORS.roseSoft, textColor: COLORS.roseText },
  { name: 'bookmarks', label: '북마크', softBg: COLORS.goldSoft, textColor: COLORS.goldText },
  { name: 'symbols', label: '발음기호', softBg: COLORS.purpleSoft, textColor: COLORS.purpleText },
];

interface BaroHeaderProps {
  activeRouteName: string;
  onNavigateTab: (tabName: BaroTabName) => void;
}

export function BaroHeader({ activeRouteName, onNavigateTab }: BaroHeaderProps) {
  const insets = useSafeAreaInsets();

  const wordBookmarkCount = useWordCacheStore((state) =>
    Array.isArray(state.bookmarkedWordKeys) ? state.bookmarkedWordKeys.length : 0
  );
  const symbolBookmarkCount = useLearningStore((state) =>
    Array.isArray(state.bookmarkedSymbolIds) ? state.bookmarkedSymbolIds.length : 0
  );

  const totalBookmarkCount = wordBookmarkCount + symbolBookmarkCount;
  const activeTab =
    TAB_ITEMS.find((item) => item.name === activeRouteName) ?? TAB_ITEMS[0];

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
              <IconSearch size={19} color={COLORS.primary} />
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
            accessibilityLabel={`북마크 ${totalBookmarkCount}개 보기`}
          >
            {activeTab.name === 'bookmarks' ? (
              <IconBookmarkFilled size={18} color={COLORS.white} />
            ) : (
              <IconBookmark size={18} color={COLORS.goldText} />
            )}
            {totalBookmarkCount > 0 ? (
              <Text
                style={[
                  styles.bookmarkActionCount,
                  activeTab.name === 'bookmarks'
                    ? styles.bookmarkActionCountActive
                    : null,
                ]}
                maxFontSizeMultiplier={1.2}
              >
                {totalBookmarkCount}
              </Text>
            ) : null}
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
    fontSize: 26,
    lineHeight: 30,
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
    height: 38,
    paddingHorizontal: 11,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.goldSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  bookmarkActionBtnActive: {
    backgroundColor: COLORS.gold,
  },
  bookmarkActionCount: {
    fontFamily: FONTS.family,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.goldText,
  },
  bookmarkActionCountActive: {
    color: COLORS.white,
  },
  pressed: {
    opacity: 0.78,
  },
});
