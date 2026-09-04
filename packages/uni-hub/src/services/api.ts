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
      searchParams.append(key, String(value));
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
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
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
  const token = isBrowser ? localStorage.getItem('accessToken') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token && isSecureOrLoopback(url)) {
    headers.Authorization = `Bearer ${token}`;
  }

  let attempt = 0;

  while (attempt <= retries) {
    try {
      return await executeAttempt<T>(url, options, headers, timeoutMs);
    } catch (err) {
      if (options.signal?.aborted) {
        throw err;
      }

      if (attempt < retries) {
        attempt++;
        const delay = attempt * 500;

        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw err;
      }
    }
  }

  throw new Error('Request failed');
}

export class AuthApi {
  async login(email: string, password: string): Promise<{ data: AuthResponse }> {
    const response = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.data?.access_token) {
      localStorage.setItem('accessToken', response.data.access_token);
      localStorage.setItem('isLoggedIn', 'true');
    }

    return response;
  }

  async logout(): Promise<void> {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('isLoggedIn');
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
}

export class MoodleApi {
  getCourses(): Promise<{ data: Course[] }> {
    return request<Course[]>('/moodle/courses');
  }

  getGrades(): Promise<{ data: { grades: Grade[] } }> {
    return request<{ grades: Grade[] }>('/moodle/grades');
  }

  getAssignments(params?: GetAssignmentsParams): Promise<{ data: Assignment[] }> {
    return request<Assignment[]>(
      `/moodle/assignments${buildQueryString(params as Record<string, unknown>)}`,
    );
  }

  getEvents(): Promise<{ data: MoodleEvent[] }> {
    return request<MoodleEvent[]>('/moodle/events');
  }

  getNotifications(): Promise<{ data: NotificationsResponse }> {
    return request<NotificationsResponse>('/moodle/notifications');
  }

  getStatistics(): Promise<{ data: CourseStatistics }> {
    return request<CourseStatistics>('/moodle/statistics');
  }

  getCourseContents(courseId: number): Promise<{ data: CourseSection[] }> {
    return request<CourseSection[]>(`/moodle/courses/${courseId}/contents`);
  }

  getAssignmentStatus(assignId: number): Promise<{ data: unknown }> {
    return request<unknown>(`/moodle/assignments/${assignId}/status`);
  }

  submitAssignment(
    assignId: number,
    text?: string,
    fileItemId?: number,
  ): Promise<{ data: unknown }> {
    return request<unknown>(`/moodle/assignments/${assignId}/submission`, {
      method: 'POST',
      body: JSON.stringify({ text, fileItemId }),
    });
  }

  uploadFile(filename: string, filebase64: string): Promise<{ data: unknown }> {
    return request<unknown>('/moodle/files/upload', {
      method: 'POST',
      body: JSON.stringify({ filename, filebase64 }),
    });
  }
}

export const moodleApi = new MoodleApi();

export default { request, authApi, moodleApi, AuthApi, MoodleApi };
