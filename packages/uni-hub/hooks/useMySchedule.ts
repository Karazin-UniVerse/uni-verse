import { useQuery } from '@tanstack/react-query';
import type { IcsCalendarEvent } from '@core/types/timetable';
import { getPairInstants } from '@core/utils/timetable';
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
        const instants = getPairInstants(e.date!.slice(0, 10), e.pair!);
        const endInstants = getPairInstants(e.date!.slice(0, 10), e.pair! + (e.pairSpan ?? 1) - 1);

        if (!instants.ok || !endInstants.ok) {
          throw new Error('Invalid timetable event slot');
        }

        const start = instants.start;
        const end = endInstants.end;

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
