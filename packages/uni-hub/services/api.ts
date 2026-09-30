import { RESPONSE_CODES } from '@core/constants/response-codes';
import type {
  AuthResponse,
  Course,
  Grade,
  Assignment,
  MoodleEvent,
  NotificationsResponse,
  CourseStatistics,
  CourseSection,
} from '@uni-hub/types';
import { isBrowser } from '@uni-hub/utils/browser';
import {
  mockCourses,
  mockGrades,
  mockEvents,
  mockNotifications,
  mockStatistics,
  mockAssignments,
  getMockAssignments,
} from './mockData';

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }

    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }

    return null;
  } catch {
    return null;
  }
}

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      const storage = getStorage();

      return storage ? storage.getItem(key) : null;
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): boolean {
    try {
      const storage = getStorage();

      if (!storage) {
        return false;
      }

      storage.setItem(key, value);

      return true;
    } catch {
      return false;
    }
  },
  removeItem(key: string): boolean {
    try {
      const storage = getStorage();

      if (!storage) {
        return false;
      }

      storage.removeItem(key);

      return true;
    } catch {
      return false;
    }
  },
};

export function isDemoMode(): boolean {
  return (
    safeStorage.getItem('isDemo') === 'true' || safeStorage.getItem('accessToken') === 'demo-token'
  );
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (isBrowser && window.location.hostname !== 'localhost'
    ? 'https://p01--backend--jm9qjnmpm4m2.code.run'
    : 'http://localhost:3001');

function isSecureOrLoopback(targetUrl: string): boolean {
  try {
    const fallbackOrigin = isBrowser ? window.location.origin : 'http://localhost';
    const parsed = new URL(targetUrl, fallbackOrigin);

    return (
      parsed.protocol === 'https:' ||
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '::1'
    );
  } catch {
    return false;
  }
}

/**
 * Builds a query string from a parameters dictionary, omitting undefined or null fields.
 */
export function buildQueryString(params?: Record<string, unknown>): string {
  if (!params) {
    return '';
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      const formattedValue =
        typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
          ? String(value)
          : JSON.stringify(value);

      searchParams.append(key, formattedValue);
    }
  }

  const queryString = searchParams.toString();

  return queryString ? `?${queryString}` : '';
}

const DEFAULT_REQUEST_TIMEOUT_MS = 10000;

