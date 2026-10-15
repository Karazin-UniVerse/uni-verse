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
  courseId?: number;
  courseName?: string;
  course_name?: string;
  grade: string;
  rawGrade?: GradeValue;
  rawgrade?: GradeValue;
  year?: GradeValue;
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
  description?: string;
  courseName?: string;
  timestart: number;
  timeduration?: number;
  formattedtime?: string;
  eventtype: string;
  url?: string;
}

export interface Notification {
  id: number;
  subject: string;
  fullmessage?: string;
  timecreated: number;
  read: boolean;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadcount: number;
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
  url?: string;
  name: string;
  modname: CourseModuleName;
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
