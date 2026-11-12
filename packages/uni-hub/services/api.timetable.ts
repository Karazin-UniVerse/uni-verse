import type {
  CalendarSubscriptionTokenResponse,
  CreateSemesterCalendarRequest,
  CreateTeacherUnavailabilityRequest,
  CreateTeachingAssignmentRequest,
  CurriculumPlanResponse,
  GenerateTimetableDraftResult,
  GenerateTimetableRequest,
  SemesterCalendarResponse,
  TeacherUnavailabilityResponse,
  TeachingAssignmentResponse,
  TimetableVersionResponse,
} from '@core/types/timetable';
import { ApiClient, buildQueryString } from './api.request';

export class TimetableApi extends ApiClient {
  async getCurriculumPlan(id: string): Promise<{ data: CurriculumPlanResponse }> {
    return this.request<CurriculumPlanResponse>(
      `/timetable/curriculum-plans/${encodeURIComponent(id)}`,
    );
  }

  async createTeachingAssignment(
    payload: CreateTeachingAssignmentRequest,
  ): Promise<{ data: TeachingAssignmentResponse }> {
    return this.request<TeachingAssignmentResponse>('/timetable/assignments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async listTeachingAssignments(planId: string): Promise<{ data: TeachingAssignmentResponse[] }> {
    const query = buildQueryString({ curriculumPlanId: planId });

    return this.request<TeachingAssignmentResponse[]>(`/timetable/assignments${query}`);
  }

  async configureSemesterCalendar(
    payload: CreateSemesterCalendarRequest,
  ): Promise<{ data: SemesterCalendarResponse }> {
    return this.request<SemesterCalendarResponse>('/timetable/calendar', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getSemesterCalendar(
    academicYear: string,
    semester: number,
  ): Promise<{ data: SemesterCalendarResponse }> {
    const query = buildQueryString({ academicYear, semester });

    return this.request<SemesterCalendarResponse>(`/timetable/calendar${query}`);
  }

  async generateTimetableDraft(
    planId: string,
    options?: GenerateTimetableRequest,
  ): Promise<{ data: GenerateTimetableDraftResult }> {
    return this.request<GenerateTimetableDraftResult>(
      `/timetable/plans/${encodeURIComponent(planId)}/generate`,
      {
        method: 'POST',
        body: JSON.stringify(options ?? {}),
      },
    );
  }

  async publishTimetableVersion(versionId: string): Promise<{ data: TimetableVersionResponse }> {
    return this.request<TimetableVersionResponse>(
      `/timetable/versions/${encodeURIComponent(versionId)}/publish`,
      {
        method: 'POST',
      },
    );
  }

  async requestTeacherUnavailability(
    teacherId: string,
    payload: CreateTeacherUnavailabilityRequest,
  ): Promise<{ data: TeacherUnavailabilityResponse }> {
    return this.request<TeacherUnavailabilityResponse>(
      `/timetable/teachers/${encodeURIComponent(teacherId)}/unavailability`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  }

  async confirmTeacherUnavailability(
    id: string,
    isConfirmed: boolean,
  ): Promise<{ data: TeacherUnavailabilityResponse }> {
    return this.request<TeacherUnavailabilityResponse>(
      `/timetable/unavailability/${encodeURIComponent(id)}/confirm`,
      {
        method: 'PUT',
        body: JSON.stringify({ isConfirmed }),
      },
    );
  }

  async updateMeetingUrl(
    assignmentId: string,
    meetingUrl?: string,
  ): Promise<{ data: TeachingAssignmentResponse }> {
    return this.request<TeachingAssignmentResponse>(
      `/timetable/assignments/${encodeURIComponent(assignmentId)}/meeting-url`,
      {
        method: 'PUT',
        body: JSON.stringify({ meetingUrl }),
      },
    );
  }

  async createSubscriptionToken(): Promise<{ data: CalendarSubscriptionTokenResponse }> {
    return this.request<CalendarSubscriptionTokenResponse>('/timetable/calendar/tokens', {
      method: 'POST',
    });
  }

  getIcsFeedUrl(token: string, baseOrigin?: string): string {
    const origin =
      baseOrigin ??
      (typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'http://localhost:3000');
    const normalized = origin.replace(/\/$/, '');

    return `${normalized}/api/timetable/calendar/feed/${encodeURIComponent(token)}`;
  }
}

export const timetableApi = new TimetableApi();
