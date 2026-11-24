import { Platform } from 'react-native';

/**
 * 바로영어 (baro-english) 시니어 친화 디자인 토큰
 * SPEC.md Section 2 기준 (50대 영어 왕초보 맞춤형)
 */

export const FONT_FAMILY_NAME = 'SpokaHanSansNeo';

export const FONTS = {
  family:
    Platform.select({
      web: `'${FONT_FAMILY_NAME}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
      default: FONT_FAMILY_NAME,
    }) ?? FONT_FAMILY_NAME,
} as const;

export const COLORS = {
  // 배경 & 서피스
  background: '#F7F5F0', // 웜 크림 — 눈부심을 줄이는 따뜻한 배경
  card: '#FFFFFF',       // 순백색 — Bento Box 독립 카드
  border: '#E5E0D8',     // 웜 샌드 — 카드 1px 보더 및 입력창 테두리

  // 메인 강조색 (포레스트 그린)
  primary: '#15803D',      // 딥 포레스트 그린 (흰색 글씨와 4.5:1+ 고대비)
  primaryDark: '#1B4332',  // 진한 강조 / 눌림 상태
  tint: '#DCFCE7',         // 라이트 민트 크림 — 익힘 완료 카드 배경, 안내 배지

  // 포인트 컬러 (앰버 골드)
  accent: '#D97706',       // 웜 앰버 골드 — 강세 블록, 강세 박자 점, 묵음 주의
  accentText: '#B45309',   // 앰버 텍스트 전용 (고대비 가독성 확보)
  accentSoft: '#FEF3C7',   // 강세 음절 연한 배경

  // 텍스트
  text: '#1E293B',         // 다크 차콜 — 기본 본문/제목 텍스트
  textMuted: '#475569',    // 보조 안내 텍스트 (충분한 대비 유지)
  white: '#FFFFFF',
} as const;

export const TYPOGRAPHY = {
  // 기본 본문 최소 18px 이상 (시니어 가독성 원칙)
  body: 18,
  bodyLarge: 20,
  label: 18,
  sectionTitle: 22,
  screenTitle: 26,

  // 영어 단어 및 발음기호 28px ~ 36px 이상
  ipa: 28,
  ipaLarge: 34,
  word: 32,
  wordHero: 36,
  syllablePrimary: 30,
  syllableNormal: 24,
  syllableSchwa: 20,
} as const;

export const TOUCH = {
  minTarget: 48,         // 최소 터치 영역 48x48dp
  recommendedHeight: 56, // 주요 버튼 권장 높이 56dp
  tabBarHeight: 72,      // 시니어용 큼직한 하단 탭 바
} as const;

export const SPACING = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 24,
} as const;

export const RADIUS = {
  sm: 10,
  md: 14,
  lg: 18,
  card: 20,
  pill: 999,
} as const;
