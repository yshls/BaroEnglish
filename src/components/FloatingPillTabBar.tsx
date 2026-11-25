import { useEffect, useRef, useState, type ComponentProps } from 'react';
import type { Tabs } from 'expo-router';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useLearningStore } from '../store/useLearningStore';
import { COLORS, FONTS, LAYOUT, RADIUS, SHADOW, SPACING, Z_INDEX } from '../theme/tokens';
import { triggerLightHaptic } from '../utils/haptics';
import { BookOpen, Play, SpeakerHigh, User } from './PlumpIcons';

type ExpoBottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export interface FloatingPillTabBarProps extends ExpoBottomTabBarProps {
  bookmarkCount: number;
  bottomInset: number;
}

const TAB_ORDER = ['index', 'symbols', 'shorts', 'bookmarks'] as const;
type OrderedTabName = (typeof TAB_ORDER)[number];

const DEFAULT_LABELS: Record<OrderedTabName, string> = {
  index: '단어 읽기',
  symbols: '발음기호',
  shorts: '발음 쇼츠',
  bookmarks: '마이페이지',
};

const PILL_PADDING = 5;
const TAB_GAP = 2;
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

function renderTabIcon(name: string, focused: boolean) {
  const color = focused ? COLORS.text : COLORS.textMuted;
  const weight = focused ? 'fill' : 'regular';

  switch (name) {
    case 'index':
      return <BookOpen size={22} color={color} weight={weight} />;
    case 'symbols':
      return <SpeakerHigh size={22} color={color} weight={weight} />;
    case 'shorts':
      return <Play size={22} color={color} weight={weight} />;
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
  const nickname = useLearningStore((s) => s.nickname);
  const customMyLabel = nickname.trim();

  // 탭 순서를 항상 [단어 읽기, 발음기호, 발음 쇼츠, 마이페이지]로 고정 (마이페이지 맨 오른쪽)
  const orderedRoutes = [...state.routes].sort((a, b) => {
    const idxA = TAB_ORDER.indexOf(a.name as OrderedTabName);
    const idxB = TAB_ORDER.indexOf(b.name as OrderedTabName);
    const rankA = idxA === -1 ? TAB_ORDER.length : idxA;
    const rankB = idxB === -1 ? TAB_ORDER.length : idxB;
    return rankA - rankB;
  });

  const activeRoute = state.routes[state.index];
  const activeRouteKey = activeRoute?.key;
  const activeRouteName = activeRoute?.name;
  const activeOrderedIdx = Math.max(
    0,
    orderedRoutes.findIndex((r) => r.key === activeRouteKey)
  );

  const [barWidth, setBarWidth] = useState(0);
  const [slideAnim] = useState(() => new Animated.Value(0));
  const [defaultIconScale] = useState(() => new Animated.Value(1));
  const [iconScales] = useState<Record<string, Animated.Value>>(() =>
    Object.fromEntries(TAB_ORDER.map((name) => [name, new Animated.Value(1)]))
  );
  const [pressScales] = useState<Record<string, Animated.Value>>(() =>
    Object.fromEntries(TAB_ORDER.map((name) => [name, new Animated.Value(1)]))
  );
  const hasMeasuredRef = useRef(false);

  const tabCount = Math.max(1, orderedRoutes.length);
  const innerWidth = Math.max(0, barWidth - PILL_PADDING * 2);
  const slotWidth =
    innerWidth > 0 ? (innerWidth - TAB_GAP * (tabCount - 1)) / tabCount : 0;

  useEffect(() => {
    if (slotWidth <= 0) return;
    const targetX = activeOrderedIdx * (slotWidth + TAB_GAP);

    if (!hasMeasuredRef.current) {
      hasMeasuredRef.current = true;
      slideAnim.setValue(targetX);
      return;
    }

    Animated.spring(slideAnim, {
      toValue: targetX,
      stiffness: 290,
      damping: 22,
      mass: 0.78,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, [activeOrderedIdx, slideAnim, slotWidth]);

  useEffect(() => {
    if (!activeRouteName) return;
    const scale = iconScales[activeRouteName] ?? defaultIconScale;
    scale.setValue(0.82);
    Animated.spring(scale, {
      toValue: 1,
      stiffness: 280,
      damping: 13,
      mass: 0.75,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, [activeRouteKey, activeRouteName, defaultIconScale, iconScales]);

  const animateTabPress = (name: string, toValue: number) => {
    const pressScale = pressScales[name] ?? defaultIconScale;
    Animated.spring(pressScale, {
      toValue,
      stiffness: toValue < 1 ? 480 : 280,
      damping: toValue < 1 ? 26 : 15,
      mass: 0.7,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  };

  const handleBarLayout = (e: LayoutChangeEvent) => {
    const nextWidth = e.nativeEvent.layout.width;
    if (nextWidth > 0 && Math.abs(nextWidth - barWidth) > 0.5) {
      setBarWidth(nextWidth);
    }
  };

  return (
    <View pointerEvents="box-none" style={[styles.outerWrap, { paddingBottom: bottomInset }]}>
      <View
        style={styles.pillBar}
        accessibilityRole="tablist"
        onLayout={handleBarLayout}
      >
        {slotWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.slidingIndicator,
              {
                width: slotWidth,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          />
        ) : null}

        {orderedRoutes.map((route) => {
          const descriptor = descriptors[route.key];
          const options = descriptor?.options;
          const isFocused = route.key === activeRouteKey;
          const label =
            route.name === 'bookmarks'
              ? customMyLabel || DEFAULT_LABELS.bookmarks
              : typeof options?.tabBarLabel === 'string'
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
              triggerLightHaptic();
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
          const iconScale = iconScales[route.name] ?? defaultIconScale;
          const pressScale = pressScales[route.name] ?? defaultIconScale;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options?.tabBarAccessibilityLabel ?? label}
              onPress={onPress}
              onLongPress={onLongPress}
              onPressIn={() => animateTabPress(route.name, 0.91)}
              onPressOut={() => animateTabPress(route.name, 1)}
              style={[
                styles.tabItem,
                slotWidth <= 0 && isFocused && styles.tabItemActive,
              ]}
            >
              <Animated.View
                style={[styles.tabItemInner, { transform: [{ scale: pressScale }] }]}
              >
                <Animated.View
                  style={[styles.iconWrap, { transform: [{ scale: iconScale }] }]}
                >
                  {renderTabIcon(route.name, isFocused)}
                  {showBadge ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText} allowFontScaling={false}>
                        {badgeText}
                      </Text>
                    </View>
                  ) : null}
                </Animated.View>
                <Text
                  style={[styles.tabLabel, isFocused && styles.tabLabelActive]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  allowFontScaling={true}
                >
                  {label}
                </Text>
              </Animated.View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.transparent,
    paddingHorizontal: SPACING.sm,
    paddingTop: 4,
    alignItems: 'center',
    zIndex: Z_INDEX.tabBar,
  },
  pillBar: {
    position: 'relative',
    width: '100%',
    maxWidth: LAYOUT.contentMaxWidth,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.pill,
    padding: PILL_PADDING,
    gap: TAB_GAP,
    ...SHADOW.floating,
  },
  slidingIndicator: {
    position: 'absolute',
    top: PILL_PADDING,
    bottom: PILL_PADDING,
    left: PILL_PADDING,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.transparent,
    zIndex: 1,
  },
  tabItemActive: {
    backgroundColor: COLORS.surface,
  },
  tabItemInner: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
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
