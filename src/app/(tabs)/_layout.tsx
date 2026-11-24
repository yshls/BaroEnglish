import { BookOpen, Play, SpeakerHigh, User } from 'phosphor-react-native';
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
        tabBarActiveTintColor: COLORS.text,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarActiveBackgroundColor: COLORS.background,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopWidth: 0,
          borderRadius: 28,
          marginHorizontal: 12,
          minHeight: TOUCH.tabBarHeight + bottomPadding - 6,
          paddingTop: 4,
          paddingBottom: bottomPadding,
          ...SHADOW.tabBar,
        },
        tabBarItemStyle: {
          borderRadius: 999,
          marginVertical: 6,
          marginHorizontal: 2,
        },
        tabBarLabelStyle: {
          fontFamily: FONTS.family,
          fontSize: 11,
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
          tabBarIcon: ({ focused }) => (
            <BookOpen
              size={24}
              color={focused ? COLORS.text : COLORS.textMuted}
              weight={focused ? 'fill' : 'regular'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="shorts"
        options={{
          title: '발음 쇼츠',
          tabBarLabel: '발음 쇼츠',
          tabBarIcon: ({ focused }) => (
            <Play
              size={24}
              color={focused ? COLORS.text : COLORS.textMuted}
              weight={focused ? 'fill' : 'regular'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: '마이페이지',
          tabBarLabel: '마이페이지',
          tabBarBadge: totalBookmarkCount > 0 ? totalBookmarkCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: COLORS.text,
            color: COLORS.white,
            fontSize: 11,
            fontWeight: '700',
          },
          tabBarIcon: ({ focused }) => (
            <User
              size={24}
              color={focused ? COLORS.text : COLORS.textMuted}
              weight={focused ? 'fill' : 'regular'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="symbols"
        options={{
          title: '발음기호 기초',
          tabBarLabel: '발음기호',
          tabBarIcon: ({ focused }) => (
            <SpeakerHigh
              size={24}
              color={focused ? COLORS.text : COLORS.textMuted}
              weight={focused ? 'fill' : 'regular'}
            />
          ),
        }}
      />
    </Tabs>
  );
}
