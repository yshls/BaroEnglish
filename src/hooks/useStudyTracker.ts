import { useEffect, useRef } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { useLearningStore } from '../store/useLearningStore';

const TICK_INTERVAL_MS = 10_000;

function isAppForeground(): boolean {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return document.visibilityState === 'visible';
  }
  return AppState.currentState === 'active';
}

/**
 * 앱 전역에서 활성 학습 시간(초)과 일별 연속 실행 기록을 자동으로 누적하는 훅.
 * - 백그라운드·비활성 탭 시간은 제외하여 실제 이용 시간만 정확히 기록합니다.
 */
export function useStudyTracker(): void {
  const hasHydrated = useLearningStore((state) => state.hasHydrated);
  const recordAppVisit = useLearningStore((state) => state.recordAppVisit);
  const addStudySeconds = useLearningStore((state) => state.addStudySeconds);
  const lastActiveMsRef = useRef<number | null>(null);

  useEffect(() => {
    if (!hasHydrated) return;

    const flushElapsed = () => {
      const started = lastActiveMsRef.current;
      if (started === null) return;
      const now = Date.now();
      const elapsedSec = Math.floor((now - started) / 1000);
      if (elapsedSec > 0) {
        addStudySeconds(Math.min(elapsedSec, 30));
        lastActiveMsRef.current = now;
      }
    };

    const handleBecomeActive = () => {
      recordAppVisit();
      lastActiveMsRef.current = Date.now();
    };

    const handleBecomeInactive = () => {
      flushElapsed();
      lastActiveMsRef.current = null;
    };

    if (isAppForeground()) {
      handleBecomeActive();
    }

    const timer = setInterval(() => {
      if (isAppForeground()) {
        if (lastActiveMsRef.current === null) {
          handleBecomeActive();
        } else {
          flushElapsed();
        }
      } else {
        lastActiveMsRef.current = null;
      }
    }, TICK_INTERVAL_MS);

    const appStateSub = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          handleBecomeActive();
        } else {
          handleBecomeInactive();
        }
      }
    );

    let cleanupWeb: (() => void) | undefined;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const onVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          handleBecomeActive();
        } else {
          handleBecomeInactive();
        }
      };
      const onBeforeUnload = () => {
        flushElapsed();
      };
      document.addEventListener('visibilitychange', onVisibilityChange);
      window.addEventListener('beforeunload', onBeforeUnload);
      cleanupWeb = () => {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('beforeunload', onBeforeUnload);
      };
    }

    return () => {
      clearInterval(timer);
      appStateSub.remove();
      cleanupWeb?.();
      flushElapsed();
    };
  }, [addStudySeconds, hasHydrated, recordAppVisit]);
}
