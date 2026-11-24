import { type ReactNode, useRef } from 'react';
import {
  Animated,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

const AP = Animated.createAnimatedComponent(Pressable);

type TapProps = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function Tap({
  style,
  children,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: TapProps) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <AP
      disabled={disabled}
      onPressIn={(e: any) => {
        if (!disabled)
          Animated.spring(scale, {
            toValue: 0.97,
            useNativeDriver: true,
            speed: 50,
            bounciness: 4,
          }).start();
        onPressIn?.(e);
      }}
      onPressOut={(e: any) => {
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 40,
          bounciness: 6,
        }).start();
        onPressOut?.(e);
      }}
      style={[style as any, { transform: [{ scale }] }]}
      {...rest}
    >
      {children}
    </AP>
  );
}
