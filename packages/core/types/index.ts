/**
 * @universe/types
 * Core domain models, shared contracts, and type declarations
 * for the Karazin UniVerse platform (UniHub, NestJS Gateway, Moodle LMS).
 */

import type { ControlType, EctsGrade, TraditionalGrade } from '../constants/grades.ts';

/** Submission workflow status for academic assignments */
export type AssignmentSubmissionStatus = 'new' | 'draft' | 'submitted' | 'graded' | 'overdue';

/** Types of academic schedule events */
export type ScheduleEventType =
  'lecture' | 'lab' | 'practice' | 'seminar' | 'consultation' | 'exam';

/**
 * Curriculum course item within the individual academic plan
 */
export interface CurriculumItem {
  id: number;
  code: string;
  name: string;
  shortName: string;
  credits: number;
  semester: number;
  academicYear: string;
  controlType: ControlType;
  instructors: Array<{
    name: string;
    id?: number | string;
    email?: string;
    role?: string;
  }>;
  status: 'not_started' | 'in_progress' | 'completed';
  fullname?: string;
  shortname?: string;
  description?: string;
  cycle?: 'general' | 'professional' | 'elective';
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
  duedate: number;
  submissionStatus: AssignmentSubmissionStatus;
  description?: string;
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
  title: string;
  type: ScheduleEventType;
  instructor: string;
  location: string;
  startTime: string;
  endTime: string;
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  courseId?: number;
  onlineLink?: string;
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
  userTokenValid: boolean;
  latencyMs?: number;
  userId?: string | number;
}
