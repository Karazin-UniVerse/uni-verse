import type { StudentProfile } from '@core/types/student';
import type {
  MoodleCourse,
  Grade,
  Assignment,
  MoodleEvent,
  NotificationsResponse,
  CourseStatistics,
  CourseSection,
  SubmissionStatus,
  UploadedFile,
} from '@core/types/moodle';
import { ApiClient, buildQueryString } from './api.request';

export interface GetAssignmentsParams {
  dateFrom?: number;
  dateTo?: number;
  semester?: string;
  sortByDate?: 'asc' | 'desc';
  status?: 'completed' | 'not_completed';
  year?: string;
  includeStatus?: boolean;
}

export class MoodleApi extends ApiClient {
  getCourses(): Promise<{ data: MoodleCourse[] }> {
    return this.request<MoodleCourse[]>('/moodle/courses');
  }

  getGrades(): Promise<{ data: { grades: Grade[] } }> {
    return this.request<{ grades: Grade[] }>('/moodle/grades');
  }

  getAssignments(params?: GetAssignmentsParams): Promise<{ data: Assignment[] }> {
    return this.request<Assignment[]>(
      `/moodle/assignments${buildQueryString(params as Record<string, unknown>)}`,
    );
  }

  getEvents(): Promise<{ data: MoodleEvent[] }> {
    return this.request<MoodleEvent[]>('/moodle/events');
  }

  getNotifications(): Promise<{ data: NotificationsResponse }> {
    return this.request<NotificationsResponse>('/moodle/notifications');
  }

  getStatistics(): Promise<{ data: CourseStatistics }> {
    return this.request<CourseStatistics>('/moodle/statistics');
  }

  getProfile(): Promise<{ data: StudentProfile }> {
    return this.request<StudentProfile>('/moodle/profile');
  }

  getCourseContents(courseId: number): Promise<{ data: CourseSection[] }> {
    return this.request<CourseSection[]>(`/moodle/courses/${courseId}/contents`);
  }

  getAssignmentStatus(assignId: number): Promise<{ data: SubmissionStatus }> {
    return this.request<SubmissionStatus>(`/moodle/assignments/${assignId}/status`);
  }

  submitAssignment(
    assignId: number,
    text?: string,
    fileItemId?: number,
  ): Promise<{ data: unknown }> {
    return this.request<unknown>(`/moodle/assignments/${assignId}/submission`, {
      method: 'POST',
      body: JSON.stringify({ text, fileItemId }),
    });
  }

  uploadFile(filename: string, filebase64: string): Promise<{ data: UploadedFile[] }> {
    return this.request<UploadedFile[]>('/moodle/files/upload', {
      method: 'POST',
      body: JSON.stringify({ filename, filebase64 }),
    });
  }
}

export const moodleApi = new MoodleApi();
