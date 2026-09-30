import type {
  Course,
  Grade,
  Assignment,
  MoodleEvent,
  NotificationsResponse,
  CourseStatistics,
  CourseSection,
} from '@uni-hub/types';
import {
  mockCourses,
  mockGrades,
  mockEvents,
  mockNotifications,
  mockStatistics,
  mockAssignments,
  getMockAssignments,
} from './mockData';
import { isDemoMode } from './api.storage';
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
    if (isDemoMode()) {
      return Promise.resolve({ data: mockCourses });
    }

    return request<Course[]>('/moodle/courses');
  }

  getGrades(): Promise<{ data: { grades: Grade[] } }> {
    if (isDemoMode()) {
      return Promise.resolve({ data: { grades: mockGrades } });
    }

    return request<{ grades: Grade[] }>('/moodle/grades');
  }

  getAssignments(params?: GetAssignmentsParams): Promise<{ data: Assignment[] }> {
    if (isDemoMode()) {
      return Promise.resolve({ data: getMockAssignments(params) });
    }

    return request<Assignment[]>(
      `/moodle/assignments${buildQueryString(params as Record<string, unknown>)}`,
    );
  }

  getEvents(): Promise<{ data: MoodleEvent[] }> {
    if (isDemoMode()) {
      return Promise.resolve({ data: mockEvents });
    }

    return request<MoodleEvent[]>('/moodle/events');
  }

  getNotifications(): Promise<{ data: NotificationsResponse }> {
    if (isDemoMode()) {
      return Promise.resolve({ data: mockNotifications });
    }

    return request<NotificationsResponse>('/moodle/notifications');
  }

  getStatistics(): Promise<{ data: CourseStatistics }> {
    if (isDemoMode()) {
      return Promise.resolve({ data: mockStatistics });
    }

    return request<CourseStatistics>('/moodle/statistics');
  }

  getCourseContents(courseId: number): Promise<{ data: CourseSection[] }> {
    if (isDemoMode()) {
      return Promise.resolve({ data: [] });
    }

    return request<CourseSection[]>(`/moodle/courses/${courseId}/contents`);
  }

  getAssignmentStatus(assignId: number): Promise<{ data: unknown }> {
    if (isDemoMode()) {
      const match = mockAssignments.find((assignment) => assignment.id === assignId);

      return Promise.resolve({
        data: {
          lastattempt: {
            gradingstatus: match?.graded ? 'graded' : 'notgraded',
            submission: {
              status: match?.submissionStatus || 'new',
              timemodified: match?.submittedAt,
            },
          },
          feedback: match?.grade ? { grade: { grade: String(match.grade) } } : undefined,
        },
      });
    }

    return request<unknown>(`/moodle/assignments/${assignId}/status`);
  }

  submitAssignment(
    assignId: number,
    text?: string,
    fileItemId?: number,
  ): Promise<{ data: unknown }> {
    if (isDemoMode()) {
      return Promise.resolve({ data: { status: true } });
    }

    return request<unknown>(`/moodle/assignments/${assignId}/submission`, {
      method: 'POST',
      body: JSON.stringify({ text, fileItemId }),
    });
  }

  uploadFile(filename: string, filebase64: string): Promise<{ data: unknown }> {
    if (isDemoMode()) {
      return Promise.resolve({ data: { itemid: 12345 } });
    }

    return request<unknown>('/moodle/files/upload', {
      method: 'POST',
      body: JSON.stringify({ filename, filebase64 }),
    });
  }
}

export const moodleApi = new MoodleApi();
