import { useQuery } from '@tanstack/react-query';
import type { IcsCalendarEvent } from '@core/types/timetable';
import { PAIR_SCHEDULE, type PairNumber } from '@core/constants/timetable';
import { useCurrentUser } from '@uni-hub/hooks/useCurrentUser';
import { timetableApi } from '@uni-hub/services/api.timetable';
import type { ScheduleEvent } from '@uni-hub/components/schedule/ScheduleView.types';

function toScheduleEventType(type?: string): ScheduleEvent['type'] {
  switch (type?.toUpperCase()) {
    case 'LECTURE':
      return 'lecture';
    case 'LABORATORY':
    case 'LAB':
      return 'lab';
    case 'PRACTICE':
    case 'PRACTICAL':
      return 'practice';
    case 'SEMINAR':
      return 'seminar';
    case 'EXAM':
      return 'exam';
    default:
      return 'other';
  }
}

export function useMySchedule(): { events: ScheduleEvent[]; isLoading: boolean; isError: boolean } {
  const { userId } = useCurrentUser();
  const query = useQuery({
    queryKey: ['timetable', 'myEvents', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<ScheduleEvent[]> => {
      const res = await timetableApi.getMyScheduleEvents();
      const mapped: ScheduleEvent[] = res.data.map((e: IcsCalendarEvent) => {
        const pairNum = (e.pair && e.pair >= 1 && e.pair <= 7 ? e.pair : 1) as PairNumber;
        const bell = PAIR_SCHEDULE[pairNum];
        const [startH, startM] = bell.start.split(':').map(Number);
        const [endH, endM] = bell.end.split(':').map(Number);

        const datePart = e.date ? e.date.split('T')[0] : '2026-09-01';
        const [y, m, d] = datePart.split('-').map(Number);

        const start = new Date(y, m - 1, d, startH, startM);
        const end = new Date(y, m - 1, d, endH, endM);

        return {
          id: e.id,
          title: e.disciplineTitle,
          type: toScheduleEventType(e.teachingType),
          start,
          end,
          location: e.location ?? '',
          meetingUrl: e.meetingUrl || undefined,
          teachingAssignmentId: e.teachingAssignmentId,
          teacherName: e.teacherName,
          groupCodes: e.groupCodes,
        };
      });

      return mapped;
    },
  });

  return { events: query.data ?? [], isLoading: query.isLoading, isError: query.isError };
}
