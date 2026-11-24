import { type ReactNode, useEffect, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { MOTION } from '../theme/tokens';
import { triggerLightHaptic } from '../utils/haptics';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const AP = Animated.createAnimatedComponent(Pressable);

// 쫀득한 느낌의 결(feel)은 theme/tokens.ts의 MOTION.spring에서 한 곳으로 조절한다.
type Feel = keyof typeof MOTION.spring; // 'gentle' | 'playful' | 'snappy'

type TapProps = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** 스프링 결. 기본 playful(오버슈트 바운스) · 버튼=snappy · 큰 카드=gentle */
  feel?: Feel;
  /** 눌렀을 때 축소 비율 override (기본 MOTION.scale.deepPress) */
  pressedScale?: number;
  /** 눌림 시 가벼운 햅틱 (기본 false) */
  haptic?: boolean;
};

export function Tap({
  style,
  children,
  onPressIn,
  onPressOut,
  disabled,
  feel = 'playful',
  pressedScale = MOTION.scale.deepPress,
  haptic = false,
  ...rest
}: TapProps) {
  const [scale] = useState(() => new Animated.Value(MOTION.scale.normal));
  const [opacity] = useState(() => new Animated.Value(MOTION.opacity.visible));
  const spring = MOTION.spring[feel];

  useEffect(() => {
    if (disabled) {
      scale.stopAnimation();
      opacity.stopAnimation();
      scale.setValue(MOTION.scale.normal);
      opacity.setValue(MOTION.opacity.visible);
    }
  }, [disabled, opacity, scale]);

  useEffect(() => {
    return () => {
      scale.stopAnimation();
      opacity.stopAnimation();
    };
  }, [opacity, scale]);

  const animateTo = (toScale: number, toOpacity: number) =>
    Animated.parallel([
      // RN Animated.spring는 물리 기반(stiffness/damping/mass) 설정을 그대로 받는다.
      Animated.spring(scale, {
        toValue: toScale,
        useNativeDriver: USE_NATIVE_DRIVER,
        stiffness: spring.stiffness,
        damping: spring.damping,
        mass: spring.mass,
      }),
      Animated.timing(opacity, {
        toValue: toOpacity,
        duration: MOTION.duration.instant,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start();

  const flatStyle = StyleSheet.flatten(style);
  const callerTransform = Array.isArray(flatStyle?.transform)
    ? flatStyle.transform
    : [];
  const animatedOverlay =
    flatStyle?.opacity === undefined
      ? { transform: [...callerTransform, { scale }], opacity }
      : { transform: [...callerTransform, { scale }] };

  return (
    <AP
      disabled={disabled}
      onPressIn={(e: GestureResponderEvent) => {
        if (!disabled) {
          if (haptic) triggerLightHaptic();
          animateTo(pressedScale, MOTION.opacity.pressed);
        }
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        animateTo(MOTION.scale.normal, MOTION.opacity.visible);
        onPressOut?.(e);
      }}
      style={[style, animatedOverlay]}
      {...rest}
    >
      {children}
    </AP>
  );
}
