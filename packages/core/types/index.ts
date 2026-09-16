/**
 * @universe/types
 * Core domain models, shared contracts, and grade calculation utilities
 * for the Karazin UniVerse platform (UniHub, NestJS Gateway, Moodle LMS).
 */

/** ECTS Grade scale (European Credit Transfer and Accumulation System) */
export type EctsGrade = 'A' | 'B' | 'C' | 'D' | 'E' | 'Fx' | 'F';

/** Traditional Ukrainian national grading scale */
export type TraditionalGrade =
  'відмінно' | 'добре' | 'задовільно' | 'незадовільно' | 'зараховано' | 'не зараховано';

/** Final control types in higher education curriculum */
export type ControlType = 'exam' | 'credit' | 'differentiated_credit';

/** Academic status of a student */
export type StudentAcademicStatus = 'active' | 'academic_leave' | 'expelled' | 'graduated';

/** Submission workflow status for academic assignments */
export type AssignmentSubmissionStatus = 'new' | 'draft' | 'submitted' | 'graded' | 'overdue';

/** Types of academic schedule events */
export type ScheduleEventType =
  'lecture' | 'lab' | 'practice' | 'seminar' | 'consultation' | 'exam';

/**
 * Complete student profile model for the E-Dean's office
 */
export interface StudentProfile {
  id: string | number;
  moodleId: number | string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  studentCardNumber: string;
  recordBookNumber: string;
  faculty: string;
  department: string;
  specialty: string;
  educationalProgram: string;
  degree: 'bachelor' | 'master' | 'phd';
  course: number;
  group: string;
  studyForm: 'full-time' | 'part-time';
  financing: 'budget' | 'contract';
  status: StudentAcademicStatus;
  gpa: number;
  totalCreditsEarned: number;
  academicStanding: 'honors' | 'good' | 'warning' | 'probation';
}

/**
 * Curriculum course item within the individual academic plan
 */
export interface CurriculumItem {
  id: number;
  code: string;
  name: string;
  shortName: string;
  fullname?: string;
  shortname?: string;
  description?: string;
  credits: number;
  semester: number;
  academicYear: string;
  cycle?: 'general' | 'professional' | 'elective';
  controlType: ControlType;
  instructors: Array<{
    id?: number | string;
    name: string;
    email?: string;
    role?: string;
  }>;
  status: 'not_started' | 'in_progress' | 'completed';
  progress?: number;
  moodleCourseId?: number;
  moodleUrl?: string;
  hours?: {
    total: number;
    lectures: number;
    practicals: number;
    labs: number;
    selfStudy: number;
  };
}

/**
 * Canonical alias for CurriculumItem
 */
export type Course = CurriculumItem;

/**
 * Single grade record entry in the student digital gradebook (StudentRecordBook)
 */
export interface StudentRecordBookItem {
  id: string | number;
  courseId: number;
  courseName: string;
  courseCode?: string;
  credits?: number;
  semester?: number;
  academicYear?: string;
  controlType?: ControlType;
  currentScore?: number | null;
  examScore?: number | null;
  totalScore?: number | null;
  ectsGrade?: EctsGrade | null;
  traditionalGrade?: TraditionalGrade | null;
  date?: string;
  instructorName?: string;
  isPassed?: boolean | null;
  rawGrade?: string | number | null;
}

/**
 * Canonical alias for StudentRecordBookItem
 */
export type GradeRecord = StudentRecordBookItem;

/**
 * Academic assignment item with deadlines, feedback, and submission tracking
 */
export interface AssignmentItem {
  id: number;
  courseId: number;
  courseName: string;
  name: string;
  description?: string;
  duedate: number;
  submissionStatus: AssignmentSubmissionStatus;
  gradingStatus?: 'not_graded' | 'graded';
  grade?: string | number | null;
  maxGrade?: number;
  feedback?: string;
  year?: string | null;
  semester?: number | null;
  duedateIso?: string;
  attachments?: Array<{ name: string; url: string; size?: number }>;
}

/**
 * Academic timetable item for schedule grid views
 */
export interface ScheduleItem {
  id: string | number;
  courseId?: number;
  title: string;
  type: ScheduleEventType;
  instructor: string;
  location: string;
  onlineLink?: string;
  startTime: string;
  endTime: string;
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  weekType?: 'all' | 'numerator' | 'denominator';
  date?: string;
}

/**
 * LMS Moodle connection and synchronization status model
 */
export interface LmsConnectionStatus {
  host: string;
  isConnected: boolean;
  status: 'online' | 'offline' | 'degraded' | 'syncing';
  lastSyncTimestamp: number | string;
  latencyMs?: number;
  userId?: string | number;
  userTokenValid: boolean;
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

/**
 * Parameters for calculating accumulated course grades
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
 * Calculates the accumulated course grade based on university credit-modular regulations.
 *
 * Rules:
 * - Exam ('exam'):
 *   - Semester score max 60 points. Admission requires at least 30 points.
 *   - If semesterScore < 30: student is not admitted, exam cannot be taken, course failed.
 *   - Exam score max 40 points. Passing the exam requires at least 20 points.
 *   - If examScore < 20: exam failed (Fx / незадовільно) regardless of total points.
 *   - If admitted and exam passed: totalScore = semesterScore + examScore.
 *   - If exam not yet taken (examScore is null/undefined): totalScore = semesterScore.
 * - Credit ('credit') & Differentiated Credit ('differentiated_credit'):
 *   - Semester score max 100 points.
 *   - Total score = semesterScore.
 *   - Passing score >= 60.
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
 *
 * Requirements per grade:
 * - A: >= 90 points
 * - B: >= 82 points
 * - C: >= 74 points
 * - D: >= 64 points
 * - E: >= 60 points
 *
 * Each target requires at least MIN_EXAM_PASS (20) points and at most MAX_EXAM (40) points.
 * If requiredExamScore > MAX_EXAM (40), isAchievable is false.
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
