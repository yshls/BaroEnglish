import type { AudioSource } from 'expo-audio';

/**
 * 로컬 정적 원어민 MP3 음원 레지스트리.
 * 단어 데이터에 audioAsset 키가 지정되어 있고 여기에 등록된 경우
 * expo-audio로 우선 재생되며, 없으면 expo-speech로 자동 폴백됩니다.
 *
 * 예시:
 * export const LOCAL_AUDIO_ASSETS: Record<string, AudioSource> = {
 *   apple: require('../../assets/audio/apple.mp3'),
 * };
 */
export const LOCAL_AUDIO_ASSETS: Record<string, AudioSource> = {};

export function resolveLocalAudioAsset(assetKey?: string): AudioSource | null {
  if (!assetKey) return null;
  return LOCAL_AUDIO_ASSETS[assetKey] ?? null;
}
