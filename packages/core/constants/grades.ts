/**
 * Karazin University grading threshold boundaries (100-point scale):
 * - 90..100: відмінно (A)
 * - 70..89: добре (B, C)
 * - 50..69: задовільно / зараховано (D, E)
 * - 0..49: незадовільно / не зараховано (F / Fx)
 */
export const GRADES_THRESHOLD = {
  EXCELLENT: 90,
  GOOD: 70,
  SATISFACTORY: 50,
} as const;

export type GradesThreshold = (typeof GRADES_THRESHOLD)[keyof typeof GRADES_THRESHOLD];

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

/** Minimum overall score required to pass a course according to Karazin scale */
export const MIN_PASSING_SCORE = 50;
