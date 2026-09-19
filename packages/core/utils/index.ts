import type {
  ControlType,
  EctsGrade,
  ExamTargetRequirement,
  GradeAccumulationParams,
  GradeAccumulationResult,
  TraditionalGrade,
} from '../types/index.ts';
import {
  MAX_EXAM,
  MAX_SEMESTER_CREDIT,
  MAX_SEMESTER_EXAM,
  MIN_EXAM_ADMISSION,
  MIN_EXAM_PASS,
  MIN_PASSING_SCORE,
} from '../constants/index.ts';

/**
 * Calculates the ECTS letter grade based on a 100-point scale:
 * - >= 90: 'A'
 * - >= 82: 'B'
 * - >= 74: 'C'
 * - >= 64: 'D'
 * - >= 60: 'E'
 * - >= 35: 'Fx'
 * - < 35: 'F'
 */
export function calculateEctsGrade(score: number): EctsGrade {
  if (score >= 90) {
    return 'A';
  }

  if (score >= 82) {
    return 'B';
  }

  if (score >= 74) {
    return 'C';
  }

  if (score >= 64) {
    return 'D';
  }

  if (score >= 60) {
    return 'E';
  }

  if (score >= 35) {
    return 'Fx';
  }

  return 'F';
}

/**
 * Calculates the traditional Ukrainian national grade based on score and control type:
 * - For credit ('credit'):
 *   - >= 60: 'зараховано'
 *   - < 60: 'не зараховано'
 * - For exam ('exam') and differentiated credit ('differentiated_credit'):
 *   - >= 90: 'відмінно'
 *   - >= 74: 'добре'
 *   - >= 60: 'задовільно'
 *   - < 60: 'незадовільно'
 */
export function calculateTraditionalGrade(
  score: number,
  controlType: ControlType = 'exam',
): TraditionalGrade {
  if (controlType === 'credit') {
    return score >= 60 ? 'зараховано' : 'не зараховано';
  }

  if (score >= 90) {
    return 'відмінно';
  }

  if (score >= 74) {
    return 'добре';
  }

  if (score >= 60) {
    return 'задовільно';
  }

  return 'незадовільно';
}

/**
 * Calculates the accumulated course grade based on university credit-modular regulations.
 */
export function calculateAccumulatedGrade(
  params: GradeAccumulationParams,
): GradeAccumulationResult {
  const controlType: ControlType = params.controlType ?? 'exam';
  const rawSemester = Number.isFinite(params.semesterScore) ? params.semesterScore : 0;

  if (controlType === 'credit' || controlType === 'differentiated_credit') {
    const totalScore = Math.max(0, Math.min(MAX_SEMESTER_CREDIT, Math.round(rawSemester)));
    const isCoursePassed = totalScore >= MIN_PASSING_SCORE;
    const ectsGrade = calculateEctsGrade(totalScore);
    const traditionalGrade = calculateTraditionalGrade(totalScore, controlType);

    const statusMessage = isCoursePassed
      ? controlType === 'credit'
        ? 'Зараховано за результатами семестру'
        : 'Диференційований залік складено'
      : controlType === 'credit'
        ? 'Не зараховано (необхідно мін. 60 б.)'
        : 'Не складено (необхідно мін. 60 б.)';

    return {
      totalScore,
      ectsGrade,
      traditionalGrade,
      isAdmittedToExam: true,
      isExamPassed: true,
      isCoursePassed,
      statusMessage,
    };
  }

  // Exam control type
  const semesterScore = Math.max(0, Math.min(MAX_SEMESTER_EXAM, Math.round(rawSemester)));
  const isAdmittedToExam = semesterScore >= MIN_EXAM_ADMISSION;
  const rawExam = params.examScore;
  const hasExamScore = rawExam !== null && rawExam !== undefined && !Number.isNaN(rawExam);

  if (!isAdmittedToExam) {
    const missingPoints = MIN_EXAM_ADMISSION - semesterScore;

    return {
      totalScore: semesterScore,
      ectsGrade: calculateEctsGrade(semesterScore),
      traditionalGrade: 'незадовільно',
      isAdmittedToExam: false,
      isExamPassed: false,
      isCoursePassed: false,
      statusMessage: `Не допущено до іспиту (бракує ${missingPoints} б. для допуску)`,
    };
  }

  if (!hasExamScore) {
    return {
      totalScore: semesterScore,
      ectsGrade: calculateEctsGrade(semesterScore),
      traditionalGrade: 'незадовільно',
      isAdmittedToExam: true,
      isExamPassed: false,
      isCoursePassed: false,
      statusMessage: 'Допущено до іспиту (очікується складання екзамену)',
    };
  }

  const examScore = Math.max(0, Math.min(MAX_EXAM, Math.round(rawExam)));
  const isExamPassed = examScore >= MIN_EXAM_PASS;
  const totalScore = Math.min(100, semesterScore + examScore);

  if (!isExamPassed) {
    return {
      totalScore,
      ectsGrade: 'Fx',
      traditionalGrade: 'незадовільно',
      isAdmittedToExam: true,
      isExamPassed: false,
      isCoursePassed: false,
      statusMessage: 'Іспит не складено (менше 20 б. на екзамені)',
    };
  }

  const isCoursePassed = totalScore >= MIN_PASSING_SCORE;
  const ectsGrade = calculateEctsGrade(totalScore);
  const traditionalGrade = calculateTraditionalGrade(totalScore, 'exam');

  return {
    totalScore,
    ectsGrade,
    traditionalGrade,
    isAdmittedToExam: true,
    isExamPassed: true,
    isCoursePassed,
    statusMessage: 'Іспит успішно складено',
  };
}

/**
 * Calculates minimum exam points required for each passing ECTS grade (A, B, C, D, E).
 */
export function calculateExamTargets(semesterScore: number): ExamTargetRequirement[] {
  const clampedSemester = Math.max(0, Math.min(MAX_SEMESTER_EXAM, Math.round(semesterScore)));
  const isAdmittedToExam = clampedSemester >= MIN_EXAM_ADMISSION;

  const targets: Array<{ grade: EctsGrade; minTotalScore: number }> = [
    { grade: 'A', minTotalScore: 90 },
    { grade: 'B', minTotalScore: 82 },
    { grade: 'C', minTotalScore: 74 },
    { grade: 'D', minTotalScore: 64 },
    { grade: 'E', minTotalScore: 60 },
  ];

  return targets.map(({ grade, minTotalScore }) => {
    const rawNeeded = minTotalScore - clampedSemester;
    const requiredExamScore = Math.max(MIN_EXAM_PASS, rawNeeded);
    const isAchievable = isAdmittedToExam && requiredExamScore <= MAX_EXAM;

    return {
      grade,
      minTotalScore,
      requiredExamScore,
      isAchievable,
    };
  });
}
