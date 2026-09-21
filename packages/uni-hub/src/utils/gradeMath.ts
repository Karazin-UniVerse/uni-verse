import { MAX_EXAM, MAX_SEMESTER_CREDIT, MAX_SEMESTER_EXAM } from '@core/constants/grades';
import { calculateAccumulatedGrade, type ControlType } from '@core/utils/grades';

/**
 * Clamps a numerical value between min and max bounds.
 */
export function clampScore(score: number, min = 0, max = 100): number {
  if (Number.isNaN(score) || !Number.isFinite(score)) {
    return min;
  }

  return Math.min(max, Math.max(min, score));
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
        (accumulator, currentScore) => accumulator + clampScore(currentScore, 0, 100),
        0,
      );
      const averagePercent = remainingSum / examScoreOrRemaining.length;

      return Math.min(
        MAX_SEMESTER_CREDIT,
        Math.round(safeSemester + (averagePercent * (MAX_SEMESTER_CREDIT - safeSemester)) / 100),
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
