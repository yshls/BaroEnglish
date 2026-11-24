import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
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
  // 실전 회화 리듬 연습용 빠르게 재생 속도
  fast: 1.25,
} as const;

const REMOTE_LOAD_FALLBACK_MS = 2500;
const MAX_PLAYBACK_SAFETY_MS = 12000;
const MAX_TTS_SAFETY_MS = 10000;

// 전역 싱글톤 오디오 컨트롤러
let audioModeConfigured = false;
let appStateSubscribed = false;
let resolvedEnglishVoiceId: string | undefined;
let voiceInitPromise: Promise<string | undefined> | null = null;
let stopQueue: Promise<void> = Promise.resolve();

let sharedPlayer: AudioPlayer | null = null;
let sharedSubscription: { remove: () => void } | null = null;
let sharedLoadFallbackTimer: ReturnType<typeof setTimeout> | null = null;
let sharedSafetyTimer: ReturnType<typeof setTimeout> | null = null;
let sharedSessionId = 0;
let sharedActiveKey: string | null = null;
const listeners = new Set<(key: string | null) => void>();

function notifyActiveKey(nextKey: string | null) {
  sharedActiveKey = nextKey;
  for (const listener of listeners) {
    listener(nextKey);
  }
}

function clearTimers() {
  if (sharedLoadFallbackTimer) {
    clearTimeout(sharedLoadFallbackTimer);
    sharedLoadFallbackTimer = null;
  }
  if (sharedSafetyTimer) {
    clearTimeout(sharedSafetyTimer);
    sharedSafetyTimer = null;
  }
}

function releaseSharedPlayer() {
  clearTimers();

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

/**
 * Android expo-speech@58.0.4 SpeechModule.kt는 Locale.Builder().setLanguage("en-US")에서
 * IllformedLocaleException을 발생시켜 ko-KR로 폴백하는 버그가 있으므로,
 * Android에서는 language: 'en' + getAvailableVoicesAsync()로 en-US 보이스 identifier를 지정합니다.
 */
async function ensureEnglishVoice(): Promise<string | undefined> {
  if (resolvedEnglishVoiceId) return resolvedEnglishVoiceId;
  if (voiceInitPromise) return voiceInitPromise;

  voiceInitPromise = (async () => {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      if (!Array.isArray(voices) || voices.length === 0) return undefined;

      const usExact =
        voices.find(
          (v) =>
            /^en[-_]us$/i.test(v.language) &&
            /enhanced/i.test(String(v.quality ?? ''))
        ) ??
        voices.find((v) => /^en[-_]us$/i.test(v.language)) ??
        voices.find((v) => /^en([-_]|$)/i.test(v.language));

      resolvedEnglishVoiceId = usExact?.identifier;
      return resolvedEnglishVoiceId;
    } catch {
      return undefined;
    }
  })();

  return voiceInitPromise;
}

function ensureAppStateListener() {
  if (appStateSubscribed) return;
  appStateSubscribed = true;

  AppState.addEventListener('change', (nextState: AppStateStatus) => {
    if (nextState !== 'active') {
      // 백그라운드/전화 인터럽션 시 재생 즉시 중단 및 오디오 세션 재설정 플래그 초기화
      audioModeConfigured = false;
      void stopGlobalAudio();
    }
  });
}

async function stopGlobalAudio(): Promise<number> {
  sharedSessionId += 1;
  const sessionId = sharedSessionId;
  releaseSharedPlayer();
  notifyActiveKey(null);

  // 연속 탭 시 Speech.stop() 호출을 단일 Promise 큐로 직렬화하여 레이스 컨디션 차단
  const nextStop = stopQueue
    .catch(() => undefined)
    .then(async () => {
      try {
        await Speech.stop();
      } catch {
        // ignore
      }
    });
  stopQueue = nextStop;
  await nextStop;

  return sessionId;
}

async function ensureAudioMode() {
  ensureAppStateListener();
  if (audioModeConfigured) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'duckOthers',
    });
    audioModeConfigured = true;
  } catch {
    // 일부 시뮬레이터 환경에서 실패해도 TTS 폴백 계속 진행
  }
}

