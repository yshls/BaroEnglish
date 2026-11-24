import { Platform, Vibration } from 'react-native';

/**
 * 크로스 플랫폼 경량 촉각 피드백 유틸리티 (네이티브 모듈 추가 없이 동작).
 * - Android/iOS: React Native 내장 Vibration API 사용
 * - Web: 지원되는 모바일 브라우저에서만 navigator.vibrate 호출 (데스크톱은 무음 패스)
 */
function vibrateSafe(pattern: number | number[]) {
  try {
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
      return;
    }

    if (Platform.OS === 'android') {
      Vibration.vibrate(pattern);
    } else if (Platform.OS === 'ios') {
      // iOS Vibration.vibrate()는 고정 길이 진동이므로 짧은 단일 임팩트만 선택적으로 사용
      if (typeof pattern === 'number' && pattern >= 20) {
        Vibration.vibrate(10);
      }
    }
  } catch {
    // 진동 미지원 환경에서는 조용히 무시
  }
}

export function triggerLightHaptic() {
  vibrateSafe(10);
}

export function triggerMediumHaptic() {
  vibrateSafe(22);
}

export function triggerSuccessHaptic() {
  vibrateSafe([0, 14, 45, 22]);
}

export function triggerErrorHaptic() {
  vibrateSafe([0, 28, 40, 28]);
}
