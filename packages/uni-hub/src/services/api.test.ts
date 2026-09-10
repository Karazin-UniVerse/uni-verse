import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildQueryString, authApi, moodleApi } from './api';

describe('UniHub API Service', () => {
  const originalFetch = global.fetch;
  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    vi.clearAllMocks();

    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key];
    }

    // Mock global localStorage
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => mockStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key];
      }),
      clear: vi.fn(() => {
        for (const storageKey of Object.keys(mockStorage)) {
          delete mockStorage[storageKey];
        }
      }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllGlobals();
  });

  describe('buildQueryString', () => {
    it('should return empty string when params is undefined or null', () => {
      expect(buildQueryString()).toBe('');
      expect(buildQueryString(undefined)).toBe('');
    });

    it('should serialize basic key-value parameters', () => {
      const result = buildQueryString({ page: 1, limit: 20 });

      expect(result).toBe('?page=1&limit=20');
    });

    it('should ignore undefined, null, and empty string properties', () => {
      const result = buildQueryString({
        active: true,
        empty: '',
        nil: null,
        undef: undefined,
        search: 'algorithms',
      });

      expect(result).toBe('?active=true&search=algorithms');
    });
  });

  describe('AuthApi', () => {
    it('login should send POST to /auth/login and save tokens to localStorage', async () => {
      const mockResponseData = {
        access_token: 'jwt-access-token-12345',
        refresh_token: 'jwt-refresh-token-12345',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponseData,
      } as Response);

      const response = await authApi.login('student@karazin.ua', 'SecretPass123!');

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(response.data).toEqual(mockResponseData);
      expect(mockStorage.accessToken).toBe('jwt-access-token-12345');
      expect(mockStorage.isLoggedIn).toBe('true');
    });

    it('logout should call /auth/logout and clear tokens from localStorage', async () => {
      mockStorage.accessToken = 'jwt-token-to-remove';
      mockStorage.isLoggedIn = 'true';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Logged out successfully' }),
      } as Response);

      await authApi.logout();

      expect(mockStorage.accessToken).toBeUndefined();
      expect(mockStorage.isLoggedIn).toBeUndefined();
    });
  });

  describe('MoodleApi', () => {
    it('getCourses should request /moodle/courses', async () => {
      const mockCourses = [{ id: 101, fullname: 'Основи програмування' }];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockCourses,
      } as Response);

      const response = await moodleApi.getCourses();

      expect(response.data).toEqual(mockCourses);
      expect(vi.mocked(global.fetch).mock.calls[0][0]).toContain('/moodle/courses');
    });

    it('getGrades should request /moodle/grades', async () => {
      const mockGrades = { grades: [{ courseId: 101, grade: '95' }] };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockGrades,
      } as Response);

      const response = await moodleApi.getGrades();

      expect(response.data).toEqual(mockGrades);
      expect(vi.mocked(global.fetch).mock.calls[0][0]).toContain('/moodle/grades');
    });

    it('getAssignments should serialize parameters into query string', async () => {
      const mockAssignments = [{ id: 1, name: 'Лабораторна 1' }];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockAssignments,
      } as Response);

      const res = await moodleApi.getAssignments({
        status: 'not_completed',
        sortByDate: 'asc',
      });

      expect(res.data).toEqual(mockAssignments);
      const calledUrl = (global.fetch as unknown as { mock: { calls: [string][] } }).mock
        .calls[0][0];

      expect(calledUrl).toContain('status=not_completed');
      expect(calledUrl).toContain('sortByDate=asc');
    });

    it('getEvents, getNotifications, and getStatistics should query endpoints', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      } as Response);

      await moodleApi.getEvents();
      await moodleApi.getNotifications();
      await moodleApi.getStatistics();

      const fetchMock = vi.mocked(global.fetch);

      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(fetchMock.mock.calls[0][0]).toContain('/moodle/events');
      expect(fetchMock.mock.calls[1][0]).toContain('/moodle/notifications');
      expect(fetchMock.mock.calls[2][0]).toContain('/moodle/statistics');
    });

    it('getCourseContents and getAssignmentStatus should query parametrized routes', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as Response);

      await moodleApi.getCourseContents(205);
      await moodleApi.getAssignmentStatus(412);

      const fetchMock = vi.mocked(global.fetch);

      expect(fetchMock.mock.calls[0][0]).toContain('/moodle/courses/205/contents');
      expect(fetchMock.mock.calls[1][0]).toContain('/moodle/assignments/412/status');
    });

    it('submitAssignment and uploadFile should send POST with JSON payload', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await moodleApi.submitAssignment(412, 'Done text', 10);
      await moodleApi.uploadFile('lab1.pdf', 'base64-data');

      const fetchMock = vi.mocked(global.fetch);

      expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
      expect(fetchMock.mock.calls[0][1]?.body).toContain('Done text');

      expect(fetchMock.mock.calls[1][1]?.method).toBe('POST');
      expect(fetchMock.mock.calls[1][1]?.body).toContain('lab1.pdf');
    });

    it('should throw error when server returns HTTP error status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(moodleApi.getCourses()).rejects.toThrow('HTTP error 500');
    });
  });
});
