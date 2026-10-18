import type { ControlType } from '../constants/grades.ts';
import type { CourseModuleName } from '../constants/moodle.ts';

export interface MoodleCourse {
  id: number;
  fullname: string;
  shortname?: string;
  summary?: string;
  progress?: number | null;
  year?: number | null;
  semester?: number | null;
}

export type GradeValue = string | number | null;

export interface Grade {
  grade: string;
  courseId?: number;
  courseName?: string;
  rawGrade?: GradeValue;
  year?: string | null;
  semester?: number | null;
  controlType?: ControlType;
  currentScore?: number | null;
  examScore?: number | null;
  totalScore?: number | null;
  credits?: number;
}

export interface Assignment {
  id: number;
  courseName: string;
  name: string;
  duedate: number;
  description: string;
  year?: string | null;
  semester?: number | null;
  submissionStatus?: string;
  grade?: string | null;
  graded?: boolean;
  submittedAt?: number | null;
  isLate?: boolean;
}

export interface SubmissionStatus {
  status: string;
  grade?: string;
  submittedAt?: number;
  isLate?: boolean;
}

export interface UploadedFile {
  itemid?: number;
}

export interface MoodleEvent {
  id: number;
  name: string;
  timestart: number;
  eventtype: string;
  description?: string;
  courseName?: string;
  timeduration?: number;
  formattedtime?: string;
  url?: string;
}

export interface Notification {
  id: number | string;
  subject: string;
  timecreated: number;
  read: boolean;
  message?: string;
  fullmessage?: string;
}

export interface NotificationsResponse {
  notifications?: Notification[];
  unreadcount?: number;
  unreadCount?: number;
}

export interface CourseStatistics {
  total: number;
}

export interface CourseModuleFile {
  filename?: string;
  fileurl?: string;
  filesize?: number;
  timecreated?: number;
  timemodified?: number;
  mimetype?: string;
}

export interface CourseModule {
  id: number;
  name: string;
  modname: CourseModuleName;
  url?: string;
  description?: string;
  instance?: number;
  contents?: CourseModuleFile[];
  duedate?: number;
  dueUnixSec?: number;
}

export interface CourseSection {
  id: number;
  name: string;
  summary: string;
  modules: CourseModule[];
}
