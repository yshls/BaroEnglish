import type { ComponentProps } from 'react';
import type { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, LAYOUT, RADIUS, SHADOW, SPACING } from '../theme/tokens';
import { BookOpen, Play, SpeakerHigh, User } from './PlumpIcons';

type ExpoBottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export interface FloatingPillTabBarProps extends ExpoBottomTabBarProps {
  bookmarkCount: number;
  bottomInset: number;
}

const TAB_ORDER = ['index', 'shorts', 'symbols', 'bookmarks'] as const;
type OrderedTabName = (typeof TAB_ORDER)[number];

const DEFAULT_LABELS: Record<OrderedTabName, string> = {
  index: '단어 읽기',
  shorts: '발음 쇼츠',
  symbols: '발음기호',
  bookmarks: '마이페이지',
};

function renderTabIcon(name: string, focused: boolean) {
  const color = focused ? COLORS.text : COLORS.textMuted;
  const weight = focused ? 'fill' : 'regular';

  switch (name) {
    case 'index':
      return <BookOpen size={22} color={color} weight={weight} />;
    case 'shorts':
      return <Play size={22} color={color} weight={weight} />;
    case 'symbols':
      return <SpeakerHigh size={22} color={color} weight={weight} />;
    case 'bookmarks':
    default:
      return <User size={22} color={color} weight={weight} />;
  }
}

export function FloatingPillTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  bookmarkCount,
  bottomInset,
}: FloatingPillTabBarProps) {
  // 탭 순서를 항상 [단어 읽기, 발음 쇼츠, 발음기호, 마이페이지]로 고정 (마이페이지 맨 오른쪽)
  const orderedRoutes = [...state.routes].sort((a, b) => {
    const idxA = TAB_ORDER.indexOf(a.name as OrderedTabName);
    const idxB = TAB_ORDER.indexOf(b.name as OrderedTabName);
    const rankA = idxA === -1 ? TAB_ORDER.length : idxA;
    const rankB = idxB === -1 ? TAB_ORDER.length : idxB;
    return rankA - rankB;
  });

  const activeRouteKey = state.routes[state.index]?.key;

  return (
    <View style={[styles.outerWrap, { paddingBottom: bottomInset }]}>
      <View style={styles.pillBar} accessibilityRole="tablist">
        {orderedRoutes.map((route) => {
          const descriptor = descriptors[route.key];
          const options = descriptor?.options;
          const isFocused = route.key === activeRouteKey;
          const label =
            typeof options?.tabBarLabel === 'string'
              ? options.tabBarLabel
              : typeof options?.title === 'string'
                ? options.title
                : (DEFAULT_LABELS[route.name as OrderedTabName] ?? route.name);

          const onPress = () => {
            const event = emitter.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigateToTab(route.key);
            }
          };

          const onLongPress = () => {
            emitter.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const showBadge = route.name === 'bookmarks' && bookmarkCount > 0;
          const badgeText = bookmarkCount > 99 ? '99+' : String(bookmarkCount);

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options?.tabBarAccessibilityLabel ?? label}
              onPress={onPress}
              onLongPress={onLongPress}
              style={({ pressed }) => [
                styles.tabItem,
                isFocused && styles.tabItemActive,
                pressed && styles.tabItemPressed,
              ]}
            >
              <View style={styles.iconWrap}>
                {renderTabIcon(route.name, isFocused)}
                {showBadge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText} allowFontScaling={false}>
                      {badgeText}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                style={[styles.tabLabel, isFocused && styles.tabLabelActive]}
                numberOfLines={1}
                allowFontScaling={true}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
    alignItems: 'center',
  },
  pillBar: {
    width: '100%',
    maxWidth: LAYOUT.contentMaxWidth,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.pill,
    padding: 5,
    gap: 2,
    ...SHADOW.floating,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.transparent,
  },
  tabItemActive: {
    backgroundColor: COLORS.tint,
  },
  tabItemPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
  iconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 24,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -9,
    minWidth: 16,
    height: 16,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 4,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: FONTS.family,
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
    lineHeight: 12,
  },
  tabLabel: {
    fontFamily: FONTS.family,
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  tabLabelActive: {
    fontWeight: '700',
    color: COLORS.text,
  },
});
