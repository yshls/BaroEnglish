import type { ReactNode } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Info, X } from './PlumpIcons';
import { COLORS, RADIUS } from '../theme/tokens';

function animateToggle() {
  if (Platform.OS !== 'web') {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }
}

interface InfoTipButtonProps {
  open: boolean;
  onToggle: () => void;
  accessibilityLabel?: string;
}

export function InfoTipButton({
  open,
  onToggle,
  accessibilityLabel = '설명 보기',
}: InfoTipButtonProps) {
  return (
    <Pressable
      onPress={() => {
        animateToggle();
        onToggle();
      }}
      hitSlop={10}
      style={({ pressed }) => [
        styles.button,
        open && styles.buttonOpen,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={open ? `${accessibilityLabel} 닫기` : accessibilityLabel}
    >
      <Info
        size={15}
        color={open ? COLORS.primary : COLORS.textMuted}
        weight={open ? 'fill' : 'regular'}
      />
    </Pressable>
  );
}

interface InfoTipBoxProps {
  visible: boolean;
  text?: string;
  children?: ReactNode;
  onClose?: () => void;
  variant?: 'subtle' | 'surface';
}

export function InfoTipBox({
  visible,
  text,
  children,
  onClose,
  variant = 'subtle',
}: InfoTipBoxProps) {
  if (!visible) return null;

  return (
    <View
      style={[
        styles.box,
        variant === 'surface' ? styles.boxSurface : styles.boxSubtle,
      ]}
    >
      <Info
        size={15}
        color={COLORS.primaryDark}
        weight="fill"
        style={styles.boxIcon}
      />
      {children ? (
        <View style={styles.boxContent}>{children}</View>
      ) : (
        <Text style={styles.boxText} maxFontSizeMultiplier={1.4}>
          {text}
        </Text>
      )}
      {onClose ? (
        <Pressable
          onPress={() => {
            animateToggle();
            onClose();
          }}
          hitSlop={10}
          style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="설명 닫기"
        >
          <X size={13} color={COLORS.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonOpen: {
    backgroundColor: COLORS.tint,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  boxSubtle: {
    backgroundColor: COLORS.background,
  },
  boxSurface: {
    backgroundColor: COLORS.card,
  },
  boxIcon: {
    marginTop: 2,
    flexShrink: 0,
  },
  boxContent: {
    flex: 1,
  },
  boxText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  closeBtn: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  pressed: {
    opacity: 0.72,
  },
});
