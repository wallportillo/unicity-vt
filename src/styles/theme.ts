/**
 * Theme - TypeScript Design Tokens
 * Unicity Support Portal Design System
 */

export const colors = {
  // Primary - Navy Blue
  primary: {
    900: '#1E3A5F',
    800: '#234B77',
    700: '#2D5A87',
    600: '#3B6B9A',
    500: '#2563EB',
    400: '#60A5FA',
    300: '#93C5FD',
    200: '#BFDBFE',
    100: '#DBEAFE',
    50: '#EFF6FF',
  },

  // Neutral - Slate
  neutral: {
    900: '#1E293B',
    800: '#1E293B',
    700: '#334155',
    600: '#475569',
    500: '#64748B',
    400: '#94A3B8',
    300: '#CBD5E1',
    200: '#E2E8F0',
    100: '#F1F5F9',
    50: '#F8FAFC',
  },

  // Semantic
  surface: '#FFFFFF',
  background: '#F0F4F8',
  border: '#CBD5E1',

  // Status
  error: '#DC2626',
  errorLight: '#FEE2E2',
  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#D97706',
  warningLight: '#FEF3C7',
} as const;

export const typography = {
  fontFamily: {
    sans: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'Fira Code', 'Consolas', monospace",
  },

  fontSize: {
    xs: '11px',
    sm: '12px',
    base: '14px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
  },

  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.625,
  },
} as const;

export const text = {
  h1: {
    size: typography.fontSize['2xl'],
    weight: typography.fontWeight.bold,
    lineHeight: typography.lineHeight.tight,
  },
  h2: {
    size: typography.fontSize.xl,
    weight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.tight,
  },
  h3: {
    size: typography.fontSize.lg,
    weight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.tight,
  },
  body: {
    size: typography.fontSize.base,
    weight: typography.fontWeight.normal,
    lineHeight: typography.lineHeight.normal,
  },
  label: {
    size: typography.fontSize.base,
    weight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.normal,
  },
  small: {
    size: typography.fontSize.sm,
    weight: typography.fontWeight.normal,
    lineHeight: typography.lineHeight.normal,
  },
  caption: {
    size: typography.fontSize.xs,
    weight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.tight,
  },
} as const;

export const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
} as const;

export const radius = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
} as const;

export const shadow = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
} as const;

export const transition = {
  fast: '150ms ease',
  normal: '200ms ease',
  slow: '300ms ease',
} as const;

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  modal: 300,
  tooltip: 400,
} as const;

// Theme object for convenience
export const theme = {
  colors,
  typography,
  text,
  spacing,
  radius,
  shadow,
  transition,
  zIndex,
} as const;

export type Theme = typeof theme;
export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type Radius = typeof radius;
