import {
  createAudioPlayer,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  type AudioPlayer,
} from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  evaluateAudioRhythmFallback,
  evaluatePronunciationTranscripts,
  type PronunciationEvaluation,
} from '../services/pronunciationMatcher';

interface WebSpeechAlternative {
  transcript: string;
  confidence?: number;
}

interface WebSpeechResult {
  isFinal: boolean;
  length: number;
  [index: number]: WebSpeechAlternative;
}

interface WebSpeechRecognitionEvent {
  results: {
    length: number;
    [index: number]: WebSpeechResult;
  };
}

interface WebSpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: WebSpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface WebWindowWithSpeech extends Window {
  SpeechRecognition?: new () => WebSpeechRecognitionInstance;
  webkitSpeechRecognition?: new () => WebSpeechRecognitionInstance;
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

export interface PracticeSessionState {
  wordKey: string;
  recordingUri: string | null;
  evaluation: PronunciationEvaluation | null;
  liveTranscript: string;
  errorMessage: string | null;
}

export interface UsePronunciationPracticeOptions {
  targetWord: string;
  syllableCount: number;
  /** 원어민 발음 재생 콜백 (비교 재생 시 먼저 실행) */
  onPlayNative: () => void | Promise<void>;
  /** 녹음 시작 전 재생 중인 원어민/TTS 오디오를 즉시 중단하는 콜백 */
  onStopNative: () => void;
}

const MAX_WORD_RECORD_MS = 4800;
const MAX_SENTENCE_RECORD_MS = 8500;

function pickBestWebAudioMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
    return undefined;
  }
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

