/**
 * Standard responsive breakpoints (in pixels) matching design system SCSS tokens
 */
export const BREAKPOINTS = {
  xs: 480,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;
