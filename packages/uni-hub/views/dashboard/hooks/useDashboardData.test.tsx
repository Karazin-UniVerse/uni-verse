import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { moodleApi } from '@uni-hub/services/api.moodle';
import { notificationsApi } from '@uni-hub/services/api.notifications';
import { useMoodleStore } from '@uni-hub/store/useMoodleStore';
import { useDashboardData } from './useDashboardData';

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('@una', () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error: mockToastError,
    info: vi.fn(),
  }),
}));

vi.mock('@uni-hub/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    formatMessage: (key: string) => key,
  }),
}));

vi.mock('@uni-hub/features', () => ({
  useFeatures: () => ({
    isMoodleIntegrationEnabled: true,
  }),
}));

vi.mock('@core/utils/auth', () => ({
  isLoggedIn: () => true,
}));

describe('useDashboardData', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    useMoodleStore.getState().resetSession();
    vi.spyOn(moodleApi, 'getProfile').mockResolvedValue({
      data: {
        id: 1,
        fullname: 'Student',
        email: 'student@example.com',
      },
    } as never);
  });

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }): React.ReactElement =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
  };

  it('allows moderator account without moodle linked to refresh platform data and shows success toast', async () => {
    useMoodleStore.setState({ isMoodleLinked: false });
    vi.spyOn(notificationsApi, 'getMyNotifications').mockResolvedValue({
      data: [
        {
          id: 'note-1',
          userId: 'mod-1',
          type: 'OPPORTUNITY_READY_FOR_REVIEW',
          title: 'New submission',
          message: 'Review required',
          link: '/opportunities/123',
          isRead: false,
          createdAt: '2026-10-22T10:00:00.000Z',
        },
      ],
    });

    const { result } = renderHook(() => useDashboardData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data.notifications).toHaveLength(1);
    });

    expect(result.current.hasLoadedOnce).toBe(true);

    await act(async () => {
      await result.current.refresh();
    });

    expect(notificationsApi.getMyNotifications).toHaveBeenCalled();
    expect(mockToastSuccess).toHaveBeenCalledWith('dashboard.syncSuccess');
    expect(result.current.lastSyncTime).toBeGreaterThan(0);
  });

  it('handles refresh errors gracefully for unlinked accounts', async () => {
    useMoodleStore.setState({ isMoodleLinked: false });
    vi.spyOn(notificationsApi, 'getMyNotifications').mockRejectedValue(
      new Error('HTTP error 401: Unauthorized'),
    );

    const { result } = renderHook(() => useDashboardData(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockToastError).toHaveBeenCalledWith('dashboard.loadError');
  });

  it('refetches both moodle and platform data when moodle is linked', async () => {
    useMoodleStore.setState({ isMoodleLinked: true });
    vi.spyOn(moodleApi, 'getCourses').mockResolvedValue({ data: [] });
    vi.spyOn(moodleApi, 'getGrades').mockResolvedValue({ data: { grades: [] } });
    vi.spyOn(moodleApi, 'getAssignments').mockResolvedValue({ data: [] });
    vi.spyOn(moodleApi, 'getEvents').mockResolvedValue({ data: [] });
    vi.spyOn(moodleApi, 'getNotifications').mockResolvedValue({
      data: { notifications: [], unreadcount: 0 },
    });
    vi.spyOn(moodleApi, 'getStatistics').mockResolvedValue({
      data: {
        totalCourses: 1,
        activeCourses: 1,
        completedCourses: 0,
        averageGrade: 90,
      } as never,
    });
    vi.spyOn(notificationsApi, 'getMyNotifications').mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useDashboardData(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(moodleApi.getCourses).toHaveBeenCalled();
    expect(notificationsApi.getMyNotifications).toHaveBeenCalled();
    expect(mockToastSuccess).toHaveBeenCalledWith('dashboard.syncSuccess');
  });
});
