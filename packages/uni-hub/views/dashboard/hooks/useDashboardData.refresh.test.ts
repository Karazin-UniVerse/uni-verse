import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, screen, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { moodleKeys } from '@uni-hub/queries/moodle/queryKeys';
import { moodleApi } from '@uni-hub/services/api.moodle';
import { notificationsApi } from '@uni-hub/services/api.notifications';
import { useMoodleStore } from '@uni-hub/store/useMoodleStore';
import { fallbackStudentProfile } from '@uni-hub/utils/test-fixtures';
import { createAppProvidersWrapper, setTestFeatureFlags } from '@uni-hub/utils/test-utils';
import { useDashboardData } from './useDashboardData';

describe('useDashboardData profile refresh', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('accessToken', 'synthetic-session');
    localStorage.setItem('authProvider', 'credentials');
    useMoodleStore.getState().setLinked(true);
    setTestFeatureFlags({ isMoodleIntegrationEnabled: true });
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.spyOn(moodleApi, 'getCourses').mockResolvedValue({ data: [] });
    vi.spyOn(moodleApi, 'getGrades').mockResolvedValue({ data: { grades: [] } });
    vi.spyOn(moodleApi, 'getAssignments').mockResolvedValue({ data: [] });
    vi.spyOn(moodleApi, 'getEvents').mockResolvedValue({ data: [] });
    vi.spyOn(moodleApi, 'getNotifications').mockResolvedValue({
      data: { notifications: [], unreadcount: 0 },
    });
    vi.spyOn(moodleApi, 'getStatistics').mockResolvedValue({
      data: { total: 0 },
    });
    vi.spyOn(notificationsApi, 'getMyNotifications').mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
    vi.restoreAllMocks();
  });

  it('should restore the profile on manual refresh after an initial profile request failure', async () => {
    vi.spyOn(moodleApi, 'getProfile')
      .mockRejectedValueOnce(new Error('Profile temporarily unavailable'))
      .mockResolvedValue({ data: fallbackStudentProfile });

    const { result } = renderHook(() => useDashboardData(), {
      wrapper: createAppProvidersWrapper(queryClient),
    });

    await waitFor(() =>
      expect(queryClient.getQueryState(moodleKeys.profile())?.status).toBe('error'),
    );
    expect(result.current.studentProfile).toBeNull();

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => expect(result.current.studentProfile?.fullName).toBe('Test Student'));
  });

  it('should report a refresh failure when the profile still cannot be loaded', async () => {
    vi.spyOn(moodleApi, 'getProfile').mockRejectedValue(new Error('Profile unavailable'));

    const { result } = renderHook(() => useDashboardData(), {
      wrapper: createAppProvidersWrapper(queryClient),
    });

    await waitFor(() =>
      expect(queryClient.getQueryState(moodleKeys.profile())?.status).toBe('error'),
    );

    await act(async () => {
      await result.current.refresh();
    });

    expect(
      await screen.findByText(
        'Помилка завантаження даних. Будь ласка, переконайтеся, що бекенд запущено.',
      ),
    ).toBeInTheDocument();
    expect(result.current.studentProfile).toBeNull();
  });

  it.each([
    { linked: false, integrationEnabled: true },
    { linked: true, integrationEnabled: false },
  ])(
    'should skip profile refresh when linked=$linked and integrationEnabled=$integrationEnabled',
    async ({ linked, integrationEnabled }) => {
      useMoodleStore.getState().setLinked(linked);
      setTestFeatureFlags({ isMoodleIntegrationEnabled: integrationEnabled });
      const getProfile = vi
        .spyOn(moodleApi, 'getProfile')
        .mockResolvedValue({ data: fallbackStudentProfile });
      const { result } = renderHook(() => useDashboardData(), {
        wrapper: createAppProvidersWrapper(queryClient),
      });

      await act(async () => {
        await result.current.refresh();
      });

      expect(getProfile).not.toHaveBeenCalled();
      expect(result.current.studentProfile).toBeNull();
      expect(result.current.lastSyncTime).not.toBeNull();
    },
  );
});
