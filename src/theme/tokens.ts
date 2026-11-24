
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
  // Playful Coral
  // 브랜드 · 친근함 · 첫 도전
  brand: {
    100: '#FFF0F0',
    200: '#FFDADA',
    300: '#FFB8B7',
    400: '#FF8584',
    500: '#FF4C4B',
    600: '#E63837',
    700: '#C92625',
  },

  // Clear Sky
  // 정보 · 이해 · 학습
  blue: {
    100: '#EFF6FF',
    200: '#DBEAFF',
    300: '#B2D3FF',
    400: '#80B6FF',
    500: '#4D96FF',
    600: '#3075DE',
    700: '#245AB5',
  },

  // Fresh Green
  // 성장 · 성공 · 성취
  green: {
    100: '#E8FFF3',
    200: '#C5F9DF',
    300: '#8EF0BE',
    400: '#43DC96',
    500: '#00B368',
    600: '#009457',
    700: '#007A47',
  },

  // Fresh Mint
  // 천천히 듣기 · 편안함
  teal: {
    100: '#E8FCF9',
    200: '#C8F7F0',
    300: '#96EEE2',
    400: '#55DECE',
    500: '#20C4B5',
    600: '#009F92',
    700: '#007D74',
  },

  // Happy Sunshine
  // 즐거움 · 보상 · 북마크
  amber: {
    100: '#FFFBEA',
    200: '#FFF4C7',
    300: '#FFEA91',
    400: '#FFDF5C',
    500: '#FFD43B',
    600: '#DBAD16',
    700: '#A67B00',
  },

  // Sweet Tangerine
  // 강세 · 리듬 · 동기부여
  orange: {
    100: '#FFF4E9',
    200: '#FFE5CC',
    300: '#FFD0A3',
    400: '#FFB570',
    500: '#FF983D',
    600: '#E57920',
    700: '#B8590C',
    vividText: '#A84D08',
  },

  // Lovely Lavender
  // 따라 말하기 · 창의성 · AI
  purple: {
    100: '#F6F1FF',
    200: '#EDE3FF',
    300: '#D9C8FF',
    400: '#BDA5FF',
    500: '#9B7BF7',
    600: '#805BDF',
    700: '#6542BA',
  },

  // Bright Periwinkle
  // 예문 · 단어 뜻 · 집중
  indigo: {
    100: '#F0F2FF',
    200: '#E0E5FF',
    300: '#C2CBFF',
    400: '#939FFF',
    500: '#6374F5',
    600: '#4859D9',
    700: '#3646B5',
  },

  // Peachy Pink
  // 공감 · 격려 · 녹음 강조
  rose: {
    100: '#FFF1F7',
    200: '#FFE1ED',
    300: '#FFC8DE',
    400: '#FFACCB',
    500: '#FF91BA',
    600: '#E86B9B',
    700: '#BA4677',
  },

  // Clear Red
  // 오류 · 교정 · 주의
  red: {
    100: '#FFF1F1',
    200: '#FFDCDC',
    300: '#FFB6B6',
    400: '#FF8181',
    500: '#F04444',
    600: '#D52D2D',
    700: '#B51E1E',
  },

  // Clean Light Gray Neutral
  // 깔끔한 라이트 그레이 배경·보더 계열
  gray: {
    100: '#F5F6F8',
    200: '#ECEEF2',
    300: '#E1E4EA',
    400: '#C9CDD6',
    500: '#6B707A',
    600: '#4E525A',
    700: '#2D2C2B',
  },

  // Absolute Colors
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
  // Accent — 강세 · 리듬 · 중급 난이도
  // ----------------------------------------------------------

  accent: PALETTE.orange[500],
  accentText: PALETTE.orange.vividText,
  accentSoft: PALETTE.orange[100],

  // ----------------------------------------------------------
  // Success — 정답 · 익힘 · 초급
  // ----------------------------------------------------------

  success: PALETTE.green[500],
  successText: PALETTE.green[700],
  successSoft: PALETTE.green[100],

  // ----------------------------------------------------------
  // Teal — 천천히 듣기 · 0.6x
  // ----------------------------------------------------------

  teal: PALETTE.teal[500],
  tealText: PALETTE.teal[700],
  tealSoft: PALETTE.teal[100],

  // ----------------------------------------------------------
  // Gold — 북마크 · 즐겨찾기 · 보상
  // ----------------------------------------------------------

  gold: PALETTE.amber[500],
  goldText: '#805C00',
  goldSoft: PALETTE.amber[100],

  // ----------------------------------------------------------
  // Purple — 따라 말하기 · 빠르게 듣기
  // ----------------------------------------------------------

  purple: PALETTE.purple[500],
  purpleText: PALETTE.purple[700],
  purpleSoft: PALETTE.purple[100],

  // ----------------------------------------------------------
  // Indigo — 예문 · 단어 뜻 · 추천
  // ----------------------------------------------------------

  indigo: PALETTE.indigo[500],
  indigoText: PALETTE.indigo[700],
  indigoSoft: PALETTE.indigo[100],

  // ----------------------------------------------------------
  // Rose — 녹음 강조 · 공감
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
  warningText: '#805C00',
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
  link: PALETTE.blue[700],

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
  tabletMaxWidth: 960,

  headerHeight: 64,
  bottomBarHeight: TOUCH.tabBarHeight,
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
