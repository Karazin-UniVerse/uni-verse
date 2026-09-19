/**
 * @universe/types
 * Core domain models, shared contracts, and types
 * for the Karazin UniVerse platform (UniHub, NestJS Gateway, Moodle LMS).
 */

import { BREAKPOINTS } from '../constants/index.ts';

/** ECTS Grade scale (European Credit Transfer and Accumulation System) */
export type EctsGrade = 'A' | 'B' | 'C' | 'D' | 'E' | 'Fx' | 'F';

/** Traditional Ukrainian national grading scale */
export type TraditionalGrade =
  'відмінно' | 'добре' | 'задовільно' | 'незадовільно' | 'зараховано' | 'не зараховано';

/** Final control types in higher education curriculum */
export type ControlType = 'exam' | 'credit' | 'differentiated_credit';

export type Breakpoint = keyof typeof BREAKPOINTS;

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

// Re-export constants and calculation utilities for convenience and backwards compatibility
export * from '../constants/index.ts';
export * from '../utils/index.ts';
