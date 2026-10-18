import { describe, it, expect, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { moodleKeys } from '@uni-hub/queries/moodle/queryKeys';
import type { PlatformNotification } from '@uni-hub/services/api';
import type { DashboardData } from '../types';
import { notificationKeys } from './queries';
import {
  patchNotificationInDashboard,
  optimisticallyMarkNotificationRead,
  optimisticallyMarkAllNotificationsRead,
  rollbackNotificationOptimisticUpdate,
} from './notificationCache';

describe('notificationCache', () => {
  let queryClient: QueryClient;
  let dashboardKey: ReturnType<typeof moodleKeys.dashboard>;

  const mockPlatformNotifications: PlatformNotification[] = [
    {
      id: 'plat-1',
      userId: 'user-1',
      type: 'OPP',
      title: 'Opportunity 1',
      message: 'Msg 1',
      link: '/opportunities/1',
      isRead: false,
      createdAt: '2026-04-18T00:00:00.000Z',
    },
    {
      id: 'plat-2',
      userId: 'user-1',
      type: 'OPP',
      title: 'Opportunity 2',
      message: 'Msg 2',
      link: '/opportunities/2',
      isRead: true,
      createdAt: '2026-04-17T00:00:00.000Z',
    },
  ];

  const mockDashboardData: DashboardData = {
    courses: [],
    grades: [],
    assignments: [],
    events: [],
    notifications: [
      {
        id: 'plat-1',
        subject: 'Opportunity 1',
        timecreated: 1000,
        read: false,
        link: '/opportunities/1',
      },
      {
        id: 'plat-2',
        subject: 'Opportunity 2',
        timecreated: 900,
        read: true,
        link: '/opportunities/2',
      },
      {
        id: 1,
        subject: 'Moodle note',
        timecreated: 800,
        read: false,
      },
    ],
    unreadCount: 2,
    statistics: null,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    dashboardKey = moodleKeys.dashboard({ sortOrder: 'asc' });
    queryClient.setQueryData(notificationKeys.platform(), [
      { ...mockPlatformNotifications[0]! },
      { ...mockPlatformNotifications[1]! },
    ]);
    queryClient.setQueryData(dashboardKey, {
      ...mockDashboardData,
      notifications: mockDashboardData.notifications.map((notification) => ({ ...notification })),
    });
  });

  describe('patchNotificationInDashboard', () => {
    it('updates matching notification and recomputes unreadCount', () => {
      const patched = patchNotificationInDashboard(mockDashboardData, (notification) =>
        notification.id === 'plat-1' ? { ...notification, read: true } : notification,
      );

      expect(patched.notifications[0].read).toBe(true);
      expect(patched.unreadCount).toBe(1);
    });

    it('returns same reference if no changes occurred', () => {
      const patched = patchNotificationInDashboard(
        mockDashboardData,
        (notification) => notification,
      );

      expect(patched).toBe(mockDashboardData);
    });
  });

  describe('optimisticallyMarkNotificationRead', () => {
    it('optimistically updates platform and dashboard queries and returns rollback context', () => {
      const rollback = optimisticallyMarkNotificationRead(queryClient, 'plat-1');

      const updatedPlatform = queryClient.getQueryData<PlatformNotification[]>(
        notificationKeys.platform(),
      );

      expect(updatedPlatform?.[0].isRead).toBe(true);

      const updatedDashboard = queryClient.getQueryData<DashboardData>(dashboardKey);

      expect(updatedDashboard?.notifications[0].read).toBe(true);
      expect(updatedDashboard?.unreadCount).toBe(1);

      expect(rollback.previousPlatform).toBeDefined();
      expect(rollback.previousDashboards).toHaveLength(1);

      rollbackNotificationOptimisticUpdate(queryClient, rollback);

      const revertedPlatform = queryClient.getQueryData<PlatformNotification[]>(
        notificationKeys.platform(),
      );

      expect(revertedPlatform?.[0].isRead).toBe(false);

      const revertedDashboard = queryClient.getQueryData<DashboardData>(dashboardKey);

      expect(revertedDashboard?.notifications[0].read).toBe(false);
      expect(revertedDashboard?.unreadCount).toBe(2);
    });
  });

  describe('optimisticallyMarkAllNotificationsRead', () => {
    it('marks all platform notifications as read while preserving moodle notification status', () => {
      const rollback = optimisticallyMarkAllNotificationsRead(queryClient);

      const updatedPlatform = queryClient.getQueryData<PlatformNotification[]>(
        notificationKeys.platform(),
      );

      expect(updatedPlatform?.every((notification) => notification.isRead)).toBe(true);

      const updatedDashboard = queryClient.getQueryData<DashboardData>(dashboardKey);

      expect(
        updatedDashboard?.notifications.find((notification) => notification.id === 'plat-1')?.read,
      ).toBe(true);
      expect(
        updatedDashboard?.notifications.find((notification) => notification.id === 1)?.read,
      ).toBe(false);
      expect(updatedDashboard?.unreadCount).toBe(1);

      rollbackNotificationOptimisticUpdate(queryClient, rollback);

      const revertedPlatform = queryClient.getQueryData<PlatformNotification[]>(
        notificationKeys.platform(),
      );

      expect(revertedPlatform?.[0].isRead).toBe(false);

      const revertedDashboard = queryClient.getQueryData<DashboardData>(dashboardKey);

      expect(
        revertedDashboard?.notifications.find((notification) => notification.id === 'plat-1')?.read,
      ).toBe(false);
      expect(revertedDashboard?.unreadCount).toBe(2);
    });
  });
});