export function usePronunciationPractice({
  targetWord,
  syllableCount,
  onPlayNative,
  onStopNative,
}: UsePronunciationPracticeOptions) {
  const normalizedWord = targetWord.trim().toLowerCase();
  const isSentenceTarget = normalizedWord.split(/\s+/).filter(Boolean).length >= 3;
  const maxRecordMs = isSentenceTarget ? MAX_SENTENCE_RECORD_MS : MAX_WORD_RECORD_MS;

  // 네이티브(iOS/Android) 임시 녹음기 — 앱 내 영구 저장 없이 세션 중 임시 캐시만 사용
  const nativeRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingUser, setIsPlayingUser] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [comparePhase, setComparePhase] = useState<'idle' | 'native' | 'user'>('idle');
  const [micLevel, setMicLevel] = useState(0);
  const [session, setSession] = useState<PracticeSessionState>({
    wordKey: normalizedWord,
    recordingUri: null,
    evaluation: null,
    liveTranscript: '',
    errorMessage: null,
  });

  // Web 임시 녹음/분석/음성인식 리소스 참조 (언마운트·단어 전환 시 즉시 해제)
  const webMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const webStreamRef = useRef<MediaStream | null>(null);
  const webChunksRef = useRef<Blob[]>([]);
  const webBlobUrlRef = useRef<string | null>(null);
  const webAudioElRef = useRef<HTMLAudioElement | null>(null);
  const webAudioCtxRef = useRef<AudioContext | null>(null);
  const webLevelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const webRecognitionRef = useRef<WebSpeechRecognitionInstance | null>(null);
  const webTranscriptAltsRef = useRef<{ transcript: string; confidence?: number }[]>([]);
  const nativePlayerRef = useRef<AudioPlayer | null>(null);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const compareTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const webEvalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordStartTimeRef = useRef<number>(0);
  const peakLevelRef = useRef<number>(0);
  const activeRecordingWordRef = useRef<string>(normalizedWord);
  const mountedRef = useRef(true);

  const clearTimers = useCallback(() => {
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    if (compareTimerRef.current) {
      clearTimeout(compareTimerRef.current);
      compareTimerRef.current = null;
    }
    if (webEvalTimerRef.current) {
      clearTimeout(webEvalTimerRef.current);
      webEvalTimerRef.current = null;
    }
    if (webLevelIntervalRef.current) {
      clearInterval(webLevelIntervalRef.current);
      webLevelIntervalRef.current = null;
    }
  }, []);

  const stopUserPlayback = useCallback(() => {
    if (compareTimerRef.current) {
      clearTimeout(compareTimerRef.current);
      compareTimerRef.current = null;
    }
    if (webAudioElRef.current) {
      try {
        webAudioElRef.current.pause();
        webAudioElRef.current.currentTime = 0;
      } catch {
        // ignore
      }
      webAudioElRef.current = null;
    }
    if (nativePlayerRef.current) {
      try {
        nativePlayerRef.current.pause();
        nativePlayerRef.current.remove();
      } catch {
        // ignore
      }
      nativePlayerRef.current = null;
    }
    if (mountedRef.current) {
      setIsPlayingUser(false);
      setIsComparing(false);
      setComparePhase('idle');
    }
  }, []);

  const revokeWebRecording = useCallback(() => {
    if (webBlobUrlRef.current && typeof URL !== 'undefined' && URL.revokeObjectURL) {
      try {
        URL.revokeObjectURL(webBlobUrlRef.current);
      } catch {
        // ignore
      }
      webBlobUrlRef.current = null;
    }
  }, []);

  const teardownWebCapture = useCallback(() => {
    if (webLevelIntervalRef.current) {
      clearInterval(webLevelIntervalRef.current);
      webLevelIntervalRef.current = null;
    }
    if (webRecognitionRef.current) {
      try {
        webRecognitionRef.current.onresult = null;
        webRecognitionRef.current.onerror = null;
        webRecognitionRef.current.onend = null;
        webRecognitionRef.current.abort();
      } catch {
        // ignore
      }
      webRecognitionRef.current = null;
    }
    if (webMediaRecorderRef.current) {
      try {
        if (webMediaRecorderRef.current.state !== 'inactive') {
          webMediaRecorderRef.current.ondataavailable = null;
          webMediaRecorderRef.current.onstop = null;
          webMediaRecorderRef.current.stop();
        }
      } catch {
        // ignore
      }
      webMediaRecorderRef.current = null;
    }
    if (webStreamRef.current) {
      for (const track of webStreamRef.current.getTracks()) {
        try {
          track.stop();
        } catch {
          // ignore
        }
      }
      webStreamRef.current = null;
    }
    if (webAudioCtxRef.current) {
      try {
        void webAudioCtxRef.current.close();
      } catch {
        // ignore
      }
      webAudioCtxRef.current = null;
    }
  }, []);

  const disposeAll = useCallback(() => {
    clearTimers();
    stopUserPlayback();
    teardownWebCapture();
    revokeWebRecording();
    if (Platform.OS !== 'web') {
      try {
        if (nativeRecorder.isRecording) {
          void nativeRecorder.stop();
        }
      } catch {
        // ignore
      }
    }
  }, [clearTimers, nativeRecorder, revokeWebRecording, stopUserPlayback, teardownWebCapture]);

  // 컴포넌트 언마운트 시 모든 임시 녹음/마이크 스트림 즉시 폐기 (저장 없음)
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      disposeAll();
    };
  }, [disposeAll]);

  // 단어가 바뀌면 이전 단어의 임시 녹음 Blob/스트림을 즉시 폐기
  useEffect(() => {
    return () => {
      clearTimers();
      stopUserPlayback();
      teardownWebCapture();
      revokeWebRecording();
    };
  }, [normalizedWord, clearTimers, revokeWebRecording, stopUserPlayback, teardownWebCapture]);

  const stopRecording = useCallback(async () => {
    clearTimers();

    if (Platform.OS === 'web') {
      const recorder = webMediaRecorderRef.current;
      const recognition = webRecognitionRef.current;

      if (recognition) {
        try {
          recognition.stop();
        } catch {
          // ignore
        }
      }

      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          teardownWebCapture();
          if (mountedRef.current) {
            setIsRecording(false);
            setMicLevel(0);
          }
        }
      } else {
        teardownWebCapture();
        if (mountedRef.current) {
          setIsRecording(false);
          setMicLevel(0);
        }
      }
      return;
    }

    // 네이티브(iOS/Android) 녹음 종료 및 스피커 출력 모드 복원
    try {
      const durationMs = Math.max(0, Date.now() - recordStartTimeRef.current);
      if (nativeRecorder.isRecording) {
        await nativeRecorder.stop();
      }
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
      });

      const recordedUri = nativeRecorder.uri;
      const evalResult = evaluateAudioRhythmFallback(
        syllableCount,
        durationMs,
        durationMs >= 260 ? 0.35 : 0.04
      );

      if (mountedRef.current) {
        setIsRecording(false);
        setMicLevel(0);
        setSession({
          wordKey: activeRecordingWordRef.current,
          recordingUri: recordedUri ?? null,
          evaluation: evalResult,
          liveTranscript: '',
          errorMessage: recordedUri ? null : '녹음 파일을 불러오지 못했어요. 다시 시도해 주세요.',
        });
      }
    } catch {
      if (mountedRef.current) {
        setIsRecording(false);
        setMicLevel(0);
        setSession((prev) => ({
          ...prev,
          wordKey: activeRecordingWordRef.current,
          errorMessage: '녹음 마무리 중 문제가 생겼어요. 다시 눌러 보세요.',
        }));
      }
    }
  }, [clearTimers, nativeRecorder, syllableCount, teardownWebCapture]);

  const startRecording = useCallback(async () => {
    if (!normalizedWord) return;

    onStopNative();
    stopUserPlayback();
    clearTimers();
    teardownWebCapture();
    revokeWebRecording();

    activeRecordingWordRef.current = normalizedWord;
    recordStartTimeRef.current = Date.now();
    peakLevelRef.current = 0;
    webTranscriptAltsRef.current = [];

    setSession({
      wordKey: normalizedWord,
      recordingUri: null,
      evaluation: null,
      liveTranscript: '',
      errorMessage: null,
    });

    if (Platform.OS === 'web') {
      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setSession({
          wordKey: normalizedWord,
          recordingUri: null,
          evaluation: null,
          liveTranscript: '',
          errorMessage:
            '현재 브라우저에서 마이크 녹음을 지원하지 않아요. 크롬·엣지·사파리에서 이용해 주세요.',
        });
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!mountedRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        webStreamRef.current = stream;

        // 실시간 마이크 음량 파형 분석기 연결
        const win = window as WebWindowWithSpeech;
        const AudioCtx = win.AudioContext || win.webkitAudioContext;
        if (AudioCtx) {
          try {
            const ctx = new AudioCtx();
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            webAudioCtxRef.current = ctx;

            const timeData = new Uint8Array(analyser.fftSize);
            webLevelIntervalRef.current = setInterval(() => {
              analyser.getByteTimeDomainData(timeData);
              let sumSq = 0;
              for (let i = 0; i < timeData.length; i += 1) {
                const centered = (timeData[i] - 128) / 128;
                sumSq += centered * centered;
              }
              const rms = Math.sqrt(sumSq / timeData.length);
              const normalizedLvl = Math.min(1, rms * 3.8);
              if (normalizedLvl > peakLevelRef.current) {
                peakLevelRef.current = normalizedLvl;
              }
              if (mountedRef.current) {
                setMicLevel(normalizedLvl);
              }
            }, 85);
          } catch {
            // AudioContext 미지원 시 음량 미터만 생략
          }
        }

        // 1) 일회성 인메모리 MediaRecorder 시작 (절대 영구 저장하지 않음)
        const mimeType = pickBestWebAudioMime();
        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
        webChunksRef.current = [];
        webMediaRecorderRef.current = recorder;

        recorder.ondataavailable = (evt) => {
          if (evt.data && evt.data.size > 0) {
            webChunksRef.current.push(evt.data);
          }
        };

        recorder.onstop = () => {
          const durationMs = Math.max(0, Date.now() - recordStartTimeRef.current);
          const blob = new Blob(webChunksRef.current, {
            type: mimeType || 'audio/webm',
          });
          webChunksRef.current = [];

          // 마이크 트랙 및 AudioContext 즉시 해제
          if (webStreamRef.current) {
            webStreamRef.current.getTracks().forEach((t) => t.stop());
            webStreamRef.current = null;
          }
          if (webAudioCtxRef.current) {
            void webAudioCtxRef.current.close().catch(() => undefined);
            webAudioCtxRef.current = null;
          }
          if (webLevelIntervalRef.current) {
            clearInterval(webLevelIntervalRef.current);
            webLevelIntervalRef.current = null;
          }

          const blobUrl = blob.size > 0 ? URL.createObjectURL(blob) : null;
          revokeWebRecording();
          webBlobUrlRef.current = blobUrl;

          // SpeechRecognition 결과가 늦게 도착할 수 있어 220ms 대기 후 최종 채점
          if (webEvalTimerRef.current) {
            clearTimeout(webEvalTimerRef.current);
          }
          webEvalTimerRef.current = setTimeout(() => {
            webEvalTimerRef.current = null;
            if (!mountedRef.current) return;
            const alts = webTranscriptAltsRef.current;
            const hasSpeechApi = Boolean(
              (window as WebWindowWithSpeech).SpeechRecognition ||
                (window as WebWindowWithSpeech).webkitSpeechRecognition
            );

            const evalResult =
              alts.length > 0
                ? evaluatePronunciationTranscripts(activeRecordingWordRef.current, alts)
                : hasSpeechApi && durationMs >= 300
                  ? evaluatePronunciationTranscripts(activeRecordingWordRef.current, [])
                  : evaluateAudioRhythmFallback(
                      syllableCount,
                      durationMs,
                      peakLevelRef.current
                    );

            setIsRecording(false);
            setMicLevel(0);
            setSession({
              wordKey: activeRecordingWordRef.current,
              recordingUri: blobUrl,
              evaluation: evalResult,
              liveTranscript: evalResult.heardText,
              errorMessage: null,
            });
          }, 220);
        };

        recorder.start();

        // 2) 브라우저 내장 Web Speech API 병렬 실행 (영어 발음 유사도 실시간 비교)
        const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
        if (SpeechRec) {
          try {
            const recognition = new SpeechRec();
            recognition.lang = 'en-US';
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.maxAlternatives = 5;

            recognition.onresult = (event) => {
              const collected: { transcript: string; confidence?: number }[] = [];
              let latestInterim = '';
              let gotFinal = false;

              for (let i = 0; i < event.results.length; i += 1) {
                const res = event.results[i];
                if (res.isFinal) gotFinal = true;
                for (let j = 0; j < res.length; j += 1) {
                  const alt = res[j];
                  if (alt?.transcript) {
                    collected.push({
                      transcript: alt.transcript,
                      confidence: alt.confidence,
                    });
                    if (j === 0) latestInterim = alt.transcript;
                  }
                }
              }

              if (collected.length > 0) {
                webTranscriptAltsRef.current = collected;
              }
              if (mountedRef.current && latestInterim) {
                setSession((prev) => ({
                  ...prev,
                  wordKey: activeRecordingWordRef.current,
                  liveTranscript: latestInterim,
                }));
              }

              // 최종 발화가 인식되면 350ms 뒤 자연스럽게 자동 종료
              if (gotFinal) {
                if (autoStopTimerRef.current) {
                  clearTimeout(autoStopTimerRef.current);
                }
                autoStopTimerRef.current = setTimeout(() => {
                  void stopRecording();
                }, 350);
              }
            };

            recognition.onerror = () => {
              // 인식 실패해도 녹음 본체 재생은 그대로 유지
            };

            webRecognitionRef.current = recognition;
            recognition.start();
          } catch {
            // SpeechRecognition 시작 실패 시 녹음 비교만 계속 진행
          }
        }

        setIsRecording(true);
        autoStopTimerRef.current = setTimeout(() => {
          void stopRecording();
        }, maxRecordMs);
      } catch {
        teardownWebCapture();
        if (mountedRef.current) {
          setIsRecording(false);
          setMicLevel(0);
          setSession({
            wordKey: normalizedWord,
            recordingUri: null,
            evaluation: null,
            liveTranscript: '',
            errorMessage:
              '마이크 권한이 필요해요. 브라우저 주소창 왼쪽 마이크 허용을 켜고 다시 눌러 주세요.',
          });
        }
      }
      return;
    }

    // 네이티브(iOS/Android) expo-audio 임시 녹음 흐름
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        if (mountedRef.current) {
          setSession({
            wordKey: normalizedWord,
            recordingUri: null,
            evaluation: null,
            liveTranscript: '',
            errorMessage: '마이크 권한을 허용해 주셔야 내 발음을 녹음해서 비교할 수 있어요.',
          });
        }
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
      });

      await nativeRecorder.prepareToRecordAsync();
      nativeRecorder.record();

      if (mountedRef.current) {
        setIsRecording(true);
        setMicLevel(0.45);
      }

      autoStopTimerRef.current = setTimeout(() => {
        void stopRecording();
      }, maxRecordMs);
    } catch {
      if (mountedRef.current) {
        setIsRecording(false);
        setMicLevel(0);
        setSession({
          wordKey: normalizedWord,
          recordingUri: null,
          evaluation: null,
          liveTranscript: '',
          errorMessage: '마이크를 시작하지 못했어요. 잠시 후 다시 눌러 주세요.',
        });
      }
    }
  }, [
    clearTimers,
    maxRecordMs,
    nativeRecorder,
    normalizedWord,
    onStopNative,
    revokeWebRecording,
    stopRecording,
    stopUserPlayback,
    syllableCount,
    teardownWebCapture,
  ]);

  const playUserRecording = useCallback(async () => {
    const uri = session.wordKey === normalizedWord ? session.recordingUri : null;
    if (!uri) return;

    onStopNative();
    stopUserPlayback();

    if (Platform.OS === 'web') {
      try {
        const audio = new Audio(uri);
        webAudioElRef.current = audio;
        setIsPlayingUser(true);

        audio.onended = () => {
          if (webAudioElRef.current === audio) {
            webAudioElRef.current = null;
          }
          if (mountedRef.current) {
            setIsPlayingUser(false);
            setIsComparing(false);
            setComparePhase('idle');
          }
        };
        audio.onerror = () => {
          if (webAudioElRef.current === audio) {
            webAudioElRef.current = null;
          }
          if (mountedRef.current) {
            setIsPlayingUser(false);
            setIsComparing(false);
            setComparePhase('idle');
          }
        };
        await audio.play();
      } catch {
        if (mountedRef.current) {
          setIsPlayingUser(false);
          setIsComparing(false);
          setComparePhase('idle');
        }
      }
      return;
    }

    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
      });

      const player = createAudioPlayer({ uri });
      nativePlayerRef.current = player;
      setIsPlayingUser(true);

      const sub = player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish || status.error) {
          sub.remove();
          if (nativePlayerRef.current === player) {
            nativePlayerRef.current = null;
          }
          try {
            player.remove();
          } catch {
            // ignore
          }
          if (mountedRef.current) {
            setIsPlayingUser(false);
            setIsComparing(false);
            setComparePhase('idle');
          }
        }
      });

      player.play();
    } catch {
      if (mountedRef.current) {
        setIsPlayingUser(false);
        setIsComparing(false);
        setComparePhase('idle');
      }
    }
  }, [normalizedWord, onStopNative, session.recordingUri, session.wordKey, stopUserPlayback]);

  // 원어민 발음을 먼저 들려준 뒤 잠시 쉬었다가 내 녹음을 연달아 재생해 귀로 바로 비교
  const playCompareWithNative = useCallback(() => {
    const uri = session.wordKey === normalizedWord ? session.recordingUri : null;
    if (!uri) return;

    stopUserPlayback();
    setIsComparing(true);
    setComparePhase('native');
    void onPlayNative();

    const delayMs = Math.min(2200, Math.max(1250, 900 + Math.max(1, syllableCount) * 260));
    compareTimerRef.current = setTimeout(() => {
      compareTimerRef.current = null;
      if (!mountedRef.current) return;
      setComparePhase('user');
      void playUserRecording();
    }, delayMs);
  }, [
    normalizedWord,
    onPlayNative,
    playUserRecording,
    session.recordingUri,
    session.wordKey,
    stopUserPlayback,
    syllableCount,
  ]);

  const resetPractice = useCallback(() => {
    disposeAll();
    setIsRecording(false);
    setMicLevel(0);
    setComparePhase('idle');
    setSession({
      wordKey: normalizedWord,
      recordingUri: null,
      evaluation: null,
      liveTranscript: '',
      errorMessage: null,
    });
  }, [disposeAll, normalizedWord]);

  const isCurrentWordSession = session.wordKey === normalizedWord;

  return {
    isRecording,
    isPlayingUser,
    isComparing,
    comparePhase,
    micLevel,
    hasRecording: isCurrentWordSession && Boolean(session.recordingUri),
    evaluation: isCurrentWordSession ? session.evaluation : null,
    liveTranscript: isCurrentWordSession ? session.liveTranscript : '',
    errorMessage: isCurrentWordSession ? session.errorMessage : null,
    startRecording,
    stopRecording,
    playUserRecording,
    playCompareWithNative,
    resetPractice,
  };
}
