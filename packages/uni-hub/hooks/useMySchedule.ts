import { useEffect, useState } from 'react';
import type { IcsCalendarEvent } from '@core/types/timetable';
import { PAIR_SCHEDULE, type PairNumber } from '@core/constants/timetable';
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
    case 'EXAM':
      return 'exam';
    default:
      return 'other';
  }
}

export function useMySchedule(): { events: ScheduleEvent[]; isLoading: boolean } {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    timetableApi
      .getMyScheduleEvents()
      .then((res) => {
        if (!isActive || !Array.isArray(res?.data)) return;

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
            location:
              e.groupCodes && e.groupCodes.length > 0 ? e.groupCodes.join(', ') : 'Каразінський',
            meetingUrl: e.meetingUrl || undefined,
            teachingAssignmentId: e.id,
            teacherName: e.teacherName,
            groupCodes: e.groupCodes,
          };
        });

        setEvents(mapped);
      })
      .catch(() => {
        // Залишаємо поточні події при офлайні
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  return { events, isLoading };
}
