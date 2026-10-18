import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { notificationsApi, type PlatformNotification } from '@uni-hub/services/api';
import { notificationKeys } from './queries';
import { useNotificationActions } from './useNotificationActions';

const mockToast = {
  error: vi.fn(),
  success: vi.fn(),
};

vi.mock('@una', () => ({
  useToast: () => mockToast,
}));

vi.mock('@uni-hub/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    formatMessage: (key: string) => key,
  }),
}));

describe('useNotificationActions', () => {
  let queryClient: QueryClient;

  const mockNotifications: PlatformNotification[] = [
    {
      id: 'plat-1',
      userId: 'user-1',
      title: 'Opportunity',
      message: 'Someone applied',
      link: '/opportunities/1',
      isRead: false,
      createdAt: '2026-04-18T00:00:00.000Z',
    },
    {
      id: 'plat-2',
      userId: 'user-1',
      title: 'Opportunity 2',
      message: 'Decision made',
      link: '/opportunities/2',
      isRead: false,
      createdAt: '2026-04-17T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    queryClient.setQueryData(notificationKeys.platform(), [
      { ...mockNotifications[0]! },
      { ...mockNotifications[1]! },
    ]);
  });

  function createWrapper(): React.FC<{ children: React.ReactNode }> {
    return ({ children }: { children: React.ReactNode }): React.ReactElement =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
  }

  it('marks a single notification as read and calls notificationsApi.markAsRead', async () => {
    vi.spyOn(notificationsApi, 'markAsRead').mockResolvedValue({
      data: { ...mockNotifications[0]!, isRead: true },
    });

    const { result } = renderHook(() => useNotificationActions(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.markAsRead('plat-1');
    });

    await waitFor(() => {
      expect(notificationsApi.markAsRead).toHaveBeenCalledWith('plat-1');

      const cache = queryClient.getQueryData<PlatformNotification[]>(notificationKeys.platform());

      expect(cache?.find((n) => n.id === 'plat-1')?.isRead).toBe(true);
    });
  });

  it('rolls back and displays toast error if markAsRead fails', async () => {
    vi.spyOn(notificationsApi, 'markAsRead').mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useNotificationActions(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.markAsRead('plat-1');
    });

    await waitFor(() => {
      const cache = queryClient.getQueryData<PlatformNotification[]>(notificationKeys.platform());

      expect(cache?.find((n) => n.id === 'plat-1')?.isRead).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith('notifications.error.markReadFailed');
    });
  });

  it('marks all platform notifications as read and calls notificationsApi.markAllAsRead', async () => {
    vi.spyOn(notificationsApi, 'markAllAsRead').mockResolvedValue({
      data: { count: 2 },
    });

    const { result } = renderHook(() => useNotificationActions(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.markAllAsRead();
    });

    await waitFor(() => {
      expect(notificationsApi.markAllAsRead).toHaveBeenCalledTimes(1);

      const cache = queryClient.getQueryData<PlatformNotification[]>(notificationKeys.platform());

      expect(cache?.every((n) => n.isRead)).toBe(true);
    });
  });

  it('rolls back and displays toast error if markAllAsRead fails', async () => {
    vi.spyOn(notificationsApi, 'markAllAsRead').mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useNotificationActions(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.markAllAsRead();
    });

    await waitFor(() => {
      const cache = queryClient.getQueryData<PlatformNotification[]>(notificationKeys.platform());

      expect(cache?.every((n) => !n.isRead)).toBe(true);
      expect(mockToast.error).toHaveBeenCalledWith('notifications.error.markReadFailed');
    });
  });
});
