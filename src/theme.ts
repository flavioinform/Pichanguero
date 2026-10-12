export const colors = {
  bg: '#0a0a0c',
  accent: '#2fae4c',
  accentLight: '#4cd964',
  accentDark: '#23913c',
  white: '#ffffff',
  textPrimary: '#f5f5f5',
  textSecondary: '#c7c7cc',
  textMuted: '#9a9a9e',
  textFooter: '#8a8a8e',
  textDim: '#6f6f74',
  iconLateral: '#b8b8bc',
  /** errors, "you can't do that", losing states */
  danger: '#e05a5a',
  /** time running out, heads-up messages */
  warning: '#e0c15a',
  /** dark panels that sit on top of photo backgrounds */
  surface: 'rgba(12,12,14,0.9)',
  surfaceRaised: 'rgba(18,18,20,0.8)',
  /** hairlines on dark surfaces, from faint to prominent */
  borderFaint: 'rgba(255,255,255,0.12)',
  border: 'rgba(255,255,255,0.15)',
  borderStrong: 'rgba(255,255,255,0.25)',
} as const;

/** 1px grid line used by the table-style boards (Tutti, category picker). */
export const GRID_LINE = `1px solid ${colors.border}`;

export const fonts = {
  display: "'Anton', sans-serif",
  body: "'Manrope', sans-serif",
} as const;
