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
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

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
  const [viewportWidth, setViewportWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setViewportWidth(w);
  }, []);

  const handleContentSizeChange = useCallback((w: number) => {
    if (w > 0) setContentWidth(w);
  }, []);

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
});
