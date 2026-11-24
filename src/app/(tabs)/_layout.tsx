import { IconBook2, IconBookmark, IconBookmarkFilled, IconPlayerPlay, IconPlayerPlayFilled, IconVolume } from '@tabler/icons-react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BaroHeader, type BaroTabName } from '../../components/BaroHeader';
import { useLearningStore } from '../../store/useLearningStore';
import { useWordCacheStore } from '../../store/useWordCacheStore';
import { COLORS, FONTS, SHADOW, TOUCH } from '../../theme/tokens';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 10);
  const wordBookmarkCount = useWordCacheStore((state) =>
    Array.isArray(state.bookmarkedWordKeys) ? state.bookmarkedWordKeys.length : 0
  );
  const symbolBookmarkCount = useLearningStore((state) =>
    Array.isArray(state.bookmarkedSymbolIds) ? state.bookmarkedSymbolIds.length : 0
  );
  const totalBookmarkCount = wordBookmarkCount + symbolBookmarkCount;

  return (
    <Tabs
      screenOptions={{
        header: ({ navigation, route }) => (
          <BaroHeader
            activeRouteName={route.name}
            onNavigateTab={(tabName: BaroTabName) => {
              navigation.navigate(tabName);
            }}
          />
        ),
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopWidth: 0,
          minHeight: TOUCH.tabBarHeight + bottomPadding - 6,
          paddingTop: 8,
          paddingBottom: bottomPadding,
          ...SHADOW.tabBar,
        },
        tabBarLabelStyle: {
          fontFamily: FONTS.family,
          fontSize: 14,
          fontWeight: '500',
          marginTop: 2,
        },
        tabBarAllowFontScaling: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '단어 바로 읽기',
          tabBarLabel: '단어 읽기',
          tabBarActiveTintColor: COLORS.primary,
          tabBarIcon: ({ focused }) => (
            <IconBook2
              size={25}
              color={focused ? COLORS.primary : COLORS.textMuted}
              strokeWidth={focused ? 2.5 : 1.5}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="shorts"
        options={{
          title: '발음 쇼츠',
          tabBarLabel: '발음 쇼츠',
          tabBarActiveTintColor: COLORS.rose,
          tabBarIcon: ({ focused }) =>
            focused ? (
              <IconPlayerPlayFilled size={25} color={COLORS.rose} />
            ) : (
              <IconPlayerPlay size={25} color={COLORS.textMuted} strokeWidth={1.5} />
            ),
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: '북마크',
          tabBarLabel: '북마크',
          tabBarActiveTintColor: COLORS.gold,
          tabBarBadge: totalBookmarkCount > 0 ? totalBookmarkCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: COLORS.gold,
            color: COLORS.white,
            fontSize: 12,
            fontWeight: '700',
          },
          tabBarIcon: ({ focused }) =>
            focused ? (
              <IconBookmarkFilled size={25} color={COLORS.gold} />
            ) : (
              <IconBookmark size={25} color={COLORS.textMuted} strokeWidth={1.5} />
            ),
        }}
      />
      <Tabs.Screen
        name="symbols"
        options={{
          title: '발음기호 기초',
          tabBarLabel: '발음기호',
          tabBarActiveTintColor: COLORS.purple,
          tabBarIcon: ({ focused }) => (
            <IconVolume
              size={25}
              color={focused ? COLORS.purple : COLORS.textMuted}
              strokeWidth={focused ? 2.5 : 1.5}
            />
          ),
        }}
      />
    </Tabs>
  );
}
