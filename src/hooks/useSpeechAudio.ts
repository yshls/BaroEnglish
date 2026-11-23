import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { resolveLocalAudioAsset } from '../audio/audioAssets';

export interface PlayOptions {
  /** 로컬 MP3 에셋 키 (1.0x 보통 속도에서만 우선 재생) */
  audioAsset?: string;
  /** 현재 재생 중인 버튼을 식별하기 위한 키 (UI 시각 피드백용) */
  key?: string;
}

export const SPEECH_RATES = {
  normal: 0.95,
  // Android TTS에서 0.6x 기계음/끊김 완화를 위해 0.65로 플랫폼 보정 (SPEC.md 5.2)
  slow: Platform.OS === 'android' ? 0.65 : 0.6,
} as const;

let audioModeConfigured = false;

async function ensureAudioMode() {
  if (audioModeConfigured) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
    });
    audioModeConfigured = true;
  } catch {
    // Web이나 일부 시뮬레이터 환경에서 실패해도 TTS 폴백은 계속 진행
  }
}

export function useSpeechAudio() {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const playbackSessionRef = useRef(0);

  const releasePlayer = useCallback(() => {
    const current = playerRef.current;
    playerRef.current = null;
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
  }, []);

  const stop = useCallback(() => {
    playbackSessionRef.current += 1;
    releasePlayer();
    try {
      Speech.stop();
    } catch {
      // ignore
    }
    setActiveKey(null);
  }, [releasePlayer]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  const speakWithTts = useCallback(
    (text: string, rate: number, key: string, sessionId: number) => {
      setActiveKey(key);
      try {
        Speech.speak(text, {
          language: 'en-US',
          rate,
          onDone: () => {
            if (playbackSessionRef.current === sessionId) {
              setActiveKey(null);
            }
          },
          onStopped: () => {
            if (playbackSessionRef.current === sessionId) {
              setActiveKey(null);
            }
          },
          onError: () => {
            if (playbackSessionRef.current === sessionId) {
              setActiveKey(null);
            }
          },
        });
      } catch {
        if (playbackSessionRef.current === sessionId) {
          setActiveKey(null);
        }
      }
    },
    []
  );

  /**
   * 보통 속도 듣기 (1.0x):
   * 정적/로컬 원어민 MP3(audioAsset)가 있으면 expo-audio로 우선 재생,
   * 없거나 재생 오류 시 expo-speech (en-US, rate: 0.95)로 즉시 폴백.
   */
  const playNormal = useCallback(
    async (text: string, options?: PlayOptions) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      stop();
      const sessionId = playbackSessionRef.current;
      const key = options?.key ?? `normal:${trimmed.toLowerCase()}`;

      await ensureAudioMode();
      if (playbackSessionRef.current !== sessionId) return;

      const localSource = resolveLocalAudioAsset(options?.audioAsset);
      if (localSource) {
        try {
          const player = createAudioPlayer(localSource);
          playerRef.current = player;
          setActiveKey(key);

          player.addListener('playbackStatusUpdate', (status) => {
            if (playbackSessionRef.current !== sessionId) return;
            if (status.didJustFinish) {
              releasePlayer();
              setActiveKey(null);
            }
          });

          player.play();
          return;
        } catch {
          releasePlayer();
          // expo-audio 오류 시 즉시 TTS 폴백
        }
      }

      speakWithTts(trimmed, SPEECH_RATES.normal, key, sessionId);
    },
    [releasePlayer, speakWithTts, stop]
  );

  /**
   * 천천히 듣기 (0.6x / Android 0.65x 보정):
   * expo-speech (en-US)로 또박또박 재생.
   */
  const playSlow = useCallback(
    async (text: string, options?: Omit<PlayOptions, 'audioAsset'>) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      stop();
      const sessionId = playbackSessionRef.current;
      const key = options?.key ?? `slow:${trimmed.toLowerCase()}`;

      await ensureAudioMode();
      if (playbackSessionRef.current !== sessionId) return;

      speakWithTts(trimmed, SPEECH_RATES.slow, key, sessionId);
    },
    [speakWithTts, stop]
  );

  return {
    playNormal,
    playSlow,
    stop,
    activeKey,
    isPlaying: activeKey !== null,
  };
}
