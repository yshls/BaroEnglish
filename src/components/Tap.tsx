import { type ReactNode, useEffect, useRef, useState } from 'react';
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
import { useReducedMotion } from '../hooks/useReducedMotion';
import { MOTION } from '../theme/tokens';
import { triggerLightHaptic } from '../utils/haptics';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const AP = Animated.createAnimatedComponent(Pressable);

// 쫀득한 느낌의 결(feel)은 theme/tokens.ts의 MOTION.spring에서 한 곳으로 조절한다.
export type TapFeel = 'gentle' | 'playful' | 'snappy';

export type TapProps = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** 스프링 복원 결. 기본 playful(쫀득한 오버슈트) · 버튼=snappy · 큰 카드=gentle */
  feel?: TapFeel;
  /** 눌렀을 때 축소 비율 override (기본 gentle=cardPress, 그 외 deepPress) */
  pressedScale?: number;
  /** 눌림 시 가벼운 햅틱 (기본 true, 데스크톱 웹에서는 무음 패스) */
  haptic?: boolean;
  /** 데스크톱 웹 호버 시 미세 스프링 리프트 (기본 true) */
  hoverLift?: boolean;
};

export function Tap({
  style,
  children,
  onPressIn,
  onPressOut,
  onHoverIn,
  onHoverOut,
  disabled,
  feel = 'playful',
  pressedScale,
  haptic = true,
  hoverLift = true,
  ...rest
}: TapProps) {
  const reducedMotion = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(MOTION.scale.normal));
  const [opacity] = useState(() => new Animated.Value(MOTION.opacity.visible));
  const isHoveredRef = useRef(false);
  const isPressedRef = useRef(false);

  const resolvedPressedScale =
    pressedScale ??
    (feel === 'gentle' ? MOTION.scale.cardPress : MOTION.scale.deepPress);
  const releaseSpring = MOTION.spring[feel];
  const pressSpring = MOTION.spring.pressIn;

  useEffect(() => {
    if (disabled) {
      isHoveredRef.current = false;
      isPressedRef.current = false;
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

  const animateTo = (
    toScale: number,
    toOpacity: number,
    mode: 'press' | 'release' | 'hover'
  ) => {
    if (reducedMotion) {
      scale.setValue(MOTION.scale.normal);
      opacity.setValue(toOpacity);
      return;
    }

    const cfg =
      mode === 'press'
        ? pressSpring
        : mode === 'hover'
          ? MOTION.spring.snappy
          : releaseSpring;

    Animated.parallel([
      Animated.spring(scale, {
        toValue: toScale,
        useNativeDriver: USE_NATIVE_DRIVER,
        stiffness: cfg.stiffness,
        damping: cfg.damping,
        mass: cfg.mass,
      }),
      Animated.timing(opacity, {
        toValue: toOpacity,
        duration: MOTION.duration.instant,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start();
  };

  const flatStyle = StyleSheet.flatten(style);
  const callerTransform = Array.isArray(flatStyle?.transform)
    ? flatStyle.transform
    : [];
  const animatedOverlay =
    flatStyle?.opacity === undefined
      ? { transform: [...callerTransform, { scale }], opacity }
      : { transform: [...callerTransform, { scale }] };

  const webPointerStyle: ViewStyle | undefined =
    Platform.OS === 'web'
      ? ({
          cursor: disabled ? 'default' : 'pointer',
          userSelect: 'none',
        } as unknown as ViewStyle)
      : undefined;

  return (
    <AP
      disabled={disabled}
      onPressIn={(e: GestureResponderEvent) => {
        if (!disabled) {
          isPressedRef.current = true;
          if (haptic) triggerLightHaptic();
          animateTo(resolvedPressedScale, MOTION.opacity.pressed, 'press');
        }
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        isPressedRef.current = false;
        const restScale =
          Platform.OS === 'web' && hoverLift && isHoveredRef.current && !disabled
            ? MOTION.scale.hover
            : MOTION.scale.normal;
        animateTo(restScale, MOTION.opacity.visible, 'release');
        onPressOut?.(e);
      }}
      onHoverIn={(e) => {
        isHoveredRef.current = true;
        if (Platform.OS === 'web' && hoverLift && !disabled && !isPressedRef.current) {
          animateTo(MOTION.scale.hover, MOTION.opacity.visible, 'hover');
        }
        onHoverIn?.(e);
      }}
      onHoverOut={(e) => {
        isHoveredRef.current = false;
        if (Platform.OS === 'web' && !isPressedRef.current) {
          animateTo(MOTION.scale.normal, MOTION.opacity.visible, 'release');
        }
        onHoverOut?.(e);
      }}
      style={[webPointerStyle, style, animatedOverlay]}
      {...rest}
    >
      {children}
    </AP>
  );
}
