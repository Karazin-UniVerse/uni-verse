import type {
  AcademicGroupResponse,
  AdjustDraftSlotRequest,
  CalendarSubscriptionTokenResponse,
  CreateSemesterCalendarRequest,
  CreateTeacherUnavailabilityRequest,
  CreateTeachingAssignmentRequest,
  CurriculumPlanResponse,
  GenerateTimetableDraftResult,
  GenerateTimetableRequest,
  IcsCalendarEvent,
  RescheduleEventRequest,
  ScheduledEvent,
  SafeTeacherResponse,
  SemesterCalendarResponse,
  TeacherUnavailabilityResponse,
  TeachingAssignmentResponse,
  TimetableVersionResponse,
  UpdateTeachingAssignmentRequest,
} from '@core/types/timetable';
import { ApiClient, buildQueryString } from './api.request';
import { API_BASE_URL } from './api.storage';

export class TimetableApi extends ApiClient {
  async adjustDraftSlot(
    versionId: string,
    payload: AdjustDraftSlotRequest,
  ): Promise<{ data: TimetableVersionResponse & { penaltyScore?: number } }> {
    return this.request<TimetableVersionResponse & { penaltyScore?: number }>(
      `/timetable/versions/${encodeURIComponent(versionId)}/slots`,
      { method: 'PATCH', body: JSON.stringify(payload) },
    );
  }

  async rescheduleEvent(
    eventId: string,
    payload: RescheduleEventRequest,
  ): Promise<{ data: Pick<ScheduledEvent, 'date' | 'pair'> }> {
    return this.request<Pick<ScheduledEvent, 'date' | 'pair'>>(
      `/timetable/events/${encodeURIComponent(eventId)}/reschedule`,
      { method: 'PATCH', body: JSON.stringify(payload) },
    );
  }

  async getMyScheduleEvents(): Promise<{ data: IcsCalendarEvent[] }> {
    return this.request<IcsCalendarEvent[]>('/timetable/my/events');
  }

  async getCurriculumPlan(id: string): Promise<{ data: CurriculumPlanResponse }> {
    return this.request<CurriculumPlanResponse>(
      `/timetable/curriculum-plans/${encodeURIComponent(id)}`,
    );
  }

  async listCurriculumPlans(): Promise<{ data: CurriculumPlanResponse[] }> {
    return this.request<CurriculumPlanResponse[]>('/timetable/curriculum-plans');
  }

  async listTeachers(): Promise<{ data: SafeTeacherResponse[] }> {
    return this.request<SafeTeacherResponse[]>('/timetable/teachers');
  }

  async listAcademicGroups(): Promise<{ data: AcademicGroupResponse[] }> {
    return this.request<AcademicGroupResponse[]>('/timetable/groups');
  }

  async createTeachingAssignment(
    payload: CreateTeachingAssignmentRequest,
  ): Promise<{ data: TeachingAssignmentResponse }> {
    return this.request<TeachingAssignmentResponse>('/timetable/assignments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateTeachingAssignment(
    id: string,
    payload: UpdateTeachingAssignmentRequest,
  ): Promise<{ data: TeachingAssignmentResponse }> {
    return this.request<TeachingAssignmentResponse>(
      `/timetable/assignments/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
    );
  }

  async deleteTeachingAssignment(id: string): Promise<{ data: { count: number } }> {
    return this.request<{ count: number }>(`/timetable/assignments/${encodeURIComponent(id)}`, {
      method: 'DELETE',
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
    const origin = baseOrigin ?? API_BASE_URL;
    const normalized = origin.replace(/\/$/, '');

    return `${normalized}/timetable/calendar/feed/${encodeURIComponent(token)}`;
  }
}

export const timetableApi = new TimetableApi();
