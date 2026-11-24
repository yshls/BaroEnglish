import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { COLORS, RADIUS, SHADOW } from '../theme/tokens';
import { CaretRight } from './PlumpIcons';

interface HorizontalChipScrollProps {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}

/**
 * 데스크톱 웹(마우스 휠·클릭 드래그·좌우 화살표 버튼)과 모바일 터치 스와이프를
 * 모두 매끄럽게 지원하는 가로 칩 스크롤 컨테이너.
 */
export function HorizontalChipScroll({
  children,
  contentContainerStyle,
  style,
}: HorizontalChipScrollProps) {
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [scrollX, setScrollX] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const canScrollLeft = scrollX > 4;
  const canScrollRight =
    contentWidth > 0 && viewportWidth > 0 && contentWidth - viewportWidth - scrollX > 4;

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setViewportWidth(w);
  }, []);

  const handleContentSizeChange = useCallback((w: number) => {
    if (w > 0) setContentWidth(w);
  }, []);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollX(e.nativeEvent.contentOffset.x);
  }, []);

  const scrollByStep = useCallback(
    (direction: 'left' | 'right') => {
      const step = Math.max(160, Math.round(viewportWidth * 0.65));
      const maxScroll = Math.max(0, contentWidth - viewportWidth);
      const nextX =
        direction === 'right'
          ? Math.min(maxScroll, scrollX + step)
          : Math.max(0, scrollX - step);
      scrollRef.current?.scrollTo({ x: nextX, animated: true });
    },
    [contentWidth, scrollX, viewportWidth]
  );

  // 웹 환경: 마우스 휠 가로 전환 + 클릭 드래그 스크롤 지원
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const raw = scrollRef.current as unknown as {
      getScrollableNode?: () => unknown;
    } | null;
    const candidate = raw?.getScrollableNode?.() ?? raw;
    if (
      !candidate ||
      typeof candidate !== 'object' ||
      !('addEventListener' in candidate)
    ) {
      return;
    }
    const node = candidate as HTMLElement;

    const onWheel = (e: WheelEvent) => {
      if (node.scrollWidth <= node.clientWidth + 2) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        node.scrollLeft += e.deltaY;
      }
    };

    let dragging = false;
    let draggedDistance = 0;
    let startX = 0;
    let startScrollLeft = 0;
    let suppressClickUntil = 0;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0 || node.scrollWidth <= node.clientWidth + 2) return;
      dragging = true;
      draggedDistance = 0;
      startX = e.clientX;
      startScrollLeft = node.scrollLeft;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      draggedDistance = Math.max(draggedDistance, Math.abs(dx));
      if (draggedDistance > 5) {
        setIsDragging(true);
        node.scrollLeft = startScrollLeft - dx;
      }
    };

    const onMouseUp = () => {
      if (!dragging) return;
      dragging = false;
      if (draggedDistance > 5) {
        suppressClickUntil = Date.now() + 120;
      }
      setIsDragging(false);
    };

    const onClickCapture = (e: MouseEvent) => {
      if (Date.now() < suppressClickUntil) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    node.addEventListener('mousedown', onMouseDown);
    node.addEventListener('click', onClickCapture, true);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      node.removeEventListener('wheel', onWheel);
      node.removeEventListener('mousedown', onMouseDown);
      node.removeEventListener('click', onClickCapture, true);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [contentWidth, viewportWidth]);

  return (
    <View style={[styles.wrap, style]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onLayout={handleLayout}
        onContentSizeChange={handleContentSizeChange}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={
          Platform.OS === 'web'
            ? ({
                cursor: isDragging ? 'grabbing' : 'grab',
                userSelect: 'none',
              } as unknown as ViewStyle)
            : undefined
        }
        contentContainerStyle={[styles.defaultContent, contentContainerStyle]}
      >
        {Platform.OS === 'web' ? (
          <View
            pointerEvents={isDragging ? 'none' : 'auto'}
            style={[styles.defaultContent, contentContainerStyle, styles.webDragInner]}
          >
            {children}
          </View>
        ) : (
          children
        )}
      </ScrollView>

      {canScrollLeft ? (
        <Pressable
          onPress={() => scrollByStep('left')}
          style={({ pressed }) => [
            styles.navBtn,
            styles.navBtnLeft,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="이전 칩 보기"
        >
          <View style={styles.leftIconFlip}>
            <CaretRight size={16} color={COLORS.text} weight="bold" />
          </View>
        </Pressable>
      ) : null}

      {canScrollRight ? (
        <Pressable
          onPress={() => scrollByStep('right')}
          style={({ pressed }) => [
            styles.navBtn,
            styles.navBtnRight,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="다음 칩 더 보기"
        >
          <CaretRight size={16} color={COLORS.text} weight="bold" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  defaultContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  webDragInner: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
  },
  navBtn: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    ...SHADOW.floating,
  },
  navBtnLeft: {
    left: 2,
  },
  navBtnRight: {
    right: 2,
  },
  leftIconFlip: {
    transform: [{ rotate: '180deg' }],
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.94 }],
  },
});
