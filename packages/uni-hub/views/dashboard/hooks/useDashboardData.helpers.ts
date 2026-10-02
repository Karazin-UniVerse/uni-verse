import { moodleApi } from '@uni-hub/services/api';
import type { Grade, Assignment } from '@uni-hub/types';
import type { StudentProfile } from '@core/types';
import type { DashboardData } from '../types';

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
  if (Array.isArray(gradesResponse?.data?.grades)) {
    return gradesResponse.data.grades;
  }

  return [];
}

export type MoodleApiResponseTuple = [
  Awaited<ReturnType<typeof moodleApi.getCourses>>,
  Awaited<ReturnType<typeof moodleApi.getGrades>>,
  Awaited<ReturnType<typeof moodleApi.getAssignments>>,
  Awaited<ReturnType<typeof moodleApi.getEvents>>,
  Awaited<ReturnType<typeof moodleApi.getNotifications>>,
  Awaited<ReturnType<typeof moodleApi.getStatistics>>,
];

export function assembleDashboardData([
  coursesRes,
  gradesRes,
  assignmentsRes,
  eventsRes,
  notificationsRes,
  statsRes,
]: MoodleApiResponseTuple): DashboardData {
  return {
    courses: Array.isArray(coursesRes?.data) ? coursesRes.data : [],
    grades: resolveGradesResponse(gradesRes),
    assignments: Array.isArray(assignmentsRes?.data) ? assignmentsRes.data : [],
    events: Array.isArray(eventsRes?.data) ? eventsRes.data : [],
    notifications: Array.isArray(notificationsRes?.data?.notifications)
      ? notificationsRes.data.notifications
      : [],
    unreadCount: notificationsRes?.data?.unreadCount || 0,
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
        assignment.submissionStatus !== 'graded' && assignment.submissionStatus !== 'submitted',
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
  if (typeof window === 'undefined') {
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
  if (typeof window === 'undefined') {
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
}

export function buildFallbackData({
  cachedData,
  previousData,
  hideCompleted,
  dateFrom,
  dateTo,
}: BuildFallbackDataOptions): DashboardData {
  const fallbackAssignments = filterFallbackAssignments({
    assignments: cachedData.assignments ?? previousData.assignments,
    hideCompleted,
    dateFrom,
    dateTo,
  });

  return {
    ...previousData,
    ...cachedData,
    assignments: fallbackAssignments,
  };
}
