import type { PlatformNotification } from '@uni-hub/services/api.notifications';
import { asList } from '@uni-hub/utils/arrays';
import { isBrowser } from '@uni-hub/utils/browser';
import type {
  Grade,
  Assignment,
  Notification,
  MoodleCourse,
  MoodleEvent,
  NotificationsResponse,
  CourseStatistics,
} from '@core/types/moodle';
import { moodleApi } from '@uni-hub/services/api';
import type { StudentProfile } from '@core/types';
import type { DashboardData } from '../types';
import { fallbackStudentProfile } from '../constants';

export type GradesApiResponse = Awaited<ReturnType<typeof moodleApi.getGrades>>;

export function parseDateFilterSeconds(dateString?: string): number | null {
  if (!dateString) {
    return null;
  }

  const dateParts = dateString.split('-');

  if (dateParts.length !== 3) {
    return null;
  }

  const [yearStr, monthStr, dayStr] = dateParts;
  const expectedYear = Number.parseInt(yearStr, 10);
  const expectedMonth = Number.parseInt(monthStr, 10);
  const expectedDay = Number.parseInt(dayStr, 10);

  const parsedDate = new Date(dateString);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.getFullYear() > 2099 ||
    parsedDate.getUTCFullYear() > 2099
  ) {
    return null;
  }

  const matchesUtc =
    parsedDate.getUTCFullYear() === expectedYear &&
    parsedDate.getUTCMonth() + 1 === expectedMonth &&
    parsedDate.getUTCDate() === expectedDay;
  const matchesLocal =
    parsedDate.getFullYear() === expectedYear &&
    parsedDate.getMonth() + 1 === expectedMonth &&
    parsedDate.getDate() === expectedDay;

  if (!matchesUtc && !matchesLocal) {
    return null;
  }

  return Math.floor(parsedDate.getTime() / 1000);
}

export function resolveGradesResponse(gradesResponse?: GradesApiResponse | null): Grade[] {
  return asList(gradesResponse?.data?.grades);
}

export type MoodleApiResponseTuple = [
  { data?: MoodleCourse[] | null },
  GradesApiResponse,
  { data?: Assignment[] | null },
  { data?: MoodleEvent[] | null },
  { data?: NotificationsResponse | null },
  { data?: CourseStatistics | null },
];

export function mapPlatformNotification(item: PlatformNotification): Notification {
  return {
    id: item.id,
    subject: item.title,
    message: item.message,
    timecreated: Math.floor(new Date(item.createdAt).getTime() / 1000),
    read: item.isRead,
  };
}

export function applyPlatformNotifications(
  previousData: DashboardData,
  platformNotifications?: PlatformNotification[] | null,
): DashboardData {
  const platformItems = asList(platformNotifications);
  const keptMoodle = isMoodleUnlinked()
    ? []
    : previousData.notifications.filter((item) => typeof item.id === 'number');
  const mapped = platformItems.map(mapPlatformNotification);

  return {
    ...previousData,
    notifications: [...keptMoodle, ...mapped].sort(
      (first, second) => second.timecreated - first.timecreated,
    ),
    unreadCount:
      keptMoodle.filter((item) => !item.read).length +
      platformItems.filter((notification) => !notification.isRead).length,
  };
}

export function assembleDashboardData(
  [
    coursesRes,
    gradesRes,
    assignmentsRes,
    eventsRes,
    notificationsRes,
    statsRes,
  ]: MoodleApiResponseTuple,
  platformNotifications: PlatformNotification[] = [],
): DashboardData {
  const moodleList = asList(notificationsRes?.data?.notifications);
  const platformList = platformNotifications.map(mapPlatformNotification);
  const combinedNotifications = [...moodleList, ...platformList].sort(
    (first, second) => second.timecreated - first.timecreated,
  );
  const moodleUnread =
    notificationsRes?.data?.unreadcount ?? notificationsRes?.data?.unreadCount ?? 0;
  const platformUnread = platformNotifications.filter(
    (notification) => !notification.isRead,
  ).length;

  return {
    courses: asList(coursesRes?.data),
    grades: resolveGradesResponse(gradesRes),
    assignments: asList(assignmentsRes?.data),
    events: asList(eventsRes?.data),
    notifications: combinedNotifications,
    unreadCount: moodleUnread + platformUnread,
    statistics: statsRes?.data || null,
  };
}

export type BuildAssignmentParamsOptions = {
  sortOrder: 'asc' | 'desc';
  dateFrom: string;
  dateTo: string;
  hideCompleted: boolean;
};

export function buildAssignmentParams({
  sortOrder,
  dateFrom,
  dateTo,
  hideCompleted,
}: BuildAssignmentParamsOptions): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {
    sortByDate: sortOrder,
    includeStatus: true,
  };
  const fromTimestamp = parseDateFilterSeconds(dateFrom);
  const toTimestamp = parseDateFilterSeconds(dateTo);

  if (fromTimestamp !== null) {
    params.dateFrom = fromTimestamp;
  }

  if (toTimestamp !== null) {
    params.dateTo = toTimestamp;
  }

  if (hideCompleted) {
    params.status = 'not_completed';
  }

  return params;
}