async function speakWithTts(
  text: string,
  rate: number,
  key: string,
  sessionId: number
) {
  const voiceId = await ensureEnglishVoice();
  if (sharedSessionId !== sessionId) return;

  clearTimers();
  notifyActiveKey(key);

  // 네이티브 콜백 누락 시에도 UI가 영구 고착되지 않도록 안전 타임아웃 설정
  sharedSafetyTimer = setTimeout(() => {
    if (sharedSessionId === sessionId) {
      notifyActiveKey(null);
    }
  }, MAX_TTS_SAFETY_MS);

  try {
    Speech.speak(text, {
      language: Platform.OS === 'android' ? 'en' : 'en-US',
      ...(voiceId ? { voice: voiceId } : {}),
      ...(Platform.OS === 'ios' ? { useApplicationAudioSession: true } : {}),
      rate,
      onDone: () => {
        if (sharedSessionId === sessionId) {
          clearTimers();
          notifyActiveKey(null);
        }
      },
      onStopped: () => {
        if (sharedSessionId === sessionId) {
          clearTimers();
          notifyActiveKey(null);
        }
      },
      onError: () => {
        if (sharedSessionId === sessionId) {
          clearTimers();
          notifyActiveKey(null);
        }
      },
    });
  } catch {
    if (sharedSessionId === sessionId) {
      clearTimers();
      notifyActiveKey(null);
    }
  }
}

function subscribeActiveKey(onStoreChange: () => void): () => void {
  const listener = () => onStoreChange();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getActiveKeySnapshot(): string | null {
  return sharedActiveKey;
}

export function useSpeechAudio() {
  const activeKey = useSyncExternalStore(
    subscribeActiveKey,
    getActiveKeySnapshot,
    getActiveKeySnapshot
  );

  useEffect(() => {
    ensureAppStateListener();
    // Android TTS 콜드 스타트 워밍업 및 영어 보이스 사전 조회
    void ensureEnglishVoice();
  }, []);

  const stop = useCallback(() => {
    void stopGlobalAudio();
  }, []);

  /**
   * 보통 속도 듣기 (1.0x):
   * 로컬 MP3(audioAsset) 또는 API 원어민 MP3(audioUrl)를 expo-audio로 우선 재생,
   * status.error / 로드 지연(2.5초) / 예외 발생 시 expo-speech (0.95)로 즉시 폴백.
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
        let fellBack = false;

        const triggerTtsFallback = () => {
          if (fellBack || sharedSessionId !== sessionId) return;
          fellBack = true;
          releaseSharedPlayer();
          void speakWithTts(trimmed, SPEECH_RATES.normal, key, sessionId);
        };

        sharedSubscription = player.addListener('playbackStatusUpdate', (status) => {
          if (sharedSessionId !== sessionId) return;

          if (status.error) {
            triggerTtsFallback();
            return;
          }

          if (status.playing && !startedPlaying) {
            startedPlaying = true;
            if (sharedLoadFallbackTimer) {
              clearTimeout(sharedLoadFallbackTimer);
              sharedLoadFallbackTimer = null;
            }
          }

          if (status.didJustFinish) {
            releaseSharedPlayer();
            notifyActiveKey(null);
          }
        });

        // 2.5초 내 재생 미시작 시 즉시 TTS 폴백
        sharedLoadFallbackTimer = setTimeout(() => {
          if (sharedSessionId !== sessionId || startedPlaying) return;
          triggerTtsFallback();
        }, REMOTE_LOAD_FALLBACK_MS);

        // 재생 시작 후 스트림 끊김 등 비정상 종료 대비 최대 안전 타임아웃
        sharedSafetyTimer = setTimeout(() => {
          if (sharedSessionId === sessionId) {
            releaseSharedPlayer();
            notifyActiveKey(null);
          }
        }, MAX_PLAYBACK_SAFETY_MS);

        player.play();
        return;
      } catch {
        releaseSharedPlayer();
      }
    }

    await speakWithTts(trimmed, SPEECH_RATES.normal, key, sessionId);
  }, []);

  /**
   * 천천히 듣기 (0.6x / Android 0.65x 보정):
   * expo-speech로 또박또박 재생.
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

      await speakWithTts(trimmed, SPEECH_RATES.slow, key, sessionId);
    },
    []
  );

  /**
   * 빠르게 듣기 (1.25x):
   * 실전 회화 리듬에 익숙해지도록 expo-speech로 빠르게 재생.
   */
  const playFast = useCallback(
    async (text: string, options?: Omit<PlayOptions, 'audioAsset' | 'audioUrl'>) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const sessionId = await stopGlobalAudio();
      if (sharedSessionId !== sessionId) return;

      const key = options?.key ?? `fast:${trimmed.toLowerCase()}`;
      await ensureAudioMode();
      if (sharedSessionId !== sessionId) return;

      await speakWithTts(trimmed, SPEECH_RATES.fast, key, sessionId);
    },
    []
  );

  return {
    playNormal,
    playSlow,
    playFast,
    stop,
    activeKey,
    isPlaying: activeKey !== null,
  };
}
