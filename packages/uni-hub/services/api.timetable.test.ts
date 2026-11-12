import { beforeEach, describe, expect, it, vi } from 'vitest';
import { timetableApi } from './api.timetable';

function mockFetchResponse(data: unknown): void {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => data,
  } as Response);
}

describe('TimetableApi', () => {
  it('archives an assignment using an encoded id and DELETE', async () => {
    mockFetchResponse({});
    await timetableApi.deleteTeachingAssignment('assignment/1');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/timetable/assignments/assignment%2F1'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
  it('adjusts a draft slot with an encoded version id and PATCH payload', async () => {
    const payload = {
      teachingAssignmentId: 'assignment-1',
      fromWeekday: 1,
      fromPair: 1,
      toWeekday: 2,
      toPair: 3,
    };
    const data = { events: [] };

    mockFetchResponse(data);

    expect((await timetableApi.adjustDraftSlot('version/1', payload)).data).toEqual(data);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/timetable/versions/version%2F1/slots'),
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify(payload) }),
    );
  });

  it('reschedules an event with an encoded event id and PATCH payload', async () => {
    const payload = { newDate: '2026-11-13', newPair: 3, reason: 'Makeup lesson' };

    mockFetchResponse({ id: 'event/1', ...payload });

    expect((await timetableApi.rescheduleEvent('event/1', payload)).data).toEqual({
      id: 'event/1',
      ...payload,
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/timetable/events/event%2F1/reschedule'),
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify(payload) }),
    );
  });
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getCurriculumPlan sends GET to /timetable/curriculum-plans/:id', async () => {
    const mockData = {
      id: 'plan-1',
      faculty: 'Faculty of CS and AI',
      title: 'CS 2026/2027',
      academicYear: '2026/2027',
      semester: 1,
      isDraft: false,
      teachingAssignments: [],
    };

    mockFetchResponse(mockData);

    const response = await timetableApi.getCurriculumPlan('plan-1');

    expect(response.data).toEqual(mockData);
    expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(global.fetch).mock.calls[0][0]).toContain(
      '/timetable/curriculum-plans/plan-1',
    );
  });

  it('createTeachingAssignment sends POST to /timetable/assignments', async () => {
    const payload = {
      curriculumPlanId: 'plan-1',
      disciplineTitle: 'Algorithms',
      teachingType: 'LECTURE' as const,
      academicHours: 32,
      teacherId: 'teacher-1',
      isSaturdayOnly: false,
      hasLateSlotAuthorization: false,
    };
    const mockData = { id: 'assign-1', ...payload };

    mockFetchResponse(mockData);

    const response = await timetableApi.createTeachingAssignment(payload);

    expect(response.data).toEqual(mockData);
    expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(global.fetch).mock.calls[0][0]).toContain('/timetable/assignments');
    expect(vi.mocked(global.fetch).mock.calls[0][1]?.method).toBe('POST');
    expect(JSON.parse(vi.mocked(global.fetch).mock.calls[0][1]?.body as string)).toEqual(payload);
  });

  it('updateTeachingAssignment sends PUT to /timetable/assignments/:id', async () => {
    const payload = {
      disciplineTitle: 'Updated Algorithms',
      academicHours: 48,
    };
    const mockData = {
      id: 'assign-1',
      curriculumPlanId: 'plan-1',
      teachingType: 'LECTURE',
      teacherId: 'teacher-1',
      ...payload,
    };

    mockFetchResponse(mockData);

    const response = await timetableApi.updateTeachingAssignment('assign-1', payload);

    expect(response.data).toEqual(mockData);
    expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(global.fetch).mock.calls[0][0]).toContain('/timetable/assignments/assign-1');
    expect(vi.mocked(global.fetch).mock.calls[0][1]?.method).toBe('PUT');
    expect(JSON.parse(vi.mocked(global.fetch).mock.calls[0][1]?.body as string)).toEqual(payload);
  });

  it('listTeachingAssignments sends GET to /timetable/assignments with planId query', async () => {
    const mockData = [{ id: 'assign-1', disciplineTitle: 'Algorithms' }];

    mockFetchResponse(mockData);

    const response = await timetableApi.listTeachingAssignments('plan-1');

    expect(response.data).toEqual(mockData);
    expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(global.fetch).mock.calls[0][0]).toContain(
      '/timetable/assignments?curriculumPlanId=plan-1',
    );
  });

  it('configureSemesterCalendar sends POST to /timetable/calendar', async () => {
    const payload = {
      academicYear: '2026/2027',
      semester: 1,
      startDate: '2026-09-01',
      teachingWeeks: 16,
    };
    const mockData = { id: 'cal-1', ...payload };

    mockFetchResponse(mockData);

    const response = await timetableApi.configureSemesterCalendar(payload);

    expect(response.data).toEqual(mockData);
    expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(global.fetch).mock.calls[0][0]).toContain('/timetable/calendar');
    expect(vi.mocked(global.fetch).mock.calls[0][1]?.method).toBe('POST');
  });

  it('getSemesterCalendar sends GET to /timetable/calendar with query params', async () => {
    const mockData = {
      id: 'cal-1',
      academicYear: '2026/2027',
      semester: 1,
      startDate: '2026-09-01',
      teachingWeeks: 16,
    };

    mockFetchResponse(mockData);

    const response = await timetableApi.getSemesterCalendar('2026/2027', 1);
    const calledUrl = vi.mocked(global.fetch).mock.calls[0][0] as string;

    expect(response.data).toEqual(mockData);
    expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(1);
    expect(calledUrl).toContain('/timetable/calendar');
    expect(calledUrl).toContain('academicYear=2026%2F2027');
    expect(calledUrl).toContain('semester=1');
  });

  it('generateTimetableDraft sends POST to /timetable/plans/:id/generate', async () => {
    const options = { maxCandidates: 3, timeoutMs: 3000 };
    const mockData = {
      versionId: 'ver-1',
      candidates: [],
      diagnostics: { statesExplored: 42, timeMs: 120 },
    };

    mockFetchResponse(mockData);

    const response = await timetableApi.generateTimetableDraft('plan-1', options);

    expect(response.data).toEqual(mockData);
    expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(global.fetch).mock.calls[0][0]).toContain('/timetable/plans/plan-1/generate');
    expect(vi.mocked(global.fetch).mock.calls[0][1]?.method).toBe('POST');
  });

  it('publishTimetableVersion sends POST to /timetable/versions/:id/publish', async () => {
    const mockData = {
      id: 'ver-1',
      curriculumPlanId: 'plan-1',
      status: 'PUBLISHED',
      versionNumber: 1,
      events: [],
    };

    mockFetchResponse(mockData);

    const response = await timetableApi.publishTimetableVersion('ver-1');

    expect(response.data).toEqual(mockData);
    expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(global.fetch).mock.calls[0][0]).toContain('/timetable/versions/ver-1/publish');
    expect(vi.mocked(global.fetch).mock.calls[0][1]?.method).toBe('POST');
  });

  it('requestTeacherUnavailability sends POST to /timetable/teachers/:teacherId/unavailability', async () => {
    const payload = { date: '2026-09-15', pair: 2, reason: 'Doctor' };
    const mockData = { id: 'unavail-1', teacherId: 'teacher-1', ...payload, isConfirmed: false };

    mockFetchResponse(mockData);

    const response = await timetableApi.requestTeacherUnavailability('teacher-1', payload);

    expect(response.data).toEqual(mockData);
    expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(global.fetch).mock.calls[0][0]).toContain(
      '/timetable/teachers/teacher-1/unavailability',
    );
    expect(vi.mocked(global.fetch).mock.calls[0][1]?.method).toBe('POST');
  });

  it('confirmTeacherUnavailability sends PUT to /timetable/unavailability/:id/confirm', async () => {
    const mockData = { id: 'unavail-1', isConfirmed: true };

    mockFetchResponse(mockData);

    const response = await timetableApi.confirmTeacherUnavailability('unavail-1', true);

    expect(response.data).toEqual(mockData);
    expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(global.fetch).mock.calls[0][0]).toContain(
      '/timetable/unavailability/unavail-1/confirm',
    );
    expect(vi.mocked(global.fetch).mock.calls[0][1]?.method).toBe('PUT');
  });

  it('updateMeetingUrl sends PUT to /timetable/assignments/:id/meeting-url', async () => {
    const mockData = { id: 'assign-1', meetingUrl: 'https://meet.google.com/xyz' };

    mockFetchResponse(mockData);

    const response = await timetableApi.updateMeetingUrl('assign-1', 'https://meet.google.com/xyz');

    expect(response.data).toEqual(mockData);
    expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(global.fetch).mock.calls[0][0]).toContain(
      '/timetable/assignments/assign-1/meeting-url',
    );
    expect(vi.mocked(global.fetch).mock.calls[0][1]?.method).toBe('PUT');
  });

  it('createSubscriptionToken sends POST to /timetable/calendar/tokens', async () => {
    const mockData = { id: 'token-1', userId: 'user-1', token: 'uuid-tok-123' };

    mockFetchResponse(mockData);

    const response = await timetableApi.createSubscriptionToken();

    expect(response.data).toEqual(mockData);
    expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(global.fetch).mock.calls[0][0]).toContain('/timetable/calendar/tokens');
    expect(vi.mocked(global.fetch).mock.calls[0][1]?.method).toBe('POST');
  });

  it('getIcsFeedUrl returns full URL with custom base or window origin', () => {
    const url = timetableApi.getIcsFeedUrl('test-token-123', 'https://hub.karazin.ua');

    expect(url).toBe('https://hub.karazin.ua/timetable/calendar/feed/test-token-123');

    const defaultUrl = timetableApi.getIcsFeedUrl('test-token-456');

    expect(defaultUrl).toContain('/timetable/calendar/feed/test-token-456');
  });
});
