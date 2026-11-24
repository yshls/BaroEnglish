import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * OS / 브라우저의 '동작 줄이기(Reduce Motion)' 접근성 설정을 감지합니다.
 * true일 때는 스프링 바운스·슬라이드를 생략하고 즉시 상태만 반영합니다.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;

    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReduced(mq.matches);
      const onChange = (event: MediaQueryListEvent) => {
        if (mounted) setReduced(event.matches);
      };
      mq.addEventListener?.('change', onChange);
      return () => {
        mounted = false;
        mq.removeEventListener?.('change', onChange);
      };
    }

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduced(Boolean(enabled));
      })
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      if (mounted) setReduced(Boolean(enabled));
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduced;
}
