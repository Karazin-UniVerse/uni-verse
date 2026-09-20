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
