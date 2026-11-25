import { CheckCircle, Sparkle } from './PlumpIcons';
import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../theme/tokens';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const DAILY_GOAL_SECONDS = 300; // 오늘의 가벼운 기본 목표: 5분

interface DailyGoalRingProps {
  todaySeconds: number;
  streakDays: number;
}

export function DailyGoalRing({ todaySeconds, streakDays }: DailyGoalRingProps) {
  const safeSec = Math.max(0, Math.floor(todaySeconds));
  const progressRatio = Math.min(1, safeSec / DAILY_GOAL_SECONDS);
  const progressPct = Math.round(progressRatio * 100);
  const isCompleted = progressRatio >= 1;
  const remainingMin = Math.max(1, Math.ceil((DAILY_GOAL_SECONDS - safeSec) / 60));

  const size = 76;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressRatio);

  const [celebrationScale] = useState(() => new Animated.Value(1));
  const [pulseAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!isCompleted) return;
    celebrationScale.setValue(0.92);
    Animated.spring(celebrationScale, {
      toValue: 1,
      friction: 4.5,
      tension: 160,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, [celebrationScale, isCompleted]);

  useEffect(() => {
    if (!isCompleted) {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [isCompleted, pulseAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        isCompleted && styles.containerCompleted,
        { transform: [{ scale: celebrationScale }] },
      ]}
    >
      <View style={styles.ringWrap}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={isCompleted ? COLORS.card : COLORS.border}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={isCompleted ? COLORS.success : COLORS.primary}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={styles.ringCenter}>
          {isCompleted ? (
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <CheckCircle size={24} color={COLORS.success} weight="fill" />
            </Animated.View>
          ) : (
            <Text style={styles.ringPctText} maxFontSizeMultiplier={1.2}>
              {progressPct}%
            </Text>
          )}
        </View>
      </View>

      <View style={styles.textCol}>
        <View style={styles.titleRow}>
          <Text style={styles.title} maxFontSizeMultiplier={1.3}>
            오늘 5분 발음 목표
          </Text>
          {isCompleted ? (
            <View style={styles.doneBadge}>
              <Sparkle size={12} color={COLORS.successText} weight="fill" />
              <Text style={styles.doneBadgeText} maxFontSizeMultiplier={1.2}>
                달성!
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.subText} maxFontSizeMultiplier={1.35}>
          {isCompleted
            ? `오늘 목표를 채웠어요! ${streakDays}일 연속 기록이 이어지고 있어요.`
            : safeSec === 0
              ? '단어 한 개만 들어봐도 오늘 목표가 차오르기 시작해요.'
              : `목표 달성까지 약 ${remainingMin}분 남았어요.`}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  containerCompleted: {
    backgroundColor: COLORS.successSoft,
  },
  ringWrap: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPctText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  textCol: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.text,
  },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  doneBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.successText,
  },
  subText: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
});
