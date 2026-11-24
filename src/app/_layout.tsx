import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Platform,
  StyleSheet,
  UIManager,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WebAnalytics } from '../components/WebAnalytics';
import { useStudyTracker } from '../hooks/useStudyTracker';
import { COLORS, LAYOUT, SHADOW, SPACING } from '../theme/tokens';
import { useAppFonts } from '../theme/useAppFonts';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();
  const { width } = useWindowDimensions();
  useStudyTracker();

  if (!fontsLoaded && !fontError) {
    return null;
  }

  const isDesktopWeb =
    Platform.OS === 'web' && width > LAYOUT.mobileFrameMaxWidth + 24;

  const stackContent = (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
    </Stack>
  );

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {Platform.OS === 'web' ? (
        <View
          style={[
            styles.webStage,
            isDesktopWeb && styles.webStageDesktop,
          ]}
        >
          <View
            style={[
              styles.webPhoneFrame,
              isDesktopWeb && styles.webPhoneFrameDesktop,
            ]}
          >
            {stackContent}
          </View>
        </View>
      ) : (
        stackContent
      )}
      <WebAnalytics />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  webStage: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  webStageDesktop: {
    paddingHorizontal: SPACING.lg,
  },
  webPhoneFrame: {
    flex: 1,
    width: '100%',
    maxWidth: LAYOUT.mobileFrameMaxWidth,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  webPhoneFrameDesktop: {
    ...SHADOW.floating,
  },
});
