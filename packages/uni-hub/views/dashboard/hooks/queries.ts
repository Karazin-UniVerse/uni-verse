import { queryOptions } from '@tanstack/react-query';
import { moodleKeys } from '@uni-hub/queries/moodle/queryKeys';
import type { MoodleQueryOptions } from '@uni-hub/queries/moodle/queries';
import { moodleApi } from '@uni-hub/services/api.moodle';
import { notificationsApi, type PlatformNotification } from '@uni-hub/services/api';
import { clearUserSessionStorage } from '@uni-hub/services/api.session';
import type { DashboardData } from '../types';
import {
  assembleDashboardData,
  buildAssignmentParams,
  isMoodleUnlinked,
  isUnauthorizedError,
  persistDashboardSnapshot,
  syncStudentProfile,
  type BuildAssignmentParamsOptions,
} from './helpers';

export async function loadDashboardData(
  filters: BuildAssignmentParamsOptions,
): Promise<DashboardData> {
  try {
    const responses = await Promise.all([
      moodleApi.getCourses(),
      moodleApi.getGrades(),
      moodleApi.getAssignments(buildAssignmentParams(filters)),
      moodleApi.getEvents(),
      moodleApi.getNotifications(),
      moodleApi.getStatistics(),
    ]);
    const freshData = assembleDashboardData(responses);

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

export const profileQueryOptions = queryOptions({
  queryKey: moodleKeys.profile(),
  queryFn: async () => {
    const response = await moodleApi.getProfile();

    syncStudentProfile(response.data);

    return response.data;
  },
});

export const notificationKeys = {
  all: ['notifications'] as const,
  platform: () => [...notificationKeys.all, 'platform'] as const,
};

export const markNotificationReadMutationKey = (
  id: string,
): readonly ['notifications', 'read', string] => ['notifications', 'read', id] as const;

export const markAllNotificationsReadMutationKey = ['notifications', 'read-all'] as const;

export async function loadPlatformNotifications(): Promise<PlatformNotification[]> {
  try {
    const res = await notificationsApi.getMyNotifications();

    return res.data;
  } catch (error) {
    if (isUnauthorizedError(error)) {
      clearUserSessionStorage();
    }

    throw error;
  }
}

export const platformNotificationsQueryOptions = queryOptions({
  queryKey: notificationKeys.platform(),
  queryFn: loadPlatformNotifications,
  staleTime: 60 * 1000,
});
