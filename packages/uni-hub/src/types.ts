export interface Course {
  id: number;
  fullname: string;
  shortname: string;
  summary: string;
  year?: number | null;
  semester?: number | null;
}

export interface Grade {
  courseId?: number;
  courseName?: string;
  course_name?: string;
  grade: string;
  rawGrade?: string | number | null;
  rawgrade?: string | number | null;
  year?: string | number | null;
  semester?: number | null;
}

export interface Assignment {
  id: number;
  courseName: string;
  name: string;
  duedate: number;
  description: string;
  year?: number | null;
  semester?: number | null;
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
  modname: string;
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
