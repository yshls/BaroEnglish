import { Platform } from 'react-native';




export const FONT_FAMILY_NAME = 'SpokaHanSansNeo';

export const FONTS = {
  family:
    Platform.select({
      web: `'${FONT_FAMILY_NAME}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
      default: FONT_FAMILY_NAME,
    }) ?? FONT_FAMILY_NAME,

export const PALETTE = {
  blue: {
    100: '#EBF5FF',
    200: '#D6E8FF',
    300: '#B0D0FF',
    400: '#6BA5F5',
    500: '#3182F6',
    600: '#1B64DA',
    700: '#0D4DAF',
  },
  orange: {
    100: '#FFF4EE',
    200: '#FFE4D6',
    300: '#FFCEB3',
    400: '#FF9A66',
    500: '#FF7733',
    600: '#E85C00',
    700: '#B54400',
  },
  red: {
    100: '#FFF0F0',
    200: '#FFD6D6',
    300: '#FFA8A8',
    400: '#FF6B6B',
    500: '#FA5252',
    600: '#E03131',
    700: '#C92A2A',
  },
  gray: {
    100: '#F8F9FA',
    200: '#F1F3F5',
    300: '#E9ECEF',
    400: '#ADB5BD',
    500: '#6B7280',
    600: '#495057',
    700: '#191F28',
  },
} as const;

export const COLORS = {
  background: PALETTE.gray[100],
  card: '#FFFFFF',
  border: PALETTE.gray[300],

  primary: PALETTE.blue[500],
  primaryDark: PALETTE.blue[700],
  tint: PALETTE.blue[100],

  accent: PALETTE.orange[600],
  accentText: PALETTE.orange[700],
  accentSoft: PALETTE.orange[100],

  error: PALETTE.red[600],
  errorSoft: PALETTE.red[100],

  text: PALETTE.gray[700],
  textMuted: PALETTE.gray[500],
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
