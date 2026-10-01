import type { StudentProfile } from '@core/types';
import type {
  Course,
  Grade,
  Assignment,
  MoodleEvent,
  NotificationsResponse,
  CourseStatistics,
  CourseSection,
} from '@uni-hub/types';
import { request, buildQueryString } from './api.request';

export interface GetAssignmentsParams {
  dateFrom?: number;
  dateTo?: number;
  semester?: string;
  sortByDate?: 'asc' | 'desc';
  status?: 'completed' | 'not_completed';
  year?: string;
  includeStatus?: boolean;
}

export class MoodleApi {
  getCourses(): Promise<{ data: Course[] }> {
    return request<Course[]>('/moodle/courses');
  }

  getGrades(): Promise<{ data: { grades: Grade[] } }> {
    return request<{ grades: Grade[] }>('/moodle/grades');
  }

  getAssignments(params?: GetAssignmentsParams): Promise<{ data: Assignment[] }> {
    return request<Assignment[]>(
      `/moodle/assignments${buildQueryString(params as Record<string, unknown>)}`,
    );
  }

  getEvents(): Promise<{ data: MoodleEvent[] }> {
    return request<MoodleEvent[]>('/moodle/events');
  }

  getNotifications(): Promise<{ data: NotificationsResponse }> {
    return request<NotificationsResponse>('/moodle/notifications');
  }

  getStatistics(): Promise<{ data: CourseStatistics }> {
    return request<CourseStatistics>('/moodle/statistics');
  }

  getProfile(): Promise<{ data: StudentProfile }> {
    return request<StudentProfile>('/moodle/profile');
  }

  getCourseContents(courseId: number): Promise<{ data: CourseSection[] }> {
    return request<CourseSection[]>(`/moodle/courses/${courseId}/contents`);
  }

  getAssignmentStatus(assignId: number): Promise<{ data: unknown }> {
    return request<unknown>(`/moodle/assignments/${assignId}/status`);
  }

  submitAssignment(
    assignId: number,
    text?: string,
    fileItemId?: number,
  ): Promise<{ data: unknown }> {
    return request<unknown>(`/moodle/assignments/${assignId}/submission`, {
      method: 'POST',
      body: JSON.stringify({ text, fileItemId }),
    });
  }

  uploadFile(filename: string, filebase64: string): Promise<{ data: unknown }> {
    return request<unknown>('/moodle/files/upload', {
      method: 'POST',
      body: JSON.stringify({ filename, filebase64 }),
    });
  }
}

export const moodleApi = new MoodleApi();
