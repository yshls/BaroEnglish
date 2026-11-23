import { StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../theme/tokens';

export default function WordReaderScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>단어 바로 읽기</Text>
        <Text style={styles.body}>
          기초 영단어를 강세 리듬과 소리로 바로 따라 읽어 보세요.
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
