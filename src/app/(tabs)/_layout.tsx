import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { COLORS, TOUCH, TYPOGRAPHY } from '../../theme/tokens';

export default function TabLayout() {
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
          height: Platform.OS === 'ios' ? TOUCH.tabBarHeight + 16 : TOUCH.tabBarHeight,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 22 : 10,
        },
        tabBarLabelStyle: {
          fontSize: 16,
          fontWeight: '700',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '발음기호 기초',
          tabBarLabel: '발음기호 기초',
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
          tabBarLabel: '단어 바로 읽기',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'book' : 'book-outline'}
              size={26}
              color={focused ? COLORS.primary : COLORS.textMuted}
            />
          ),
        }}
      />
    </Tabs>
  );
}