export function loadCachedDashboardData(): Partial<DashboardData> | null {
  try {
    const raw = localStorage.getItem('universe_dashboard_data');

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<DashboardData>;

    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function persistDashboardSnapshot(timestamp: number, freshData: DashboardData): void {
  try {
    localStorage.setItem('universe_last_sync_time', String(timestamp));
    localStorage.setItem('universe_dashboard_data', JSON.stringify(freshData));
  } catch {
    // Ignore localStorage quota error
  }
}

export function isUnauthorizedError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return message.includes('401') || message.includes('unauthorized');
}

export function clearUserSessionStorage(): void {
  try {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('moodleToken');
    localStorage.removeItem('username');
    localStorage.removeItem('universe_student_profile');
    localStorage.removeItem('universe_dashboard_data');
    localStorage.removeItem('universe_last_sync_time');
  } catch {
    // Ignore storage errors
  }
}

export type FilterFallbackAssignmentsOptions = {
  assignments: Assignment[] | undefined;
  hideCompleted: boolean;
  dateFrom?: string;
  dateTo?: string;
};

export function filterFallbackAssignments({
  assignments,
  hideCompleted,
  dateFrom,
  dateTo,
}: FilterFallbackAssignmentsOptions): Assignment[] {
  let list = assignments ?? [];

  if (hideCompleted) {
    list = list.filter(
      (assignment) =>
        assignment.submissionStatus !== 'graded' &&
        assignment.submissionStatus !== 'submitted' &&
        !assignment.isLate &&
        !assignment.submittedAt,
    );
  }

  const fromSec = parseDateFilterSeconds(dateFrom);

  if (fromSec !== null) {
    list = list.filter((assignment) => assignment.duedate > 0 && assignment.duedate >= fromSec);
  }

  const toSec = parseDateFilterSeconds(dateTo);

  if (toSec !== null) {
    list = list.filter((assignment) => assignment.duedate > 0 && assignment.duedate <= toSec);
  }

  return list;
}

export function getInitialSyncTime(): number | null {
  if (!isBrowser) {
    return null;
  }

  try {
    const stored = localStorage.getItem('universe_last_sync_time');

    if (!stored) {
      return null;
    }

    const parsed = Number(stored);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

const REQUIRED_PROFILE_KEYS = Object.keys(fallbackStudentProfile).filter(
  (key: string) => key !== 'avatarUrl',
);

function isStudentProfile(value: unknown): value is StudentProfile {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return REQUIRED_PROFILE_KEYS.every(
    (key: string) => record[key] !== undefined && record[key] !== null,
  );
}

function getCachedUserProfile(): StudentProfile | null {
  try {
    const cachedProfile = localStorage.getItem('universe_student_profile');

    if (!cachedProfile) return null;

    const parsedProfile: unknown = JSON.parse(cachedProfile);

    if (isStudentProfile(parsedProfile)) {
      return parsedProfile;
    }
  } catch {
    // ignore invalid JSON / storage errors
  }

  return null;
}

export function getInitialUserProfile(): StudentProfile | null {
  const cachedProfile = getCachedUserProfile();

  if (cachedProfile) {
    return cachedProfile;
  }

  const savedUser = localStorage.getItem('username');

  if (!savedUser || savedUser === fallbackStudentProfile.fullName) {
    return null;
  }

  return {
    ...fallbackStudentProfile,
    fullName: savedUser,
    email: savedUser.includes('@') ? savedUser : `${savedUser}@karazin.ua`,
  };
}

export function syncStudentProfile(
  profileData?: StudentProfile | null,
  setStudentProfile?: (profile: StudentProfile) => void,
): void {
  if (!profileData) {
    return;
  }

  setStudentProfile?.(profileData);

  try {
    localStorage.setItem('universe_student_profile', JSON.stringify(profileData));
  } catch {
    // Ignore storage quota errors
  }
}

export function isMoodleUnlinked(): boolean {
  if (!isBrowser) {
    return false;
  }

  return localStorage.getItem('isMoodleLinked') === 'false';
}

export interface BuildFallbackDataOptions {
  cachedData: Partial<DashboardData>;
  previousData: DashboardData;
  hideCompleted: boolean;
  dateFrom: string;
  dateTo: string;
  platformNotifications?: PlatformNotification[] | null;
}

export function buildFallbackData({
  cachedData,
  previousData,
  hideCompleted,
  dateFrom,
  dateTo,
  platformNotifications,
}: BuildFallbackDataOptions): DashboardData {
  const fallbackAssignments = filterFallbackAssignments({
    assignments: cachedData.assignments ?? previousData.assignments,
    hideCompleted,
    dateFrom,
    dateTo,
  });

  const merged: DashboardData = {
    ...previousData,
    ...cachedData,
    assignments: fallbackAssignments,
  };

  return platformNotifications ? applyPlatformNotifications(merged, platformNotifications) : merged;
}
