import { Platform } from 'react-native';

/**
 * baro (바로영어) 디자인 토큰 — Headspace-inspired warm brand
 * - Spoqa Han Sans Neo 웹·모바일 공통 폰트
 * - Cream 배경(#f9f4f2) + 딥 블루 CTA(#0061ef) + 웜 뉴트럴 텍스트(#2d2c2b)
 * - 색상 스펙: DESIGN.md 참조
 */
export const FONT_FAMILY_NAME = 'SpokaHanSansNeo';

export const FONTS = {
  family:
    Platform.select({
      web: `'${FONT_FAMILY_NAME}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
      default: FONT_FAMILY_NAME,
    }) ?? FONT_FAMILY_NAME,
} as const;

export const PALETTE = {
  brand: {
    100: '#e6f0ff',
    200: '#c2daff',
    300: '#80b3ff',
    400: '#4d93f7',
    500: '#0061ef',
    600: '#0040ea',
    700: '#0000db',
  },
  blue: {
    100: '#e6f0ff',
    200: '#c2daff',
    300: '#80b3ff',
    400: '#4d93f7',
    500: '#0061ef',
    600: '#0040ea',
    700: '#0000db',
  },
  green: {
    100: '#E8FBF2',
    200: '#C3F5DF',
    300: '#85ECC2',
    400: '#2AD68E',
    500: '#00B368',
    600: '#009657',
    700: '#00804B',
  },
  teal: {
    100: '#EAF7FF',
    200: '#C9ECFF',
    300: '#8FD7FF',
    400: '#38BDF8',
    500: '#0095E8',
    600: '#0081CC',
    700: '#0071B8',
  },
  amber: {
    100: '#fffbe6',
    200: '#fff5c2',
    300: '#ffe680',
    400: '#ffd61a',
    500: '#ffce00',
    600: '#d4aa00',
    700: '#a88500',
  },
  orange: {
    100: '#fef6e8',
    200: '#fce8c3',
    300: '#f9d38a',
    400: '#f0aa20',
    500: '#d99000',
    600: '#b87800',
    700: '#9e6000',
    vividText: '#a06500',
  },
  purple: {
    100: '#f0eaff',
    200: '#ddd0ff',
    300: '#b89deb',
    400: '#6a3bad',
    500: '#3b197f',
    600: '#2f1266',
    700: '#240d50',
  },
  indigo: {
    100: '#EDF2FF',
    200: '#DBE4FF',
    300: '#BAC8FF',
    400: '#748FFC',
    500: '#4C6EF5',
    600: '#3B5BDB',
    700: '#3352D9',
  },
  rose: {
    100: '#fff5f9',
    200: '#ffe8f2',
    300: '#ffd0e4',
    400: '#ffb3d1',
    500: '#ffa1cc',
    600: '#d4719f',
    700: '#a84f78',
  },
  red: {
    100: '#fef2f2',
    200: '#fde3e3',
    300: '#f89898',
    400: '#f06565',
    500: '#e01919',
    600: '#c71414',
    700: '#a51010',
  },
  gray: {
    100: '#f9f4f2',
    200: '#e5e7ec',
    300: '#e2ded9',
    400: '#d2d5de',
    500: '#4b4c4d',
    600: '#44423f',
    700: '#2d2c2b',
  },
} as const;

export const COLORS = {
  background: PALETTE.gray[100],  // cream #f9f4f2
  card: '#FFFFFF',                // canvas
  border: PALETTE.gray[300],      // border-tan #e2ded9

  // 메인 브랜드 (딥 블루 #0061ef — 로고, 기본 듣기 1.0x, 검색, 주요 CTA)
  primary: PALETTE.brand[500],
  primaryDark: PALETTE.brand[600],
  tint: PALETTE.brand[100],

  // 강조 (웜 앰버 — 강세 ⬤ 리듬, 중급 난이도)
  accent: PALETTE.orange[500],
  accentText: PALETTE.orange.vividText,
  accentSoft: PALETTE.orange[100],

  // 성공·익힘·초급
  success: PALETTE.green[500],
  successText: PALETTE.green[700],
  successSoft: PALETTE.green[100],

  // 천천히 듣기 0.6x · 호흡·부드러운 가이드
  teal: PALETTE.teal[500],
  tealText: PALETTE.teal[700],
  tealSoft: PALETTE.teal[100],

  // 북마크 · 즐겨찾기 (트루 골드 #ffce00)
  gold: PALETTE.amber[500],
  goldText: PALETTE.amber[700],
  goldSoft: PALETTE.amber[100],

  // 따라 말하기 · 빠르게 1.25x (딥 퍼플 #3b197f)
  purple: PALETTE.purple[500],
  purpleText: PALETTE.purple[700],
  purpleSoft: PALETTE.purple[100],

  // 예문 · 단어 뜻 · 추천 칩
  indigo: PALETTE.indigo[500],
  indigoText: PALETTE.indigo[700],
  indigoSoft: PALETTE.indigo[100],

  // 녹음 중 · 쇼츠 라이브 (소프트 핑크 #ffa1cc)
  rose: PALETTE.rose[500],
  roseText: PALETTE.rose[700],
  roseSoft: PALETTE.rose[100],

  error: PALETTE.red[500],
  errorSoft: PALETTE.red[100],

  text: PALETTE.gray[700],       // foreground #2d2c2b
  textMuted: PALETTE.gray[500],  // inherited-ink #4b4c4d
  white: '#FFFFFF',
} as const;

export const FONT_WEIGHT = {
  // Spoqa Han Sans Neo 실제 지원 굵기(400/500/700)에 맞춰 가짜 볼드(faux-bold) 방지
  regular: '400', // 본문 · 예문 해석 · 안내 문구 · 보조 캡션
  medium: '500',  // 칩 · 보조 버튼 · 배지 · 탭 라벨 · 발음 힌트
  bold: '700',    // 핵심 영단어 · 단어 뜻 · 섹션 제목 · 주요 CTA 버튼
} as const;

export const TYPOGRAPHY = {
  // 기본 본문 최소 18px 이상 (큰 글씨 가독성 원칙)
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
  tabBarHeight: 72,      // 누르기 편한 큼직한 하단 탭 바
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

export const SHADOW = {
  card: {
    shadowColor: '#2d2c2b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  header: {
    shadowColor: '#2d2c2b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  tabBar: {
    shadowColor: '#2d2c2b',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 8,
  },
} as const;
