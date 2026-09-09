import { request } from '@uni-hub/services/api/client';
import {
  Assignment,
  Course,
  CourseSection,
  CourseStatistics,
  Grade,
  MoodleEvent,
  NotificationsResponse,
} from '@uni-hub/types';
import { buildQueryString } from '@uni-hub/services/api/api-utils';

export interface GetAssignmentsParams {
  dateFrom?: number;
  dateTo?: number;
  semester?: string;
  sortByDate?: 'asc' | 'desc';
  status?: 'completed' | 'not_completed';
  year?: string;
}

export interface AssignmentStatus {
  status: string;
  grade?: string;
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

  getCourseContents(courseId: number): Promise<{ data: CourseSection[] }> {
    return request<CourseSection[]>(`/moodle/courses/${courseId}/contents`);
  }

  getAssignmentStatus(assignId: number): Promise<{ data: AssignmentStatus }> {
    return request<AssignmentStatus>(`/moodle/assignments/${assignId}/status`);
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
