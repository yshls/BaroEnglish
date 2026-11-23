import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioSource,
} from 'expo-audio';
import * as Speech from 'expo-speech';
import { resolveLocalAudioAsset } from '../audio/audioAssets';

export interface PlayOptions {
  /** 로컬 MP3 에셋 키 (1.0x 보통 속도에서만 우선 재생) */
  audioAsset?: string;
  /** 상업용 무료 API에서 제공한 원어민 MP3 URL (1.0x 보통 속도에서 우선 재생) */
  audioUrl?: string;
  /** 현재 재생 중인 버튼을 식별하기 위한 키 (UI 시각 피드백용) */
  key?: string;
}

export const SPEECH_RATES = {
  normal: 0.95,
  // Android TTS에서 0.6x 기계음/끊김 완화를 위해 0.65로 플랫폼 보정 (SPEC.md 5.2)
  slow: Platform.OS === 'android' ? 0.65 : 0.6,
} as const;

// 전역 싱글톤 오디오 컨트롤러 (탭/모달 간 소리 겹침 방지 및 race condition 차단)
let audioModeConfigured = false;
let sharedPlayer: AudioPlayer | null = null;
let sharedSubscription: { remove: () => void } | null = null;
let sharedFallbackTimer: ReturnType<typeof setTimeout> | null = null;
let sharedSessionId = 0;
let sharedActiveKey: string | null = null;
const listeners = new Set<(key: string | null) => void>();

function notifyActiveKey(nextKey: string | null) {
  sharedActiveKey = nextKey;
  for (const listener of listeners) {
    listener(nextKey);
  }
}

function clearFallbackTimer() {
  if (sharedFallbackTimer) {
    clearTimeout(sharedFallbackTimer);
    sharedFallbackTimer = null;
  }
}

function releaseSharedPlayer() {
  clearFallbackTimer();

  const sub = sharedSubscription;
  sharedSubscription = null;
  if (sub) {
    try {
      sub.remove();
    } catch {
      // ignore
    }
  }

  const current = sharedPlayer;
  sharedPlayer = null;
  if (!current) return;
  try {
    current.pause();
  } catch {
    // ignore
  }
  try {
    current.remove();
  } catch {
    // ignore
  }
}

async function stopGlobalAudio(): Promise<number> {
  sharedSessionId += 1;
  const sessionId = sharedSessionId;
  releaseSharedPlayer();
  notifyActiveKey(null);
  try {
    await Speech.stop();
  } catch {
    // ignore
  }
  return sessionId;
}

async function ensureAudioMode() {
  if (audioModeConfigured) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
    });
    audioModeConfigured = true;
  } catch {
    // 시뮬레이터 등 일부 환경에서 실패해도 TTS 폴백은 계속 진행
  }
}

function speakWithTts(text: string, rate: number, key: string, sessionId: number) {
  if (sharedSessionId !== sessionId) return;
  notifyActiveKey(key);
  try {
    Speech.speak(text, {
      language: 'en-US',
      rate,
      onDone: () => {
        if (sharedSessionId === sessionId) {
          notifyActiveKey(null);
        }
      },
      onStopped: () => {
        if (sharedSessionId === sessionId) {
          notifyActiveKey(null);
        }
      },
      onError: () => {
        if (sharedSessionId === sessionId) {
          notifyActiveKey(null);
        }
      },
    });
  } catch {
    if (sharedSessionId === sessionId) {
      notifyActiveKey(null);
    }
  }
}

export function useSpeechAudio() {
  const [activeKey, setActiveKey] = useState<string | null>(sharedActiveKey);

  useEffect(() => {
    listeners.add(setActiveKey);
    setActiveKey(sharedActiveKey);
    return () => {
      listeners.delete(setActiveKey);
    };
  }, []);

  const stop = useCallback(() => {
    void stopGlobalAudio();
  }, []);

  /**
   * 보통 속도 듣기 (1.0x):
   * 로컬 MP3(audioAsset) 또는 API 원어민 MP3(audioUrl)를 expo-audio로 우선 재생,
   * 없거나 네트워크/재생 오류(2.5초 내 미재생 포함) 시 expo-speech (en-US, 0.95)로 즉시 폴백.
   */
  const playNormal = useCallback(async (text: string, options?: PlayOptions) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const sessionId = await stopGlobalAudio();
    if (sharedSessionId !== sessionId) return;

    const key = options?.key ?? `normal:${trimmed.toLowerCase()}`;
    await ensureAudioMode();
    if (sharedSessionId !== sessionId) return;

    const localSource = resolveLocalAudioAsset(options?.audioAsset);
    const audioSource: AudioSource | null =
      localSource ??
      (options?.audioUrl && options.audioUrl.startsWith('http')
        ? { uri: options.audioUrl }
        : null);

    if (audioSource) {
      try {
        const player = createAudioPlayer(audioSource);
        sharedPlayer = player;
        notifyActiveKey(key);

        let startedPlaying = false;
        sharedSubscription = player.addListener('playbackStatusUpdate', (status) => {
          if (sharedSessionId !== sessionId) return;
          if (status.playing) {
            startedPlaying = true;
            clearFallbackTimer();
          }
          if (status.didJustFinish) {
            releaseSharedPlayer();
            notifyActiveKey(null);
          }
        });

        // 원격 MP3 로드 실패·오프라인 시 2.5초 내 TTS 자동 폴백
        sharedFallbackTimer = setTimeout(() => {
          if (sharedSessionId !== sessionId || startedPlaying) return;
          releaseSharedPlayer();
          speakWithTts(trimmed, SPEECH_RATES.normal, key, sessionId);
        }, 2500);

        player.play();
        return;
      } catch {
        releaseSharedPlayer();
        // expo-audio 오류 시 즉시 TTS 폴백
      }
    }

    speakWithTts(trimmed, SPEECH_RATES.normal, key, sessionId);
  }, []);

  /**
   * 천천히 듣기 (0.6x / Android 0.65x 보정):
   * expo-speech (en-US)로 또박또박 재생.
   */
  const playSlow = useCallback(
    async (text: string, options?: Omit<PlayOptions, 'audioAsset' | 'audioUrl'>) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const sessionId = await stopGlobalAudio();
      if (sharedSessionId !== sessionId) return;

      const key = options?.key ?? `slow:${trimmed.toLowerCase()}`;
      await ensureAudioMode();
      if (sharedSessionId !== sessionId) return;

      speakWithTts(trimmed, SPEECH_RATES.slow, key, sessionId);
    },
    []
  );

  return {
    playNormal,
    playSlow,
    stop,
    activeKey,
    isPlaying: activeKey !== null,
  };
}
