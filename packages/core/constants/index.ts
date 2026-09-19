/**
 * Core constants for the Karazin UniVerse platform
 */

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

/** Maximum points allocated for semester work in an exam-based course */
export const MAX_SEMESTER_EXAM = 60;

/** Minimum semester points required to be admitted to the exam */
export const MIN_EXAM_ADMISSION = 30;

/** Maximum points allocated for the final exam */
export const MAX_EXAM = 40;

/** Minimum points required on the exam to pass */
export const MIN_EXAM_PASS = 20;

/** Maximum points allocated for credit / differentiated credit courses */
export const MAX_SEMESTER_CREDIT = 100;

/** Minimum overall score required to pass a course */
export const MIN_PASSING_SCORE = 60;
