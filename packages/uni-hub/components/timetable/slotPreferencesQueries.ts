import { queryOptions } from '@tanstack/react-query';
import type { SemesterCalendarResponse, SlotPreferenceItem } from '@core/types/timetable';
import { timetableApi } from '@uni-hub/services/api.timetable';

export const slotPreferenceKeys = {
  all: ['timetable', 'slotPreferences'] as const,
  semesters: () => [...slotPreferenceKeys.all, 'semesters'] as const,
  bySemester: (semesterCalendarId: string) =>
    [...slotPreferenceKeys.all, 'semester', semesterCalendarId] as const,
};

export function preferenceSemestersQueryOptions() {
  return queryOptions({
    queryKey: slotPreferenceKeys.semesters(),
    queryFn: async (): Promise<SemesterCalendarResponse[]> => {
      const response = await timetableApi.listPreferenceSemesters();

      return response.data;
    },
  });
}

export function mySlotPreferencesQueryOptions(semesterCalendarId: string) {
  return queryOptions({
    queryKey: slotPreferenceKeys.bySemester(semesterCalendarId),
    queryFn: async (): Promise<SlotPreferenceItem[]> => {
      const response = await timetableApi.getMySlotPreferences(semesterCalendarId);

      return response.data.map(({ weekday, pair, preference }) => ({
        weekday,
        pair,
        preference,
      }));
    },
    enabled: Boolean(semesterCalendarId),
  });
}
