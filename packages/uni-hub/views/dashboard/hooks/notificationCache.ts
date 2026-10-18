import type { QueryClient } from '@tanstack/react-query';
import { moodleKeys } from '@uni-hub/queries/moodle/queryKeys';
import type { PlatformNotification } from '@uni-hub/services/api';
import type { Notification } from '@core/types/moodle';
import type { DashboardData } from '../types';
import { notificationKeys } from './queries';

export interface NotificationRollbackContext {
  previousPlatform?: PlatformNotification[];
  previousDashboards?: Array<[readonly unknown[], DashboardData | undefined]>;
}

export function patchNotificationInDashboard(
  data: DashboardData,
  updater: (item: Notification) => Notification,
): DashboardData {
  let changed = false;
  const nextNotifications = data.notifications.map((n) => {
    const updated = updater(n);

    if (updated !== n) {
      changed = true;
    }

    return updated;
  });

  if (!changed) {
    return data;
  }

  const unreadCount = nextNotifications.filter((n) => !n.read).length;

  return {
    ...data,
    notifications: nextNotifications,
    unreadCount,
  };
}

function updatePlatformQueryCache(
  queryClient: QueryClient,
  updater: (item: PlatformNotification) => PlatformNotification,
): PlatformNotification[] | undefined {
  const previous = queryClient.getQueryData<PlatformNotification[]>(notificationKeys.platform());

  if (previous) {
    queryClient.setQueryData<PlatformNotification[]>(
      notificationKeys.platform(),
      previous.map(updater),
    );
  }

  return previous;
}

function updateDashboardQueriesCache(
  queryClient: QueryClient,
  updater: (item: Notification) => Notification,
): Array<[readonly unknown[], DashboardData | undefined]> {
  const allDashboardQueries = queryClient
    .getQueryCache()
    .findAll({ queryKey: moodleKeys.dashboards() });

  const previousDashboards: Array<[readonly unknown[], DashboardData | undefined]> = [];

  for (const query of allDashboardQueries) {
    const prevData = query.state.data as DashboardData | undefined;

    if (prevData) {
      previousDashboards.push([query.queryKey, prevData]);
      queryClient.setQueryData<DashboardData>(query.queryKey, (current) =>
        current ? patchNotificationInDashboard(current, updater) : current,
      );
    }
  }

  return previousDashboards;
}

export function optimisticallyMarkNotificationRead(
  queryClient: QueryClient,
  id: string,
): NotificationRollbackContext {
  const previousPlatform = updatePlatformQueryCache(queryClient, (item) =>
    item.id === id ? { ...item, isRead: true } : item,
  );
  const previousDashboards = updateDashboardQueriesCache(queryClient, (n) =>
    String(n.id) === id && !n.read ? { ...n, read: true } : n,
  );

  return { previousPlatform, previousDashboards };
}

export function optimisticallyMarkAllNotificationsRead(
  queryClient: QueryClient,
): NotificationRollbackContext {
  const previousPlatform = updatePlatformQueryCache(queryClient, (item) =>
    item.isRead ? item : { ...item, isRead: true },
  );
  const previousDashboards = updateDashboardQueriesCache(queryClient, (n) =>
    n.read ? n : { ...n, read: true },
  );

  return { previousPlatform, previousDashboards };
}

export function rollbackNotificationOptimisticUpdate(
  queryClient: QueryClient,
  context?: NotificationRollbackContext,
): void {
  if (!context) {
    return;
  }

  if (context.previousPlatform) {
    queryClient.setQueryData(notificationKeys.platform(), context.previousPlatform);
  }

  if (context.previousDashboards) {
    for (const [key, data] of context.previousDashboards) {
      queryClient.setQueryData(key, data);
    }
  }
}
