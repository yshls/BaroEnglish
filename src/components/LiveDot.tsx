import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { COLORS, RADIUS } from '../theme/tokens';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

interface LiveDotProps {
  /** 점 지름 (기본 7) */
  size?: number;
  color?: string;
}

/**
 * 라이브 상태 표시용 코랄 점 — 은은한 맥박 + 퍼지며 사라지는 레이더 핑.
 * 내장 Animated만 사용 (의존성 0). "실시간 기록 중" 같은 표시에 사용.
 */
export function LiveDot({ size = 7, color = COLORS.primary }: LiveDotProps) {
  const [ping] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const pingLoop = Animated.loop(
      Animated.timing(ping, {
        toValue: 1,
        duration: 1600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: USE_NATIVE_DRIVER,
      })
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );
    pingLoop.start();
    pulseLoop.start();
    return () => {
      pingLoop.stop();
      pulseLoop.stop();
    };
  }, [ping, pulse]);

  const pingScale = ping.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] });
  const pingOpacity = ping.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  const dotStyle = {
    width: size,
    height: size,
    borderRadius: RADIUS.pill,
    backgroundColor: color,
  };

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.ping,
          dotStyle,
          { transform: [{ scale: pingScale }], opacity: pingOpacity },
        ]}
      />
      <Animated.View style={[dotStyle, { opacity: pulse }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ping: {
    position: 'absolute',
  },
});
