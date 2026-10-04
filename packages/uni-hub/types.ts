import type { ControlType } from '@core/utils/grades';

export interface Course {
  id: number;
  fullname: string;
  shortname: string;
  summary: string;
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
  year?: number | null;
  semester?: number | null;
  submissionStatus?: string;
  grade?: string | null;
  graded?: boolean;
  submittedAt?: number | null;
  isLate?: boolean;
}

export interface MoodleEvent {
  id: number;
  name: string;
  description: string;
  courseName: string;
  timestart: number;
  formattedtime: string;
  eventtype: string;
  url?: string;
}

export interface Notification {
  id: number;
  subject: string;
  message: string;
  timecreated: number;
  read: boolean;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

export interface AuthResponse {
  access_token?: string;
  refresh_token?: string;
  token?: string;
  userID?: string;
}

export interface CourseStatistics {
  total: number;
}

export const COURSE_MODULE_NAMES = {
  RESOURCE: 'resource',
  FOLDER: 'folder',
  ASSIGN: 'assign',
  QUIZ: 'quiz',
  FORUM: 'forum',
} as const;

export type CourseModuleName =
  (typeof COURSE_MODULE_NAMES)[keyof typeof COURSE_MODULE_NAMES] | (string & {});

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

export type OpportunityStatus =
  | 'DRAFT'
  | 'READY_FOR_REVIEW'
  | 'REQUIRES_CHANGES'
  | 'PUBLISHED'
  | 'REJECTED';

export type OpportunityLifecycle = 'START' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export type OpportunityPaymentType = 'PAID' | 'UNPAID';

export type OpportunityAppStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'WITHDRAWN';

export interface OpportunityOwner {
  id: string;
  name?: string | null;
  email: string;
}

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  ownerContactInfo: string;
  status: OpportunityStatus;
  lifecycleState: OpportunityLifecycle;
  paymentType: OpportunityPaymentType;
  paymentDetails?: string | null;
  moderationComment?: string | null;
  ownerId: string;
  owner?: OpportunityOwner;
  createdAt: string;
  updatedAt: string;
  applications?: OpportunityApplication[];
}

export interface OpportunityApplication {
  id: string;
  applicantName: string;
  contactInfo: string;
  motivation?: string | null;
  briefDescription?: string | null;
  answers?: string | null;
  status: OpportunityAppStatus;
  ownerComment?: string | null;
  opportunityId: string;
  opportunity?: Opportunity;
  applicantId: string;
  applicant?: OpportunityOwner;
  createdAt: string;
  updatedAt: string;
}

