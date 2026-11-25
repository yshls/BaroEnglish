import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BaroHeader, type BaroTabName } from '../../components/BaroHeader';
import { FloatingPillTabBar } from '../../components/FloatingPillTabBar';
import { useLearningStore } from '../../store/useLearningStore';
import { useWordCacheStore } from '../../store/useWordCacheStore';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 10);
  const wordBookmarkCount = useWordCacheStore((state) =>
    Array.isArray(state.bookmarkedWordKeys) ? state.bookmarkedWordKeys.length : 0
  );
  const symbolBookmarkCount = useLearningStore((state) =>
    Array.isArray(state.bookmarkedSymbolIds) ? state.bookmarkedSymbolIds.length : 0
  );
  const totalBookmarkCount = wordBookmarkCount + symbolBookmarkCount;

  return (
    <Tabs
      tabBar={(props) => (
        <FloatingPillTabBar
          {...props}
          bookmarkCount={totalBookmarkCount}
          bottomInset={bottomInset}
        />
      )}
      screenOptions={{
        animation: 'shift',
        transitionSpec: {
          animation: 'spring',
          config: {
            stiffness: 320,
            damping: 28,
            mass: 0.8,
          },
        },
        header: ({ navigation, route }) => (
          <BaroHeader
            activeRouteName={route.name}
            onNavigateTab={(tabName: BaroTabName) => {
              navigation.navigate(tabName);
            }}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '단어 바로 읽기',
          tabBarLabel: '단어 읽기',
        }}
      />
      <Tabs.Screen
        name="symbols"
        options={{
          title: '발음기호 기초',
          tabBarLabel: '발음기호',
        }}
      />
      <Tabs.Screen
        name="shorts"
        options={{
          title: '발음 쇼츠',
          tabBarLabel: '발음 쇼츠',
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: '마이페이지',
          tabBarLabel: '마이페이지',
        }}
      />
    </Tabs>
  );
}
