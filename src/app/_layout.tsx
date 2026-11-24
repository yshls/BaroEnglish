import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, UIManager } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WebAnalytics } from '../components/WebAnalytics';
import { useStudyTracker } from '../hooks/useStudyTracker';
import { COLORS } from '../theme/tokens';
import { useAppFonts } from '../theme/useAppFonts';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();
  useStudyTracker();

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
      </Stack>
      <WebAnalytics />
    </SafeAreaProvider>
  );
}
