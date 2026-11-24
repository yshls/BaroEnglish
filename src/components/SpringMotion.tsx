import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { COLORS, LAYOUT, MOTION, RADIUS, SHADOW } from '../theme/tokens';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

type RevealFeel = 'gentle' | 'playful' | 'snappy';

interface SpringRevealProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** 값이 바뀔 때마다 부드럽게 다시 스프링 등장 */
  triggerKey?: string | number;
  /** 등장 시작 Y 오프셋 (기본 12px, 위에서 내려오게 하려면 음수) */
  distance?: number;
  /** 등장 시작 스케일 (기본 0.98) */
  initialScale?: number;
  /** 등장 지연(ms) — 리스트/카드 순차 등장용 */
  delay?: number;
  /** 스프링 결 */
  feel?: RevealFeel;
}

/**
 * 카드·검색 결과·펼침 영역이 뚝 나타나지 않고 GPU 가속(transform+opacity)으로
 * 부드럽게 미끄러져 들어오는 스프링 등장 래퍼.
 */
export function SpringReveal({
  children,
  style,
  triggerKey,
  distance = 12,
  initialScale = 0.982,
  delay = 0,
  feel = 'gentle',
}: SpringRevealProps) {
  const reducedMotion = useReducedMotion();
  const [opacity] = useState(() => new Animated.Value(reducedMotion ? 1 : 0));
  const [translateY] = useState(
    () => new Animated.Value(reducedMotion ? 0 : distance)
  );
  const [scale] = useState(
    () => new Animated.Value(reducedMotion ? 1 : initialScale)
  );

  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      scale.setValue(1);
      return;
    }

    opacity.setValue(0);
    translateY.setValue(distance);
    scale.setValue(initialScale);

    const springCfg = MOTION.spring[feel];
    const anim = Animated.sequence([
      ...(delay > 0 ? [Animated.delay(delay)] : []),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: MOTION.duration.normal,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          stiffness: springCfg.stiffness,
          damping: springCfg.damping,
          mass: springCfg.mass,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.spring(scale, {
          toValue: 1,
          stiffness: springCfg.stiffness,
          damping: springCfg.damping,
          mass: springCfg.mass,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    ]);

    anim.start();

    return () => {
      anim.stop();
    };
  }, [delay, distance, feel, initialScale, opacity, reducedMotion, scale, translateY, triggerKey]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

interface SpringSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  dismissLabel?: string;
  sheetStyle?: StyleProp<ViewStyle>;
  maxWidth?: number;
}

const SHEET_HIDDEN_Y = 56;

/**
 * 웹과 모바일 모두에서 끊김 없이 부드럽게 열리고 닫히는 스프링 바텀시트.
 * - RN 기본 Modal animationType="slide"는 웹에서 애니메이션 없이 즉시 뚝 나타나는 문제를 해결합니다.
 * - 배경 딤 페이드 + 시트 스프링 슬라이드업 + 웹 ESC 닫기 지원.
 */
export function SpringSheet({
  visible,
  onClose,
  children,
  dismissLabel = '창 닫기',
  sheetStyle,
  maxWidth = LAYOUT.contentMaxWidth,
}: SpringSheetProps) {
  const reducedMotion = useReducedMotion();
  const [rendered, setRendered] = useState(visible);
  const [backdropOpacity] = useState(() => new Animated.Value(visible ? 1 : 0));
  const [sheetY] = useState(() => new Animated.Value(visible ? 0 : SHEET_HIDDEN_Y));
  const [sheetScale] = useState(() => new Animated.Value(visible ? 1 : 0.97));
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  if (visible && !rendered) {
    setRendered(true);
  }

  useEffect(() => {
    if (!rendered) return;

    if (visible) {
      if (reducedMotion) {
        backdropOpacity.setValue(1);
        sheetY.setValue(0);
        sheetScale.setValue(1);
        return;
      }

      backdropOpacity.setValue(0);
      sheetY.setValue(SHEET_HIDDEN_Y);
      sheetScale.setValue(0.97);

      const openAnim = Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: MOTION.duration.normal,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.spring(sheetY, {
          toValue: 0,
          stiffness: MOTION.spring.sheet.stiffness,
          damping: MOTION.spring.sheet.damping,
          mass: MOTION.spring.sheet.mass,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.spring(sheetScale, {
          toValue: 1,
          stiffness: MOTION.spring.sheet.stiffness,
          damping: MOTION.spring.sheet.damping,
          mass: MOTION.spring.sheet.mass,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]);
      openAnim.start();
      return () => openAnim.stop();
    }

    if (reducedMotion) {
      setRendered(false);
      return;
    }

    const closeAnim = Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: MOTION.duration.fast,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(sheetY, {
        toValue: SHEET_HIDDEN_Y,
        duration: MOTION.duration.fast,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(sheetScale, {
        toValue: 0.97,
        duration: MOTION.duration.fast,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]);

    closeAnim.start(({ finished }) => {
      if (finished) {
        setRendered(false);
      }
    });

    return () => closeAnim.stop();
  }, [backdropOpacity, reducedMotion, rendered, sheetScale, sheetY, visible]);

  // 웹에서 ESC 키로 바텀시트 부드럽게 닫기
  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [visible]);

  if (!rendered) return null;

  return (
    <Modal
      visible={rendered}
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View
          pointerEvents="box-none"
          style={[styles.backdrop, { opacity: backdropOpacity }]}
        >
          <Pressable
            style={styles.backdropDismiss}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={dismissLabel}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheetBase,
            { maxWidth },
            sheetStyle,
            {
              opacity: backdropOpacity,
              transform: [{ translateY: sheetY }, { scale: sheetScale }],
            },
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
  },
  backdropDismiss: {
    flex: 1,
  },
  sheetBase: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    ...SHADOW.modal,
  },
});
