import axios from 'axios';
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

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Request interceptor to attach Bearer token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor with retry logic
api.interceptors.response.use(undefined, async (err) => {
  const { config } = err;
  if (!config || !config.retryCount) {
    config.retryCount = 0;
  }

  const MAX_RETRIES = 2;
  if (config.retryCount < MAX_RETRIES) {
    config.retryCount += 1;
    const delay = config.retryCount * 500;
    await new Promise((resolve) => setTimeout(resolve, delay));
    return api(config);
  }

  return Promise.reject(err);
});

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await api.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    if (res.data?.access_token) {
      localStorage.setItem('accessToken', res.data.access_token);
      localStorage.setItem('isLoggedIn', 'true');
    }
    return res;
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
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
  getCourses: () => api.get<Course[]>('/moodle/courses'),
  getGrades: () => api.get<{ grades: Grade[] }>('/moodle/grades'),
  getAssignments: (params?: GetAssignmentsParams) =>
    api.get<Assignment[]>('/moodle/assignments', { params }),
  getEvents: () => api.get<MoodleEvent[]>('/moodle/events'),
  getNotifications: () => api.get<NotificationsResponse>('/moodle/notifications'),
  getStatistics: () => api.get<CourseStatistics>('/moodle/statistics'),
  getCourseContents: (courseId: number) =>
    api.get<CourseSection[]>(`/moodle/courses/${courseId}/contents`),
  getAssignmentStatus: (assignId: number) =>
    api.get<unknown>(`/moodle/assignments/${assignId}/status`),
  submitAssignment: (assignId: number, text?: string, fileItemId?: number) =>
    api.post<unknown>(`/moodle/assignments/${assignId}/submission`, {
      text,
      fileItemId,
    }),
  uploadFile: (filename: string, filebase64: string) =>
    api.post<unknown>('/moodle/files/upload', { filename, filebase64 }),
};

export default api;
