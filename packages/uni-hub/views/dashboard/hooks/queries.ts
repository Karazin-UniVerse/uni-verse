import { queryOptions } from '@tanstack/react-query';
import { moodleKeys } from '@uni-hub/queries/moodle/queryKeys';
import type { MoodleQueryOptions } from '@uni-hub/queries/moodle/queries';
import { moodleApi } from '@uni-hub/services/api.moodle';
import { clearUserSessionStorage } from '@uni-hub/services/api.session';
import { notificationsApi, type PlatformNotification } from '@uni-hub/services/api.notifications';
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

export async function loadPlatformNotifications(): Promise<PlatformNotification[]> {
  try {
    const response = await notificationsApi.getMyNotifications();

    return response.data;
  } catch (error) {
    if (isUnauthorizedError(error)) {
      clearUserSessionStorage();
      throw error;
    }

    console.error('Failed to load platform notifications', error);

    return [];
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

export const platformNotificationsQueryOptions = queryOptions({
  queryKey: ['platform-notifications'] as const,
  queryFn: () => loadPlatformNotifications(),
});

export const profileQueryOptions = queryOptions({
  queryKey: moodleKeys.profile(),
  queryFn: async () => {
    const response = await moodleApi.getProfile();

    syncStudentProfile(response.data);

    return response.data;
  },
});
