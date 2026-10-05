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

/**
 * Higher education final control types in Ukrainian university curriculum
 */
export const CONTROL_TYPES = {
  EXAM: 'exam',
  CREDIT: 'credit',
  DIFFERENTIATED_CREDIT: 'differentiated_credit',
} as const;

export type ControlType = (typeof CONTROL_TYPES)[keyof typeof CONTROL_TYPES];

/**
 * Traditional Ukrainian national grading scale marks (Karazin University)
 */
export const TRADITIONAL_GRADES = {
  EXCELLENT: 'відмінно',
  GOOD: 'добре',
  SATISFACTORY: 'задовільно',
  UNSATISFACTORY: 'незадовільно',
  PASSED: 'зараховано',
  FAILED: 'не зараховано',
} as const;

export type TraditionalGrade = (typeof TRADITIONAL_GRADES)[keyof typeof TRADITIONAL_GRADES];

/** ECTS Grade scale (European Credit Transfer and Accumulation System) */
export const ECTS_GRADES = ['A', 'B', 'C', 'D', 'E', 'Fx', 'F'] as const;

export type EctsGrade = (typeof ECTS_GRADES)[number];

/**
 * Input parameters for accumulated grade evaluation
 */
export interface GradeAccumulationParams {
  semesterScore: number;
  controlType?: ControlType;
  examScore?: number | null;
}

/**
 * Result of accumulated grade calculation according to university regulations
 */
export interface GradeAccumulationResult {
  totalScore: number;
  ectsGrade: EctsGrade;
  traditionalGrade: TraditionalGrade;
  isAdmittedToExam: boolean;
  isExamPassed: boolean;
  isCoursePassed: boolean;
  statusMessage: string;
}

/**
 * Exam target requirement for achieving a specific ECTS grade
 */
export interface ExamTargetRequirement {
  grade: EctsGrade;
  minTotalScore: number;
  requiredExamScore: number;
  isAchievable: boolean;
}
