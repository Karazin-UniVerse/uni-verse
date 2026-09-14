import {
  calculateAccumulatedGrade,
  calculateExamTargets,
  MAX_EXAM,
  MAX_SEMESTER_CREDIT,
  MAX_SEMESTER_EXAM,
  MIN_EXAM_ADMISSION,
  MIN_EXAM_PASS,
  MIN_PASSING_SCORE,
  type ControlType,
  type ExamTargetRequirement,
  type GradeAccumulationParams,
  type GradeAccumulationResult,
} from '@core/types';

export {
  calculateAccumulatedGrade,
  calculateExamTargets,
  MAX_EXAM,
  MAX_SEMESTER_CREDIT,
  MAX_SEMESTER_EXAM,
  MIN_EXAM_ADMISSION,
  MIN_EXAM_PASS,
  MIN_PASSING_SCORE,
};

export type {
  ControlType,
  ExamTargetRequirement,
  GradeAccumulationParams,
  GradeAccumulationResult,
};

/**
 * Clamps a numerical value between min and max bounds.
 */
export function clampScore(n: number, min = 0, max = 100): number {
  if (Number.isNaN(n) || !Number.isFinite(n)) {
    return min;
  }

  return Math.min(max, Math.max(min, n));
}

/**
 * Calculates the simulated final grade based on the university's accumulation system.
 * - For exams: total = semester points (max 60) + exam points (max 40)
 * - For credits: total = semester points (max 100)
 */
export function computeSimulatedFinal(
  semesterScore: number | null | undefined,
  examScoreOrRemaining: number | number[] | null | undefined = 0,
  controlType: ControlType = 'exam',
): number {
  const safeSemester = clampScore(
    semesterScore ?? 0,
    0,
    controlType === 'exam' ? MAX_SEMESTER_EXAM : MAX_SEMESTER_CREDIT,
  );

  if (controlType === 'credit' || controlType === 'differentiated_credit') {
    if (Array.isArray(examScoreOrRemaining) && examScoreOrRemaining.length > 0) {
      const remainingSum = examScoreOrRemaining.reduce(
        (acc, val) => acc + clampScore(val, 0, 100),
        0,
      );
      const avg = remainingSum / examScoreOrRemaining.length;

      return Math.min(
        MAX_SEMESTER_CREDIT,
        Math.round(safeSemester + (avg * (MAX_SEMESTER_CREDIT - safeSemester)) / 100),
      );
    }

    return safeSemester;
  }

  // Exam
  const examPoints =
    typeof examScoreOrRemaining === 'number' ? clampScore(examScoreOrRemaining, 0, MAX_EXAM) : 0;

  const result = calculateAccumulatedGrade({
    semesterScore: safeSemester,
    controlType: 'exam',
    examScore: examPoints,
  });

  return result.totalScore;
}
