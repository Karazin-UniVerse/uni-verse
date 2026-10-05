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
 * Projects a semester score based on the base semester score, max allowed semester score,
 * and the scores (percentages 0-100) of remaining assignments.
 */
export function projectSemesterWithAssignments(
  baseSemester: number,
  maxSemester: number,
  assignmentPercentages: number[],
): number {
  if (!Array.isArray(assignmentPercentages) || assignmentPercentages.length === 0) {
    return baseSemester;
  }

  const sum = assignmentPercentages.reduce(
    (accumulator, score) => accumulator + clampScore(score, 0, 100),
    0,
  );
  const averagePercent = sum / assignmentPercentages.length;

  return Math.min(
    maxSemester,
    Math.round(baseSemester + (averagePercent * (maxSemester - baseSemester)) / 100),
  );
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
      return projectSemesterWithAssignments(
        safeSemester,
        MAX_SEMESTER_CREDIT,
        examScoreOrRemaining,
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
