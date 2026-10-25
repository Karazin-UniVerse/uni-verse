import { isBrowser } from '@uni-hub/utils/browser';
import { queryOptions } from '@tanstack/react-query';
import { moodleKeys } from '@uni-hub/queries/moodle/queryKeys';
import type { MoodleQueryOptions } from '@uni-hub/queries/moodle/queries';
import { moodleApi } from '@uni-hub/services/api.moodle';
import { clearUserSessionStorage } from '@uni-hub/services/api.session';
import { NOTIFICATIONS_POLL_INTERVAL_MS } from '@uni-hub/constants/query';
import { notificationsApi, type PlatformNotification } from '@uni-hub/services/api.notifications';
import type { DashboardData } from '../types';
import {
  assembleDashboardData,
  buildAssignmentParams,
  isMoodleUnlinked,
  isUnauthorizedError,
  applyStoredIdentityToProfile,
  type StoredSessionIdentity,
  persistDashboardSnapshot,
  syncStudentProfile,
  type BuildAssignmentParamsOptions,
} from './helpers';

export async function loadPlatformNotifications(): Promise<PlatformNotification[]> {
  try {
    const response = await notificationsApi.getMyNotifications();

    return response.data;
  } catch (error) {
    if (isUnauthorizedError(error)) {
      clearUserSessionStorage();
    }

    throw error;
  }
}

export async function loadDashboardData(
  filters: BuildAssignmentParamsOptions,
): Promise<DashboardData> {
  try {
    const [
      coursesRes,
      gradesRes,
      assignmentsRes,
      eventsRes,
      notificationsRes,
      statsRes,
      platformNotifications,
    ] = await Promise.all([
      moodleApi.getCourses(),
      moodleApi.getGrades(),
      moodleApi.getAssignments(buildAssignmentParams(filters)),
      moodleApi.getEvents(),
      moodleApi.getNotifications(),
      moodleApi.getStatistics(),
      loadPlatformNotifications(),
    ]);

    const freshData = assembleDashboardData(
      [coursesRes, gradesRes, assignmentsRes, eventsRes, notificationsRes, statsRes],
      platformNotifications,
    );

    if (!isMoodleUnlinked()) {
      persistDashboardSnapshot(Date.now(), freshData);
    }

    return freshData;
  } catch (error) {
    if (isUnauthorizedError(error)) {
      clearUserSessionStorage();
    }

    throw error;
  }
}

export function dashboardQueryOptions(
  filters: BuildAssignmentParamsOptions,
): MoodleQueryOptions<DashboardData, ReturnType<typeof moodleKeys.dashboard>> {
  return queryOptions({
    queryKey: moodleKeys.dashboard(filters),
    queryFn: () => loadDashboardData(filters),
  });
}

/**
 * Query options for fetching, overlaying corporate identity, and synchronizing the student profile.
 */
export const profileQueryOptions = queryOptions({
  queryKey: moodleKeys.profile(),
  queryFn: async ({ signal }) => {
    const sessionSnapshot: StoredSessionIdentity | null = isBrowser
      ? {
          token: localStorage.getItem('accessToken'),
          username: localStorage.getItem('username'),
          userEmail: localStorage.getItem('userEmail'),
        }
      : null;

    const response = await moodleApi.getProfile({ signal });

    if (signal?.aborted) {
      return response.data;
    }

    if (isBrowser && sessionSnapshot) {
      const currentToken = localStorage.getItem('accessToken');
      const currentEmail = localStorage.getItem('userEmail');
      const currentUsername = localStorage.getItem('username');

      if (
        currentToken !== sessionSnapshot.token ||
        currentEmail !== sessionSnapshot.userEmail ||
        currentUsername !== sessionSnapshot.username
      ) {
        return response.data;
      }
    }

    const resolvedProfile = applyStoredIdentityToProfile(response.data, sessionSnapshot);

    syncStudentProfile(resolvedProfile);

    return resolvedProfile;
  },
});

export const notificationKeys = {
  all: ['notifications'] as const,
  platform: () => [...notificationKeys.all, 'platform'] as const,
};

export const markNotificationReadMutationKey = ['notifications', 'read'] as const;

export const markAllNotificationsReadMutationKey = ['notifications', 'read-all'] as const;

export const platformNotificationsQueryOptions = queryOptions({
  queryKey: notificationKeys.platform(),
  queryFn: loadPlatformNotifications,
  refetchInterval: NOTIFICATIONS_POLL_INTERVAL_MS,
});
