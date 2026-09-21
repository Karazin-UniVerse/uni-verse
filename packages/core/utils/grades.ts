import {
  GRADES_THRESHOLD,
  MAX_EXAM,
  MAX_SEMESTER_CREDIT,
  MAX_SEMESTER_EXAM,
  MIN_EXAM_ADMISSION,
  MIN_EXAM_PASS,
  MIN_PASSING_SCORE,
} from '../constants/grades.ts';

/** ECTS Grade scale (European Credit Transfer and Accumulation System) */
export type EctsGrade = 'A' | 'B' | 'C' | 'D' | 'E' | 'Fx' | 'F';

/** Traditional Ukrainian national grading scale */
export type TraditionalGrade =
  'відмінно' | 'добре' | 'задовільно' | 'незадовільно' | 'зараховано' | 'не зараховано';

/** Final control types in higher education curriculum */
export type ControlType = 'exam' | 'credit' | 'differentiated_credit';

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
 * Calculates the traditional Ukrainian national grade based on Karazin University scale:
 * - For credit ('credit'):
 *   - >= 50: 'зараховано'
 *   - < 50: 'не зараховано'
 * - For exam ('exam') and differentiated credit ('differentiated_credit'):
 *   - 90..100: 'відмінно'
 *   - 70..89: 'добре'
 *   - 50..69: 'задовільно'
 *   - 0..49: 'незадовільно'
 */
export function calculateTraditionalGrade(
  score: number,
  controlType: ControlType = 'exam',
): TraditionalGrade {
  if (controlType === 'credit') {
    return score >= GRADES_THRESHOLD.SATISFACTORY ? 'зараховано' : 'не зараховано';
  }

  if (score >= GRADES_THRESHOLD.EXCELLENT) {
    return 'відмінно';
  }

  if (score >= GRADES_THRESHOLD.GOOD) {
    return 'добре';
  }

  if (score >= GRADES_THRESHOLD.SATISFACTORY) {
    return 'задовільно';
  }

  return 'незадовільно';
}

/**
 * Calculates final accumulated grade according to university regulations:
 * - For credit / differentiated credit: semester work is evaluated out of 100 points.
 * - For exam: semester work is evaluated out of 60 points, exam out of 40 points.
 *   - Admission threshold: >= 30 points in semester.
 *   - Passing exam threshold: >= 20 points in exam.
 *   - Total passing threshold: >= 50 points (Karazin scale: SATISFACTORY).
 */
export function calculateAccumulatedGrade(
  params: GradeAccumulationParams,
): GradeAccumulationResult {
  const { semesterScore: rawSemester, controlType = 'exam', examScore: rawExam } = params;

  if (controlType === 'credit' || controlType === 'differentiated_credit') {
    const totalScore = Math.max(0, Math.min(MAX_SEMESTER_CREDIT, Math.round(rawSemester)));
    const isCoursePassed = totalScore >= MIN_PASSING_SCORE;
    const ectsGrade = calculateEctsGrade(totalScore);
    const traditionalGrade = calculateTraditionalGrade(totalScore, controlType);

    return {
      totalScore,
      ectsGrade,
      traditionalGrade,
      isAdmittedToExam: true,
      isExamPassed: true,
      isCoursePassed,
      statusMessage: isCoursePassed
        ? 'Залік складено успішно'
        : 'Залік не складено (необхідно набрати мінімум 50 балів)',
    };
  }

  const semesterScore = Math.max(0, Math.min(MAX_SEMESTER_EXAM, Math.round(rawSemester)));
  const isAdmittedToExam = semesterScore >= MIN_EXAM_ADMISSION;

  if (!isAdmittedToExam) {
    return {
      totalScore: semesterScore,
      ectsGrade: calculateEctsGrade(semesterScore),
      traditionalGrade: 'незадовільно',
      isAdmittedToExam: false,
      isExamPassed: false,
      isCoursePassed: false,
      statusMessage: `Не допущено до екзамену: набрано ${semesterScore} з необхідних ${MIN_EXAM_ADMISSION} балів`,
    };
  }

  if (rawExam === undefined || rawExam === null) {
    return {
      totalScore: semesterScore,
      ectsGrade: calculateEctsGrade(semesterScore),
      traditionalGrade: 'незадовільно',
      isAdmittedToExam: true,
      isExamPassed: false,
      isCoursePassed: false,
      statusMessage: 'Допущено до екзамену. Очікується складання екзамену',
    };
  }

  const examScore = Math.max(0, Math.min(MAX_EXAM, Math.round(rawExam)));
  const isExamPassed = examScore >= MIN_EXAM_PASS;
  const totalScore = semesterScore + examScore;
  const isCoursePassed = isExamPassed && totalScore >= MIN_PASSING_SCORE;

  let statusMessage: string;

  if (!isExamPassed) {
    statusMessage = `Екзамен не складено: набрано ${examScore} з необхідних ${MIN_EXAM_PASS} балів`;
  } else if (!isCoursePassed) {
    statusMessage = `Дисципліну не складено: сумарний бал ${totalScore} нижче прохідного ${MIN_PASSING_SCORE}`;
  } else {
    statusMessage = 'Дисципліну успішно складено';
  }

  const ectsGrade = calculateEctsGrade(totalScore);
  const traditionalGrade = calculateTraditionalGrade(totalScore, 'exam');

  return {
    totalScore,
    ectsGrade,
    traditionalGrade,
    isAdmittedToExam: true,
    isExamPassed,
    isCoursePassed,
    statusMessage,
  };
}

/**
 * ECTS target tiers for exam score planning
 */
const ECTS_TARGETS: Array<{ grade: EctsGrade; minTotalScore: number }> = [
  { grade: 'A', minTotalScore: 90 },
  { grade: 'B', minTotalScore: 82 },
  { grade: 'C', minTotalScore: 74 },
  { grade: 'D', minTotalScore: 64 },
  { grade: 'E', minTotalScore: 60 },
];

/**
 * Calculates the required exam score to achieve each target ECTS grade.
 */
export function calculateExamTargets(semesterScore: number): ExamTargetRequirement[] {
  const clampedSemester = Math.max(0, Math.min(MAX_SEMESTER_EXAM, Math.round(semesterScore)));
  const isAdmittedToExam = clampedSemester >= MIN_EXAM_ADMISSION;

  return ECTS_TARGETS.map(({ grade, minTotalScore }) => {
    const rawRequired = minTotalScore - clampedSemester;
    const requiredExamScore = Math.max(MIN_EXAM_PASS, rawRequired);
    const isAchievable = isAdmittedToExam && requiredExamScore <= MAX_EXAM;

    return {
      grade,
      minTotalScore,
      requiredExamScore,
      isAchievable,
    };
  });
}
