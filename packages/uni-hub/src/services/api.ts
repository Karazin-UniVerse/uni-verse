import type {
  AuthResponse,
  Course,
  Grade,
  Assignment,
  MoodleEvent,
  NotificationsResponse,
  CourseStatistics,
  CourseSection,
} from '../types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? 'https://p01--backend--jm9qjnmpm4m2.code.run'
    : 'http://localhost:3001');

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  retries = 2,
): Promise<{ data: T }> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let attempt = 0;
  while (attempt <= retries) {
    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as T;
      return { data };
    } catch (err) {
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

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.data?.access_token) {
      localStorage.setItem('accessToken', res.data.access_token);
      localStorage.setItem('isLoggedIn', 'true');
    }
    return res;
  },
  logout: async () => {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('isLoggedIn');
    }
  },
};

export interface GetAssignmentsParams {
  status?: 'completed' | 'not_completed';
  year?: string;
  semester?: string;
  sortByDate?: 'asc' | 'desc';
  dateFrom?: number;
  dateTo?: number;
}

export const moodleApi = {
  getCourses: () => request<Course[]>('/moodle/courses'),
  getGrades: () => request<{ grades: Grade[] }>('/moodle/grades'),
  getAssignments: (params?: GetAssignmentsParams) => {
    const query = params
      ? '?' +
        new URLSearchParams(
          Object.entries(params)
            .filter(([_, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)]),
        ).toString()
      : '';
    return request<Assignment[]>(`/moodle/assignments${query}`);
  },
  getEvents: () => request<MoodleEvent[]>('/moodle/events'),
  getNotifications: () => request<NotificationsResponse>('/moodle/notifications'),
  getStatistics: () => request<CourseStatistics>('/moodle/statistics'),
  getCourseContents: (courseId: number) =>
    request<CourseSection[]>(`/moodle/courses/${courseId}/contents`),
  getAssignmentStatus: (assignId: number) =>
    request<unknown>(`/moodle/assignments/${assignId}/status`),
  submitAssignment: (assignId: number, text?: string, fileItemId?: number) =>
    request<unknown>(`/moodle/assignments/${assignId}/submission`, {
      method: 'POST',
      body: JSON.stringify({ text, fileItemId }),
    }),
  uploadFile: (filename: string, filebase64: string) =>
    request<unknown>('/moodle/files/upload', {
      method: 'POST',
      body: JSON.stringify({ filename, filebase64 }),
    }),
};

export default { request, authApi, moodleApi };
