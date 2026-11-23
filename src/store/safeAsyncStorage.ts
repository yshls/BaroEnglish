import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

/**
 * AsyncStorage 예외·손상 JSON에 안전한 Zustand StateStorage 래퍼.
 * 읽기 시 손상된 JSON이 감지되면 키를 정리하고 null을 반환해 앱 크래시 및
 * 하이드레이션 고착을 방지합니다.
 */
export const safeAsyncStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const value = await AsyncStorage.getItem(name);
      if (value === null) return null;
      JSON.parse(value);
      return value;
    } catch {
      try {
        await AsyncStorage.removeItem(name);
      } catch {
        // ignore cleanup error
      }
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(name, value);
    } catch {
      // 디스크 용량 부족 등 저장 실패 시 앱 크래시 방지
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};
