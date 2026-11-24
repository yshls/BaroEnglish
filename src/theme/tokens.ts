
import { Platform } from 'react-native';

/**
 * BARO (바로영어) Design System
 *
 * Design Direction
 * - Clean & Playful
 * - Warm & Friendly
 * - Accessible & Encouraging
 *
 * Headspace-inspired custom color system
 *
 * Brand Primary : #FF4C4B
 * Background    : #F5F6F8
 * Foreground    : #2D2C2B
 *
 * Token Architecture
 * 1. Primitive Tokens
 * 2. Semantic Tokens
 * 3. Learning Domain Tokens
 */

// ============================================================
// 01. FONT FAMILY
// ============================================================

// 기존 앱에 등록된 폰트 이름 유지
export const FONT_FAMILY_NAME = 'SpokaHanSansNeo';

export const FONTS = {
  family:
    Platform.select({
      web: `'${FONT_FAMILY_NAME}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
      default: FONT_FAMILY_NAME,
    }) ?? FONT_FAMILY_NAME,
} as const;

// ============================================================
// 02. PRIMITIVE COLOR PALETTE
// ============================================================

export const PALETTE = {
  // Persimmon — 감귤빛 브랜드 주황
  brand: {
    100: '#FFF2E9',
    200: '#FFDDC7',
    300: '#FFC09B',
    400: '#FF965C',
    500: '#F56823',
    600: '#DB4F10',
    700: '#B53D0A',
  },

  // Ocean Blue — 선명한 파란색
  blue: {
    100: '#EDF6FF',
    200: '#D4E9FF',
    300: '#A8D2FF',
    400: '#65AEFA',
    500: '#2584E9',
    600: '#1568C9',
    700: '#104EA2',
  },

  // Fresh Leaf — 생기 있는 초록색
  green: {
    100: '#EBFCF0',
    200: '#CDF5D9',
    300: '#9AEAB2',
    400: '#55D982',
    500: '#20B856',
    600: '#119440',
    700: '#087333',
  },

  // Tropical Jade — 선명한 청록색
  teal: {
    100: '#E5FBF7',
    200: '#C2F5EB',
    300: '#89EBDD',
    400: '#43D8C6',
    500: '#00B4A0',
    600: '#009183',
    700: '#007065',
  },

  // Sunshine — 순수하고 밝은 노란색
  amber: {
    100: '#FFFBE5',
    200: '#FFF3B3',
    300: '#FFEA75',
    400: '#FFDF38',
    500: '#FFD000',
    600: '#DBAD00',
    700: '#927000',
  },

  // Golden Orange — 황금빛 오렌지
  orange: {
    100: '#FFF6E5',
    200: '#FFE9BD',
    300: '#FFD487',
    400: '#FFBB40',
    500: '#FF9F00',
    600: '#DC8100',
    700: '#AD6000',
    vividText: '#995000',
  },

  // Grape — 선명한 포도빛 보라색
  purple: {
    100: '#F7EFFF',
    200: '#EDDDFF',
    300: '#D9BBFF',
    400: '#BE8CF7',
    500: '#9854E8',
    600: '#7E37CD',
    700: '#6224A8',
  },

  // Iris — 푸른빛 보라색
  indigo: {
    100: '#EFF0FF',
    200: '#DFE2FF',
    300: '#BEC4FF',
    400: '#8D96FA',
    500: '#545FE7',
    600: '#3D47C9',
    700: '#2E37A8',
  },

  // Raspberry — 생기 있는 핑크색
  rose: {
    100: '#FFF0F7',
    200: '#FFDBED',
    300: '#FFB8DA',
    400: '#FF88BF',
    500: '#F552A0',
    600: '#DA3284',
    700: '#AB2466',
  },

  // True Red — 분홍빛 없는 선명한 빨간색
  red: {
    100: '#FFF0F0',
    200: '#FFD6D6',
    300: '#FFABAB',
    400: '#F76D6D',
    500: '#E52525',
    600: '#C91818',
    700: '#A51010',
  },

  // Warm Neutral — 따뜻한 크림과 뉴트럴
  gray: {
    50: '#FFFCF6', // 웜 화이트 (가장 밝은 뉴트럴)
    100: '#F5F6F8',
    200: '#F7F3EB',
    300: '#EAE5DC',
    400: '#D4CEC3',
    500: '#736E65',
    600: '#514C44',
    700: '#2D2924',
  },

  common: {
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
  },
} as const;
// ============================================================
// 03. SEMANTIC COLORS
// ============================================================

export const COLORS = {
  // ----------------------------------------------------------
  // Background & Surface
  // ----------------------------------------------------------

  background: PALETTE.gray[100],
  card: PALETTE.common.white,
  surface: PALETTE.gray[200],
  surfaceElevated: PALETTE.common.white,
  surfaceMuted: PALETTE.gray[200],

  border: PALETTE.gray[300],
  borderStrong: PALETTE.gray[400],
  divider: PALETTE.gray[300],

  // ----------------------------------------------------------
  // Brand
  // ----------------------------------------------------------

  primary: PALETTE.brand[500],
  primaryDark: PALETTE.brand[700],
  primaryLight: PALETTE.brand[300],
  primarySoft: PALETTE.brand[100],
  primaryForeground: PALETTE.gray[700],

  tint: PALETTE.brand[100],

  // ----------------------------------------------------------
  // Action
  // ----------------------------------------------------------

  // 선명한 브랜드 컬러 + 진한 텍스트
  action: PALETTE.brand[500],
  actionForeground: PALETTE.gray[700],

  // Pressed 상태에서도 충분한 텍스트 대비 확보
  actionPressed: PALETTE.brand[700],
  actionPressedForeground: PALETTE.common.white,

  // 흰색 텍스트가 필요한 주요 CTA
  actionSolid: PALETTE.brand[700],
  actionSolidForeground: PALETTE.common.white,
  actionSolidPressed: '#AA1E1D',

  // Secondary Action
  actionSecondary: PALETTE.brand[100],
  actionSecondaryForeground: PALETTE.brand[700],
  actionSecondaryPressed: PALETTE.brand[200],

  // ----------------------------------------------------------
  // Accent — 강세 · 리듬 (브랜드 코랄 단일 포인트 통일)
  // ----------------------------------------------------------

  accent: PALETTE.brand[500],
  accentText: PALETTE.brand[700],
  accentSoft: PALETTE.brand[100],

  // ----------------------------------------------------------
  // Success — 정답 · 완료 체크 (최소 시맨틱 용도)
  // ----------------------------------------------------------

  success: PALETTE.green[500],
  successText: PALETTE.green[700],
  successSoft: PALETTE.green[100],

  // ----------------------------------------------------------
  // Teal — 천천히 듣기 · 보조 버튼
  // ----------------------------------------------------------

  teal: PALETTE.teal[600],
  tealText: PALETTE.teal[700],
  tealSoft: PALETTE.teal[100],

  // ----------------------------------------------------------
  // Gold — 핵심 태그 · 배지 · 북마크
  // ----------------------------------------------------------

  gold: PALETTE.amber[500],
  goldText: PALETTE.amber[700],
  goldSoft: PALETTE.amber[100],

  // ----------------------------------------------------------
  // Purple — 따라 말하기 · IPA · 빠르게 듣기
  // ----------------------------------------------------------

  purple: PALETTE.purple[600],
  purpleText: PALETTE.purple[700],
  purpleSoft: PALETTE.purple[100],

  // ----------------------------------------------------------
  // Indigo — 예문 · 단어 뜻 · 추천 칩
  // ----------------------------------------------------------

  indigo: PALETTE.indigo[600],
  indigoText: PALETTE.indigo[700],
  indigoSoft: PALETTE.indigo[100],

  // ----------------------------------------------------------
  // Rose — 녹음 활성 · 주의
  // ----------------------------------------------------------

  rose: PALETTE.rose[500],
  roseText: PALETTE.rose[700],
  roseSoft: PALETTE.rose[100],

  // ----------------------------------------------------------
  // Error
  // ----------------------------------------------------------

  error: PALETTE.red[500],
  errorText: PALETTE.red[700],
  errorSoft: PALETTE.red[100],

  // ----------------------------------------------------------
  // Warning
  // ----------------------------------------------------------

  warning: PALETTE.amber[500],
  warningText: PALETTE.amber[700],
  warningSoft: PALETTE.amber[100],

  // ----------------------------------------------------------
  // Information
  // ----------------------------------------------------------

  info: PALETTE.blue[500],
  infoText: PALETTE.blue[700],
  infoSoft: PALETTE.blue[100],

  // ----------------------------------------------------------
  // Interaction
  // ----------------------------------------------------------

  focus: PALETTE.brand[700],

  selected: PALETTE.brand[100],
  selectedBorder: PALETTE.brand[500],
  selectedText: PALETTE.brand[700],

  disabled: PALETTE.gray[200],
  disabledText: PALETTE.gray[500],

  // ----------------------------------------------------------
  // Text
  // ----------------------------------------------------------

  text: PALETTE.gray[700],
  textSecondary: PALETTE.gray[600],
  textMuted: PALETTE.gray[500],
  textInverse: PALETTE.common.white,

  placeholder: PALETTE.gray[500],
  link: PALETTE.gray[700],

  // ----------------------------------------------------------
  // Common
  // ----------------------------------------------------------

  white: PALETTE.common.white,
  black: PALETTE.common.black,

  overlay: 'rgba(45, 44, 43, 0.40)',
  overlayLight: 'rgba(45, 44, 43, 0.16)',
  transparent: PALETTE.common.transparent,
} as const;

// ============================================================
// 04. LEARNING DOMAIN TOKENS
// ============================================================

export const LEARNING_COLORS = {
  // ----------------------------------------------------------
  // Playback Speed
  // ----------------------------------------------------------

  playback: {
    slow: {
      background: PALETTE.teal[100],
      foreground: PALETTE.teal[700],
      accent: PALETTE.teal[500],
      border: PALETTE.teal[300],
      activeBackground: PALETTE.teal[200],
    },

    normal: {
      background: PALETTE.brand[100],
      foreground: PALETTE.brand[700],
      accent: PALETTE.brand[500],
      border: PALETTE.brand[300],
      activeBackground: PALETTE.brand[200],
    },

    fast: {
      background: PALETTE.purple[100],
      foreground: PALETTE.purple[700],
      accent: PALETTE.purple[500],
      border: PALETTE.purple[300],
      activeBackground: PALETTE.purple[200],
    },
  },

  // ----------------------------------------------------------
  // Learning Difficulty
  // ----------------------------------------------------------

  difficulty: {
    beginner: {
      background: PALETTE.green[100],
      foreground: PALETTE.green[700],
      accent: PALETTE.green[500],
    },

    intermediate: {
      background: PALETTE.orange[100],
      foreground: PALETTE.orange.vividText,
      accent: PALETTE.orange[500],
    },

    advanced: {
      background: PALETTE.purple[100],
      foreground: PALETTE.purple[700],
      accent: PALETTE.purple[500],
    },
  },

  // ----------------------------------------------------------
  // Pronunciation & Stress
  // ----------------------------------------------------------

  pronunciation: {
    primaryStress: PALETTE.orange.vividText,
    primaryStressBackground: PALETTE.orange[100],

    secondaryStress: PALETTE.orange.vividText,
    secondaryStressBackground: PALETTE.orange[100],

    normal: COLORS.text,
    schwa: COLORS.textMuted,

    ipa: PALETTE.indigo[700],
    ipaBackground: PALETTE.indigo[100],
  },

  // ----------------------------------------------------------
  // Word Mastery
  // ----------------------------------------------------------

  mastery: {
    new: {
      background: PALETTE.blue[100],
      foreground: PALETTE.blue[700],
      accent: PALETTE.blue[500],
    },

    learning: {
      background: PALETTE.orange[100],
      foreground: PALETTE.orange.vividText,
      accent: PALETTE.orange[500],
    },

    mastered: {
      background: PALETTE.green[100],
      foreground: PALETTE.green[700],
      accent: PALETTE.green[500],
    },
  },

  // ----------------------------------------------------------
  // Learning Feedback
  // ----------------------------------------------------------

  feedback: {
    correct: {
      background: PALETTE.green[100],
      foreground: PALETTE.green[700],
      accent: PALETTE.green[500],
    },

    incorrect: {
      background: PALETTE.red[100],
      foreground: PALETTE.red[700],
      accent: PALETTE.red[500],
    },

    retry: {
      background: PALETTE.amber[100],
      foreground: COLORS.goldText,
      accent: PALETTE.amber[500],
    },

    completed: {
      background: PALETTE.green[200],
      foreground: PALETTE.green[700],
      accent: PALETTE.green[500],
    },
  },

  // ----------------------------------------------------------
  // Bookmark
  // ----------------------------------------------------------

  bookmark: {
    active: PALETTE.amber[500],
    inactive: COLORS.textMuted,
    background: PALETTE.amber[100],
    foreground: COLORS.goldText,
  },

  // ----------------------------------------------------------
  // Recording
  // ----------------------------------------------------------

  recording: {
    idle: COLORS.textMuted,
    active: PALETTE.red[500],
    background: PALETTE.red[100],
    foreground: PALETTE.red[700],
    waveform: PALETTE.brand[500],
  },

  // ----------------------------------------------------------
  // Learning Categories
  // ----------------------------------------------------------

  category: {
    basic: {
      background: PALETTE.amber[300],
      foreground: COLORS.text,
      accent: COLORS.goldText,
    },

    vocabulary: {
      background: PALETTE.green[200],
      foreground: COLORS.text,
      accent: PALETTE.green[700],
    },

    listening: {
      background: PALETTE.blue[200],
      foreground: COLORS.text,
      accent: PALETTE.blue[700],
    },

    speaking: {
      background: PALETTE.brand[200],
      foreground: COLORS.text,
      accent: PALETTE.brand[700],
    },

    pronunciation: {
      background: PALETTE.teal[200],
      foreground: COLORS.text,
      accent: PALETTE.teal[700],
    },

    sentence: {
      background: PALETTE.indigo[200],
      foreground: COLORS.text,
      accent: PALETTE.indigo[700],
    },

    aiTutor: {
      background: PALETTE.purple[200],
      foreground: COLORS.text,
      accent: PALETTE.purple[700],
    },

    review: {
      background: PALETTE.orange[200],
      foreground: COLORS.text,
      accent: PALETTE.orange.vividText,
    },

    progress: {
      background: PALETTE.rose[200],
      foreground: COLORS.text,
      accent: PALETTE.rose[700],
    },
  },
} as const;

// ============================================================
// 05. FONT WEIGHT
// ============================================================

export const FONT_WEIGHT = {
  regular: '400',
  medium: '500',
  bold: '700',
} as const;

// ============================================================
// 06. TYPOGRAPHY — FONT SIZE
// ============================================================

export const TYPOGRAPHY = {
  // 보조 정보
  caption: 12,

  // 일반 본문
  body: 14,
  bodyLarge: 16,
  label: 14,

  // 제목
  sectionTitle: 18,
  screenTitle: 22,
  display: 30,

  // 영어 단어
  word: 22,
  wordHero: 28,

  // 영어 문장
  sentence: 17,
  sentenceLarge: 19,

  // 발음기호
  ipa: 19,
  ipaLarge: 24,

  // 음절 및 강세
  syllablePrimary: 20,
  syllableNormal: 17,
  syllableSchwa: 14,

  // 버튼 및 네비게이션
  button: 15,
  tabLabel: 12,
} as const;

// ============================================================
// 07. LINE HEIGHT
// ============================================================

export const LINE_HEIGHT = {
  caption: 18,

  body: 21,
  bodyLarge: 24,
  label: 20,

  sectionTitle: 26,
  screenTitle: 30,
  display: 38,

  word: 30,
  wordHero: 36,

  sentence: 25,
  sentenceLarge: 28,

  ipa: 27,
  ipaLarge: 32,

  syllablePrimary: 28,
  syllableNormal: 24,
  syllableSchwa: 20,

  button: 22,
  tabLabel: 16,
} as const satisfies Record<keyof typeof TYPOGRAPHY, number>;

// ============================================================
// 08. LETTER SPACING
// ============================================================

export const LETTER_SPACING = {
  tight: -0.4,
  normal: 0,
  relaxed: 0.3,
  wide: 0.6,
} as const;

// ============================================================
// 09. COMPOSITE TEXT STYLES
// ============================================================

export const TEXT_STYLE = {
  caption: {
    fontFamily: FONTS.family,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: LINE_HEIGHT.caption,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.textMuted,
  },

  body: {
    fontFamily: FONTS.family,
    fontSize: TYPOGRAPHY.body,
    lineHeight: LINE_HEIGHT.body,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text,
  },

  bodyLarge: {
    fontFamily: FONTS.family,
    fontSize: TYPOGRAPHY.bodyLarge,
    lineHeight: LINE_HEIGHT.bodyLarge,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text,
  },

  label: {
    fontFamily: FONTS.family,
    fontSize: TYPOGRAPHY.label,
    lineHeight: LINE_HEIGHT.label,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.text,
  },

  sectionTitle: {
    fontFamily: FONTS.family,
    fontSize: TYPOGRAPHY.sectionTitle,
    lineHeight: LINE_HEIGHT.sectionTitle,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
  },

  screenTitle: {
    fontFamily: FONTS.family,
    fontSize: TYPOGRAPHY.screenTitle,
    lineHeight: LINE_HEIGHT.screenTitle,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
  },

  word: {
    fontFamily: FONTS.family,
    fontSize: TYPOGRAPHY.word,
    lineHeight: LINE_HEIGHT.word,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
  },

  wordHero: {
    fontFamily: FONTS.family,
    fontSize: TYPOGRAPHY.wordHero,
    lineHeight: LINE_HEIGHT.wordHero,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
  },

  ipa: {
    fontFamily: FONTS.family,
    fontSize: TYPOGRAPHY.ipa,
    lineHeight: LINE_HEIGHT.ipa,
    fontWeight: FONT_WEIGHT.medium,
    color: LEARNING_COLORS.pronunciation.ipa,
  },

  sentence: {
    fontFamily: FONTS.family,
    fontSize: TYPOGRAPHY.sentence,
    lineHeight: LINE_HEIGHT.sentence,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.text,
  },

  button: {
    fontFamily: FONTS.family,
    fontSize: TYPOGRAPHY.button,
    lineHeight: LINE_HEIGHT.button,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.actionForeground,
  },

  tabLabel: {
    fontFamily: FONTS.family,
    fontSize: TYPOGRAPHY.tabLabel,
    lineHeight: LINE_HEIGHT.tabLabel,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textMuted,
  },
} as const;

// ============================================================
// 10. TOUCH TARGET
// ============================================================

export const TOUCH = {
  minTarget: 48,
  recommendedHeight: 56,

  buttonSmall: 48,
  buttonMedium: 56,
  buttonLarge: 64,

  iconButton: 48,

  // Safe Area는 실제 레이아웃에서 별도 적용
  tabBarHeight: 72,
} as const;

// ============================================================
// 11. SPACING — 4dp Grid
// ============================================================

export const SPACING = {
  none: 0,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

// ============================================================
// 12. BORDER RADIUS
// ============================================================

export const RADIUS = {
  none: 0,
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,

  // Component Radius
  input: 16,
  button: 16,
  chip: 12,
  card: 24,
  modal: 28,
  sheet: 32,

  pill: 999,
} as const;

// ============================================================
// 13. BORDER WIDTH
// ============================================================

export const BORDER_WIDTH = {
  none: 0,
  thin: 1,
  medium: 1.5,
  thick: 2,
  focus: 3,
} as const;

// ============================================================
// 14. SHADOW
// ============================================================

export const SHADOW = {
  none: {
    shadowColor: COLORS.transparent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

  card: {
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },

  header: {
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  floating: {
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },

  tabBar: {
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },

  modal: {
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
} as const;

// ============================================================
// 15. MOTION
// ============================================================

export const MOTION = {
  duration: {
    instant: 80,
    fast: 150,
    normal: 240,
    slow: 360,
    celebration: 600,
  },

  spring: {
    gentle: {
      damping: 20,
      stiffness: 160,
      mass: 1,
    },

    playful: {
      damping: 14,
      stiffness: 220,
      mass: 0.8,
    },

    snappy: {
      damping: 22,
      stiffness: 300,
      mass: 0.8,
    },
  },

  scale: {
    pressed: 0.97,
    deepPress: 0.93, // 쫀득한 깊은 눌림 (버튼·칩 기본)
    normal: 1,
    emphasis: 1.05,
  },

  opacity: {
    hidden: 0,
    pressed: 0.85,
    visible: 1,
  },

  translate: {
    subtle: 4,
    small: 8,
    medium: 16,
    large: 24,
  },
} as const;

// ============================================================
// 16. OPACITY
// ============================================================

export const OPACITY = {
  hidden: 0,
  disabled: 0.5,
  muted: 0.65,
  pressed: 0.85,
  visible: 1,
} as const;

// ============================================================
// 17. ICON SIZE
// ============================================================

export const ICON_SIZE = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
} as const;

// ============================================================
// 18. LAYOUT
// ============================================================

export const LAYOUT = {
  screenPadding: SPACING.lg,
  cardPadding: SPACING.lg,

  sectionGap: SPACING['2xl'],
  itemGap: SPACING.sm,

  contentMaxWidth: 640,
  mobileFrameMaxWidth: 520,
  tabletMaxWidth: 960,

  headerHeight: 64,
  bottomBarHeight: TOUCH.tabBarHeight,
  floatingTabClearance: 104,
} as const;

// ============================================================
// 19. Z-INDEX
// ============================================================

export const Z_INDEX = {
  base: 0,
  elevated: 10,
  sticky: 20,
  header: 30,
  tabBar: 40,
  dropdown: 50,
  overlay: 100,
  modal: 110,
  toast: 120,
  tooltip: 130,
} as const;
