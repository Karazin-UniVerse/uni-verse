import { queryOptions } from '@tanstack/react-query';
import type { SemesterCalendarResponse, TeacherSlotPreference } from '@core/types/timetable';
import { timetableApi } from '@uni-hub/services/api.timetable';

export const semesterKeys = {
  calendar: (academicYear: string, semester: number) =>
    ['timetable', 'semesterCalendar', academicYear, semester] as const,
  slotPreferences: (semesterCalendarId: string) =>
    ['timetable', 'semesterSlotPreferences', semesterCalendarId] as const,
};

export function semesterCalendarQueryOptions(academicYear: string, semester: number) {
  return queryOptions({
    queryKey: semesterKeys.calendar(academicYear, semester),
    queryFn: async (): Promise<SemesterCalendarResponse> =>
      (await timetableApi.getSemesterCalendar(academicYear, semester)).data,
    enabled: Boolean(academicYear),
    retry: false,
  });
}

/** Every teacher's slot preferences for the semester, for the dean's workload and draft views. */
export function semesterSlotPreferencesQueryOptions(semesterCalendarId: string) {
  return queryOptions({
    queryKey: semesterKeys.slotPreferences(semesterCalendarId),
    queryFn: async (): Promise<TeacherSlotPreference[]> =>
      (await timetableApi.listSemesterSlotPreferences(semesterCalendarId)).data,
    enabled: Boolean(semesterCalendarId),
  });
}
