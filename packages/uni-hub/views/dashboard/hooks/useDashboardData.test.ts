import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { DashboardData } from '../types';
import { fallbackStudentProfile } from '../constants';
import { useDashboardData, type UseDashboardDataOptions } from './useDashboardData';

const { mockToast, mockMoodleApi } = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
  mockMoodleApi: {
    getCourses: vi.fn(),
    getGrades: vi.fn(),
    getAssignments: vi.fn(),
    getEvents: vi.fn(),
    getNotifications: vi.fn(),
    getStatistics: vi.fn(),
    getProfile: vi.fn(),
  },
}));

vi.mock('@una', () => ({
  useToast: () => mockToast,
}));

vi.mock('@uni-hub/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    localeTag: 'en-US',
    setLanguage: vi.fn(),
    formatMessage: (key: string) => key,
  }),
}));

vi.mock('@uni-hub/services/api', () => ({
  moodleApi: mockMoodleApi,
}));

const mockCourses = [{ id: 1, fullname: 'Mathematics', shortname: 'MATH' }];

const mockGrades = [{ courseId: 1, grade: '95', courseName: 'Mathematics' }];

const mockAssignments = [{ id: 10, name: 'Homework 1', duedate: 1735689600 }];

const mockEvents = [{ id: 20, name: 'Lecture 1' }];

const mockNotifications = [{ id: 30, text: 'New assignment posted' }];

const mockStatistics = {
  completedCourses: 3,
  totalCourses: 5,
};

const defaultOptions: UseDashboardDataOptions = {
  sortOrder: 'asc',
  dateFrom: '',
  dateTo: '',
  hideCompleted: false,
  onUnauthorized: vi.fn(),
  enabled: true,
};

