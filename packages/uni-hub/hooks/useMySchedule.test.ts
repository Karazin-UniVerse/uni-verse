import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { timetableApi } from '@uni-hub/services/api.timetable';
import { createTestQueryClient, createQueryClientWrapper } from '@uni-hub/utils/test-utils';
import { useMySchedule } from './useMySchedule';

function signIn(userId: string): void {
  const payload = btoa(JSON.stringify({ sub: userId, roles: ['INSTRUCTOR'] }));

  localStorage.setItem('accessToken', `header.${payload}.signature`);
}

describe('useMySchedule', () => {
  const originalTimeZone = process.env.TZ;

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    if (originalTimeZone === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTimeZone;
    }
  });

  it('should scope cached schedule events per authenticated user and keep errors visible', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createQueryClientWrapper(queryClient);
    const getEventsSpy = vi.spyOn(timetableApi, 'getMyScheduleEvents');

    const unauthenticated = renderHook(() => useMySchedule(), { wrapper });

    expect(getEventsSpy).not.toHaveBeenCalled();
    expect(unauthenticated.result.current.events).toEqual([]);

    signIn('teacher-a');
    getEventsSpy.mockResolvedValueOnce({
      data: [
        {
          id: 'evt-a',
          disciplineTitle: 'Course A',
          date: '2026-11-12',
          pair: 1,
        },
      ],
    });

    const userA = renderHook(() => useMySchedule(), { wrapper });

    await waitFor(() => expect(userA.result.current.events).toHaveLength(1));
    expect(userA.result.current.events[0].title).toBe('Course A');

    signIn('teacher-b');
    getEventsSpy.mockRejectedValueOnce(new Error('Network error'));

    const userB = renderHook(() => useMySchedule(), { wrapper });

    await waitFor(() => expect(userB.result.current.isError).toBe(true));
    expect(userB.result.current.events).toEqual([]);
  });

  it.each([
    {
      date: '2026-01-15',
      pairSpan: 1,
      expectedStart: '2026-01-15T06:30:00.000Z',
      expectedEnd: '2026-01-15T07:50:00.000Z',
    },
    {
      date: '2026-07-15',
      pairSpan: 1,
      expectedStart: '2026-07-15T05:30:00.000Z',
      expectedEnd: '2026-07-15T06:50:00.000Z',
    },
    {
      date: '2026-01-15',
      pairSpan: 2,
      expectedStart: '2026-01-15T06:30:00.000Z',
      expectedEnd: '2026-01-15T09:30:00.000Z',
    },
    {
      date: '2026-07-15',
      pairSpan: 2,
      expectedStart: '2026-07-15T05:30:00.000Z',
      expectedEnd: '2026-07-15T08:30:00.000Z',
    },
  ])(
    'should return Europe/Kyiv instants for $date spanning $pairSpan pairs in a Berlin browser',
    async ({ date, pairSpan, expectedStart, expectedEnd }) => {
      process.env.TZ = 'Europe/Berlin';
      signIn('teacher-a');
      vi.spyOn(timetableApi, 'getMyScheduleEvents').mockResolvedValueOnce({
        data: [
          {
            id: 'evt-time-zone',
            disciplineTitle: 'Course in Kyiv',
            date,
            pair: 1,
            pairSpan,
          },
        ],
      });

      const { result } = renderHook(() => useMySchedule(), {
        wrapper: createQueryClientWrapper(),
      });

      await waitFor(() => expect(result.current.events).toHaveLength(1));
      expect(result.current.events[0].start.toISOString()).toBe(expectedStart);
      expect(result.current.events[0].end.toISOString()).toBe(expectedEnd);
    },
  );
});
