export const APP_THEMES = [
  'light',
  'dark',
  'cyberpunk',
  'karazinClassic',
  'universeSpace',
  'karazinGold',
] as const;

export type AppTheme = (typeof APP_THEMES)[number];

export const THEME_COLOR_SCHEME: Record<AppTheme, 'light' | 'dark'> = {
  light: 'light',
  dark: 'dark',
  cyberpunk: 'dark',
  karazinClassic: 'light',
  universeSpace: 'dark',
  karazinGold: 'dark',
};
