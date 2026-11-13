import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCurrentUser } from '@uni-hub/hooks/useCurrentUser';
import { timetableApi } from '@uni-hub/services/api.timetable';
import { createTestQueryClient, withQueryClient } from '@uni-hub/utils/test-utils';
import { useMySchedule } from './useMySchedule';

vi.mock('@uni-hub/hooks/useCurrentUser', () => ({
  useCurrentUser: vi.fn(),
}));

describe('useMySchedule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('scopes cached schedule events per authenticated user and keeps errors visible', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      withQueryClient(children as React.ReactElement, queryClient);

    vi.mocked(useCurrentUser).mockReturnValue({ userId: null, roles: [] });
    const getEventsSpy = vi.spyOn(timetableApi, 'getMyScheduleEvents');

    const unauthenticated = renderHook(() => useMySchedule(), { wrapper });

    expect(getEventsSpy).not.toHaveBeenCalled();
    expect(unauthenticated.result.current.events).toEqual([]);

    vi.mocked(useCurrentUser).mockReturnValue({ userId: 'teacher-a', roles: ['INSTRUCTOR'] });
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

    vi.mocked(useCurrentUser).mockReturnValue({ userId: 'teacher-b', roles: ['INSTRUCTOR'] });
    getEventsSpy.mockRejectedValueOnce(new Error('Network error'));

    const userB = renderHook(() => useMySchedule(), { wrapper });

    await waitFor(() => expect(userB.result.current.isError).toBe(true));
    expect(userB.result.current.events).toEqual([]);
  });
});