async function executeAttempt<T>(
  url: string,
  options: RequestInit,
  headers: Record<string, string>,
  timeoutMs: number,
): Promise<{ data: T }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const onCallerAbort = () => controller.abort();

  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      options.signal.addEventListener('abort', onCallerAbort, { once: true });
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === RESPONSE_CODES.UNAUTHORIZED) {
        safeStorage.removeItem('isLoggedIn');
        safeStorage.removeItem('accessToken');
        safeStorage.removeItem('moodleToken');
        safeStorage.removeItem('isDemo');
        safeStorage.removeItem('universe_dashboard_data');
        safeStorage.removeItem('universe_last_sync_time');
      }

      let serverMessage: string | undefined;

      try {
        const errorJson = (await response.json()) as {
          message?: string | string[];
          error?: string;
        };

        if (Array.isArray(errorJson?.message)) {
          serverMessage = errorJson.message.join(', ');
        } else if (typeof errorJson?.message === 'string') {
          serverMessage = errorJson.message;
        } else if (typeof errorJson?.error === 'string') {
          serverMessage = errorJson.error;
        }
      } catch {
        // response was not JSON
      }

      throw new Error(serverMessage || `HTTP error ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as T;

    return { data };
  } finally {
    clearTimeout(timeoutId);

    if (options.signal) {
      options.signal.removeEventListener('abort', onCallerAbort);
    }
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  retries = 2,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
): Promise<{ data: T }> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = safeStorage.getItem('accessToken');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token && isSecureOrLoopback(url)) {
    headers.Authorization = `Bearer ${token}`;
  }

  const attemptRequest = async (currentAttempt: number): Promise<{ data: T }> => {
    try {
      return await executeAttempt<T>(url, options, headers, timeoutMs);
    } catch (err) {
      if (options.signal?.aborted || currentAttempt >= retries) {
        throw err;
      }

      const nextAttempt = currentAttempt + 1;
      const delay = nextAttempt * 500;

      await new Promise((resolve) => setTimeout(resolve, delay));

      return attemptRequest(nextAttempt);
    }
  };

  return attemptRequest(0);
}

export interface GoogleAuthResponse {
  access_token: string;
  isLinked: boolean;
}

export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }

  const resData = (err as { response?: { data?: { message?: string; error?: string } } })?.response
    ?.data;

  return resData?.message || resData?.error || fallback;
}

export class AuthApi {
  async login(email: string, password: string): Promise<{ data: AuthResponse }> {
    if (email === 'demo' && password === 'demo') {
      const mockAuth: AuthResponse = {
        access_token: 'demo-token',
        token: 'demo-token',
        userID: 'karazin-student-001',
      };

      const persisted =
        safeStorage.setItem('accessToken', 'demo-token') &&
        safeStorage.setItem('moodleToken', 'demo-token') &&
        safeStorage.setItem('isLoggedIn', 'true') &&
        safeStorage.setItem('isDemo', 'true');

      if (!persisted && isBrowser) {
        throw new Error('Не вдалося зберегти сесію: доступ до локального сховища заборонено');
      }

      return { data: mockAuth };
    }

    const response = await request<AuthResponse>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
      0,
    );

    if (response.data?.access_token) {
      safeStorage.setItem('accessToken', response.data.access_token);
      safeStorage.setItem('isLoggedIn', 'true');
      safeStorage.removeItem('isDemo');
    }

    return response;
  }

  async loginWithGoogle(idToken: string): Promise<{ data: GoogleAuthResponse }> {
    const response = await request<GoogleAuthResponse>(
      '/auth/google',
      {
        method: 'POST',
        body: JSON.stringify({ idToken }),
      },
      0,
    );

    if (response.data?.access_token) {
      localStorage.setItem('accessToken', response.data.access_token);

      if (response.data.isLinked) {
        localStorage.setItem('isLoggedIn', 'true');
      }
    }

    return response;
  }

  async linkMoodleAccount(
    username: string,
    password: string,
  ): Promise<{ data: { access_token: string; isLinked: boolean } }> {
    const response = await request<{ access_token: string; isLinked: boolean }>(
      '/auth/moodle/link',
      {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      },
      0,
    );

    if (response.data?.access_token) {
      localStorage.setItem('accessToken', response.data.access_token);

      if (response.data.isLinked) {
        localStorage.setItem('isLoggedIn', 'true');
      }
    }

    return response;
  }

  async logout(): Promise<void> {
    try {
      if (!isDemoMode()) {
        await request('/auth/logout', { method: 'POST' }, 0);
      }
    } finally {
      safeStorage.removeItem('accessToken');
      safeStorage.removeItem('isLoggedIn');
      safeStorage.removeItem('moodleToken');
      safeStorage.removeItem('isDemo');
      safeStorage.removeItem('universe_dashboard_data');
      safeStorage.removeItem('universe_last_sync_time');
    }
  }
}

export const authApi = new AuthApi();

export interface GetAssignmentsParams {
  dateFrom?: number;
  dateTo?: number;
  semester?: string;
  sortByDate?: 'asc' | 'desc';
  status?: 'completed' | 'not_completed';
  year?: string;
  includeStatus?: boolean;
}

export class MoodleApi {
  getCourses(): Promise<{ data: Course[] }> {
    if (isDemoMode()) {
      return Promise.resolve({ data: mockCourses });
    }

    return request<Course[]>('/moodle/courses');
  }

  getGrades(): Promise<{ data: { grades: Grade[] } }> {
    if (isDemoMode()) {
      return Promise.resolve({ data: { grades: mockGrades } });
    }

    return request<{ grades: Grade[] }>('/moodle/grades');
  }

  getAssignments(params?: GetAssignmentsParams): Promise<{ data: Assignment[] }> {
    if (isDemoMode()) {
      return Promise.resolve({ data: getMockAssignments(params) });
    }

    return request<Assignment[]>(
      `/moodle/assignments${buildQueryString(params as Record<string, unknown>)}`,
    );
  }

  getEvents(): Promise<{ data: MoodleEvent[] }> {
    if (isDemoMode()) {
      return Promise.resolve({ data: mockEvents });
    }

    return request<MoodleEvent[]>('/moodle/events');
  }

  getNotifications(): Promise<{ data: NotificationsResponse }> {
    if (isDemoMode()) {
      return Promise.resolve({ data: mockNotifications });
    }

    return request<NotificationsResponse>('/moodle/notifications');
  }

  getStatistics(): Promise<{ data: CourseStatistics }> {
    if (isDemoMode()) {
      return Promise.resolve({ data: mockStatistics });
    }

    return request<CourseStatistics>('/moodle/statistics');
  }

  getCourseContents(courseId: number): Promise<{ data: CourseSection[] }> {
    if (isDemoMode()) {
      return Promise.resolve({ data: [] });
    }

    return request<CourseSection[]>(`/moodle/courses/${courseId}/contents`);
  }

  getAssignmentStatus(assignId: number): Promise<{ data: unknown }> {
    if (isDemoMode()) {
      const match = mockAssignments.find((assignment) => assignment.id === assignId);

      return Promise.resolve({
        data: {
          lastattempt: {
            gradingstatus: match?.graded ? 'graded' : 'notgraded',
            submission: {
              status: match?.submissionStatus || 'new',
              timemodified: match?.submittedAt,
            },
          },
          feedback: match?.grade ? { grade: { grade: String(match.grade) } } : undefined,
        },
      });
    }

    return request<unknown>(`/moodle/assignments/${assignId}/status`);
  }

  submitAssignment(
    assignId: number,
    text?: string,
    fileItemId?: number,
  ): Promise<{ data: unknown }> {
    if (isDemoMode()) {
      return Promise.resolve({ data: { status: true } });
    }

    return request<unknown>(`/moodle/assignments/${assignId}/submission`, {
      method: 'POST',
      body: JSON.stringify({ text, fileItemId }),
    });
  }

  uploadFile(filename: string, filebase64: string): Promise<{ data: unknown }> {
    if (isDemoMode()) {
      return Promise.resolve({ data: { itemid: 12345 } });
    }

    return request<unknown>('/moodle/files/upload', {
      method: 'POST',
      body: JSON.stringify({ filename, filebase64 }),
    });
  }
}

export const moodleApi = new MoodleApi();

export default { request, authApi, moodleApi, AuthApi, MoodleApi };
