import { queryOptions } from '@tanstack/react-query';
import { moodleKeys } from '@uni-hub/queries/moodle/queryKeys';
import type { MoodleQueryOptions } from '@uni-hub/queries/moodle/queries';
import { moodleApi } from '@uni-hub/services/api.moodle';
import type { DashboardData } from '../types';
import {
  assembleDashboardData,
  buildAssignmentParams,
  clearUserSessionStorage,
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

    persistDashboardSnapshot(Date.now(), freshData);

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
