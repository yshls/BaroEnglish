import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, TOUCH, TYPOGRAPHY } from '../../theme/tokens';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 10);

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.background,
        },
        headerShadowVisible: false,
        headerTitleStyle: {
          fontSize: TYPOGRAPHY.sectionTitle,
          fontWeight: '700',
          color: COLORS.text,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          minHeight: TOUCH.tabBarHeight + bottomPadding - 6,
          paddingTop: 8,
          paddingBottom: bottomPadding,
        },
        tabBarLabelStyle: {
          fontSize: 16,
          fontWeight: '700',
          marginTop: 2,
        },
        tabBarAllowFontScaling: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '발음기호 기초',
          tabBarLabel: '발음기호',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'volume-high' : 'volume-high-outline'}
              size={26}
              color={focused ? COLORS.primary : COLORS.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="words"
        options={{
          title: '단어 바로 읽기',
          tabBarLabel: '단어 읽기',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'book' : 'book-outline'}
              size={26}
              color={focused ? COLORS.primary : COLORS.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: '북마크',
          tabBarLabel: '북마크',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'bookmark' : 'bookmark-outline'}
              size={26}
              color={focused ? COLORS.primary : COLORS.textMuted}
            />
          ),
        }}
      />
    </Tabs>
  );
}