describe('useDashboardData', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();

    mockMoodleApi.getCourses.mockResolvedValue({ data: mockCourses });
    mockMoodleApi.getGrades.mockResolvedValue({ data: { grades: mockGrades } });
    mockMoodleApi.getAssignments.mockResolvedValue({ data: mockAssignments });
    mockMoodleApi.getEvents.mockResolvedValue({ data: mockEvents });
    mockMoodleApi.getNotifications.mockResolvedValue({
      data: { notifications: mockNotifications, unreadCount: 1 },
    });
    mockMoodleApi.getStatistics.mockResolvedValue({ data: mockStatistics });
    mockMoodleApi.getProfile.mockResolvedValue({ data: fallbackStudentProfile });
  });

  describe('initialization', () => {
    it('should initialize with empty data and loading true when enabled is true', () => {
      const { result } = renderHook(() => useDashboardData(defaultOptions));

      expect(result.current.loading).toBe(true);
      expect(result.current.hasLoadedOnce).toBe(false);
      expect(result.current.lastSyncTime).toBeNull();
      expect(result.current.isOfflineData).toBe(false);
      expect(result.current.studentProfile).toBeNull();
      expect(result.current.data).toEqual({
        courses: [],
        grades: [],
        assignments: [],
        events: [],
        notifications: [],
        unreadCount: 0,
        statistics: null,
      });
    });

    it('should initialize with loading false when enabled is false', () => {
      const { result } = renderHook(() => useDashboardData({ ...defaultOptions, enabled: false }));

      expect(result.current.loading).toBe(false);
      expect(result.current.hasLoadedOnce).toBe(false);
    });

    it('should initialize with cached data and hasLoadedOnce true when cache exists', () => {
      const cachedData: Partial<DashboardData> = {
        courses: mockCourses as any,
        unreadCount: 3,
      };
      const cachedSyncTime = 1700000000000;

      window.localStorage.setItem('universe_dashboard_data', JSON.stringify(cachedData));
      window.localStorage.setItem('universe_last_sync_time', String(cachedSyncTime));

      const { result } = renderHook(() => useDashboardData(defaultOptions));

      expect(result.current.hasLoadedOnce).toBe(true);
      expect(result.current.lastSyncTime).toBe(cachedSyncTime);
      expect(result.current.data.courses).toEqual(mockCourses);
      expect(result.current.data.unreadCount).toBe(3);
      expect(result.current.data.grades).toEqual([]);
    });
  });

  describe('fetching data', () => {
    it('should fetch and assemble dashboard data successfully when enabled', async () => {
      const { result } = renderHook(() => useDashboardData(defaultOptions));

      await act(async () => {
        await result.current.fetchData();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.hasLoadedOnce).toBe(true);
      expect(result.current.isOfflineData).toBe(false);
      expect(result.current.data.courses).toEqual(mockCourses);
      expect(result.current.data.grades).toEqual(mockGrades);
      expect(result.current.data.assignments).toEqual(mockAssignments);
      expect(result.current.data.events).toEqual(mockEvents);
      expect(result.current.data.notifications).toEqual(mockNotifications);
      expect(result.current.data.unreadCount).toBe(1);
      expect(result.current.data.statistics).toEqual(mockStatistics);
      expect(result.current.studentProfile).toEqual(fallbackStudentProfile);
      expect(result.current.lastSyncTime).toEqual(expect.any(Number));

      expect(window.localStorage.getItem('universe_dashboard_data')).not.toBeNull();
      expect(window.localStorage.getItem('universe_last_sync_time')).not.toBeNull();
      expect(window.localStorage.getItem('universe_student_profile')).toBe(
        JSON.stringify(fallbackStudentProfile),
      );
      expect(mockToast.success).not.toHaveBeenCalled();
    });

    it('should pass filter parameters to moodleApi getAssignments', async () => {
      const { result } = renderHook(() =>
        useDashboardData({
          ...defaultOptions,
          sortOrder: 'desc',
          dateFrom: '2025-01-01',
          dateTo: '2025-01-10',
          hideCompleted: true,
        }),
      );

      await act(async () => {
        await result.current.fetchData();
      });

      expect(mockMoodleApi.getAssignments).toHaveBeenCalledWith({
        sortByDate: 'desc',
        includeStatus: true,
        status: 'not_completed',
        dateFrom: expect.any(Number),
        dateTo: expect.any(Number),
      });
    });

    it('should bypass API fetching and set loading to false when enabled is false', async () => {
      const { result } = renderHook(() => useDashboardData({ ...defaultOptions, enabled: false }));

      await act(async () => {
        await result.current.fetchData();
      });

      expect(result.current.loading).toBe(false);
      expect(mockMoodleApi.getCourses).not.toHaveBeenCalled();
      expect(mockMoodleApi.getAssignments).not.toHaveBeenCalled();
    });

    it('should handle profile fetch failure gracefully while assembling remaining dashboard data', async () => {
      mockMoodleApi.getProfile.mockRejectedValueOnce(new Error('Profile service unavailable'));

      const { result } = renderHook(() => useDashboardData(defaultOptions));

      await act(async () => {
        await result.current.fetchData();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.hasLoadedOnce).toBe(true);
      expect(result.current.studentProfile).toBeNull();
      expect(result.current.data.courses).toEqual(mockCourses);
      expect(result.current.data.grades).toEqual(mockGrades);
    });
  });

  describe('error handling', () => {
    it('should call onUnauthorized and clear session storage on 401 error', async () => {
      const onUnauthorized = vi.fn();
      const error401 = new Error('HTTP 401 Unauthorized');

      window.localStorage.setItem('accessToken', 'test-token');
      window.localStorage.setItem('username', 'student1');
      window.localStorage.setItem('universe_dashboard_data', JSON.stringify({ courses: [] }));

      mockMoodleApi.getCourses.mockRejectedValueOnce(error401);

      const { result } = renderHook(() => useDashboardData({ ...defaultOptions, onUnauthorized }));

      await act(async () => {
        await result.current.fetchData();
      });

      expect(onUnauthorized).toHaveBeenCalledTimes(1);
      expect(mockToast.error).toHaveBeenCalledWith('dashboard.sessionExpired');
      expect(window.localStorage.getItem('accessToken')).toBeNull();
      expect(window.localStorage.getItem('username')).toBeNull();
      expect(window.localStorage.getItem('universe_dashboard_data')).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it('should handle general API fetch errors and show error toast when no cache exists', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const apiError = new Error('500 Internal Server Error');

      mockMoodleApi.getCourses.mockRejectedValueOnce(apiError);

      const { result } = renderHook(() => useDashboardData(defaultOptions));

      await act(async () => {
        await result.current.fetchData();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.isOfflineData).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith('dashboard.loadError');
      expect(consoleSpy).toHaveBeenCalledWith(apiError);

      consoleSpy.mockRestore();
    });

    it('should fall back to cached data and show offline notice on API fetch error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const cachedCourses = [{ id: 99, fullname: 'Cached Course', shortname: 'CC' }];
      const cachedData: Partial<DashboardData> = {
        courses: cachedCourses as any,
        assignments: [
          { id: 101, name: 'Open Task', duedate: 0, submissionStatus: 'new', isLate: false },
          {
            id: 102,
            name: 'Completed Task',
            duedate: 0,
            submissionStatus: 'graded',
            isLate: false,
          },
        ] as any,
      };

      window.localStorage.setItem('universe_dashboard_data', JSON.stringify(cachedData));

      mockMoodleApi.getCourses.mockRejectedValueOnce(new Error('Network disconnected'));

      const { result } = renderHook(() =>
        useDashboardData({ ...defaultOptions, hideCompleted: true }),
      );

      await act(async () => {
        await result.current.fetchData();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.isOfflineData).toBe(true);
      expect(result.current.hasLoadedOnce).toBe(true);
      expect(result.current.data.courses).toEqual(cachedCourses);
      expect(result.current.data.assignments).toHaveLength(1);
      expect(result.current.data.assignments[0].id).toBe(101);
      expect(mockToast.info).toHaveBeenCalledWith('dashboard.offlineNotice');
      expect(mockToast.error).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('reload, cancellation and manual updates', () => {
    it('should trigger refetch on reload and show success toast', async () => {
      const { result } = renderHook(() => useDashboardData(defaultOptions));

      await act(async () => {
        await result.current.fetchData(true);
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.data.courses).toEqual(mockCourses);
      expect(mockToast.success).toHaveBeenCalledWith('dashboard.syncSuccess');
    });

    it('should cancel pending fetch and ignore outdated API responses', async () => {
      let resolveCourses: (value: unknown) => void = () => {};

      mockMoodleApi.getCourses.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveCourses = resolve;
          }),
      );

      const { result } = renderHook(() => useDashboardData(defaultOptions));

      let fetchPromise: Promise<void> | undefined;

      act(() => {
        fetchPromise = result.current.fetchData();
      });

      expect(result.current.loading).toBe(true);

      act(() => {
        result.current.cancelPendingFetch();
      });

      expect(result.current.loading).toBe(false);

      await act(async () => {
        resolveCourses({ data: mockCourses });
        await fetchPromise;
      });

      expect(result.current.data.courses).toEqual([]);
      expect(result.current.hasLoadedOnce).toBe(false);
    });

    it('should ignore API responses if moodle was unlinked during request', async () => {
      let resolveCourses: (value: unknown) => void = () => {};

      mockMoodleApi.getCourses.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveCourses = resolve;
          }),
      );

      const { result } = renderHook(() => useDashboardData(defaultOptions));

      let fetchPromise: Promise<void> | undefined;

      act(() => {
        fetchPromise = result.current.fetchData();
      });

      window.localStorage.setItem('isMoodleLinked', 'false');

      await act(async () => {
        resolveCourses({ data: mockCourses });
        await fetchPromise;
      });

      expect(result.current.data.courses).toEqual([]);
      expect(result.current.hasLoadedOnce).toBe(false);
      expect(mockToast.success).not.toHaveBeenCalled();
    });

    it('should allow manual updates via setData and setStudentProfile', () => {
      const { result } = renderHook(() => useDashboardData(defaultOptions));
      const customData: DashboardData = {
        courses: mockCourses as any,
        grades: [],
        assignments: [],
        events: [],
        notifications: [],
        unreadCount: 5,
        statistics: null,
      };

      act(() => {
        result.current.setData(customData);
        result.current.setStudentProfile(fallbackStudentProfile);
      });

      expect(result.current.data).toEqual(customData);
      expect(result.current.studentProfile).toEqual(fallbackStudentProfile);
    });
  });
});
