import { StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../theme/tokens';

export default function IpaSymbolsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>발음기호 기초</Text>
        <Text style={styles.body}>
          핵심 발음기호 18개를 입 모양과 소리로 차근차근 익혀 보세요.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.screenTitle,
    fontWeight: '700',
    color: COLORS.text,
  },
  body: {
    fontSize: TYPOGRAPHY.body,
    lineHeight: 28,
    color: COLORS.text,
  },
});
