import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { moodleApi } from '@uni-hub/services/api.moodle';
import { notificationsApi } from '@uni-hub/services/api.notifications';
import { useMoodleStore } from '@uni-hub/store/useMoodleStore';
import { useDashboardData } from './useDashboardData';
import { STUDENT_PROFILE_STORAGE_KEY } from '../constants';
import { fallbackStudentProfile } from '@uni-hub/utils/test-fixtures';
import { moodleKeys } from '@uni-hub/queries/moodle/queryKeys';
import { endSession } from '@uni-hub/services/api.session';

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
      data: fallbackStudentProfile,
    });
  });

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }): React.ReactElement =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
  };

  it('should not expose a demo profile before a profile has loaded', () => {
    useMoodleStore.setState({ isMoodleLinked: false });
    vi.spyOn(notificationsApi, 'getMyNotifications').mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useDashboardData(), { wrapper: createWrapper() });

    expect(result.current.studentProfile).toBeNull();
  });

  it('should not substitute a stored username or cached identity for a loaded profile', () => {
    useMoodleStore.setState({ isMoodleLinked: false });
    localStorage.setItem('username', 'Next Account');
    localStorage.setItem(
      STUDENT_PROFILE_STORAGE_KEY,
      JSON.stringify({ ...fallbackStudentProfile, fullName: 'Previous Account' }),
    );
    vi.spyOn(notificationsApi, 'getMyNotifications').mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useDashboardData(), { wrapper: createWrapper() });

    expect(result.current.studentProfile).toBeNull();
  });

  it('should clear the displayed profile between account sessions', () => {
    useMoodleStore.setState({ isMoodleLinked: false });
    vi.spyOn(notificationsApi, 'getMyNotifications').mockResolvedValue({ data: [] });
    queryClient.setQueryData(moodleKeys.profile(), {
      ...fallbackStudentProfile,
      fullName: 'First Account',
    });

    const { result, unmount } = renderHook(() => useDashboardData(), {
      wrapper: createWrapper(),
    });

    expect(result.current.studentProfile?.fullName).toBe('First Account');
    unmount();
    endSession(queryClient);
    localStorage.setItem('username', 'Second Account');

    const nextSession = renderHook(() => useDashboardData(), { wrapper: createWrapper() });

    expect(nextSession.result.current.studentProfile).toBeNull();
  });

  it('should show no profile during a delayed request and display the fetched identity afterwards', async () => {
    useMoodleStore.setState({ isMoodleLinked: true });
    localStorage.setItem('username', 'Stored Login');
    localStorage.setItem('authProvider', 'credentials');
    let resolveProfile!: (response: Awaited<ReturnType<typeof moodleApi.getProfile>>) => void;
    const profileResponse = new Promise<Awaited<ReturnType<typeof moodleApi.getProfile>>>(
      (resolve) => {
        resolveProfile = resolve;
      },
    );

    vi.mocked(moodleApi.getProfile).mockReturnValueOnce(profileResponse);
    vi.spyOn(moodleApi, 'getCourses').mockResolvedValue({ data: [] });
    vi.spyOn(moodleApi, 'getGrades').mockResolvedValue({ data: { grades: [] } });
    vi.spyOn(moodleApi, 'getAssignments').mockResolvedValue({ data: [] });
    vi.spyOn(moodleApi, 'getEvents').mockResolvedValue({ data: [] });
    vi.spyOn(moodleApi, 'getNotifications').mockResolvedValue({
      data: { notifications: [], unreadcount: 0 },
    });
    vi.spyOn(moodleApi, 'getStatistics').mockResolvedValue({ data: { total: 0 } });
    vi.spyOn(notificationsApi, 'getMyNotifications').mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useDashboardData(), { wrapper: createWrapper() });

    expect(result.current.studentProfile).toBeNull();
    await act(async () => {
      resolveProfile({ data: { ...fallbackStudentProfile, fullName: 'Fetched Student' } });
      await profileResponse;
    });
    await waitFor(() => {
      expect(result.current.studentProfile?.fullName).toBe('Fetched Student');
    });
  });

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
