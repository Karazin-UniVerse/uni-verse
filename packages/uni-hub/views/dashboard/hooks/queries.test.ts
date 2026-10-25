import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';
});

vi.mock('@uni-hub/utils/browser', () => ({
  isBrowser: true,
}));

import { QueryClient } from '@tanstack/react-query';
import { moodleApi } from '@uni-hub/services/api.moodle';
import { notificationsApi } from '@uni-hub/services/api.notifications';
import type { BuildAssignmentParamsOptions } from './helpers';
import {
  dashboardQueryOptions,
  loadDashboardData,
  loadPlatformNotifications,
  notificationKeys,
  platformNotificationsQueryOptions,
  profileQueryOptions,
} from './queries';
import { fallbackStudentProfile, STUDENT_PROFILE_STORAGE_KEY } from '../constants';

const filters: BuildAssignmentParamsOptions = {
  sortOrder: 'asc',
  dateFrom: '',
  dateTo: '',
  hideCompleted: false,
};

const storage: Record<string, string> = {};

function mockMoodleResponses(): void {
  vi.spyOn(moodleApi, 'getCourses').mockResolvedValue({ data: [{ id: 1, fullname: 'Math' }] });
  vi.spyOn(moodleApi, 'getGrades').mockResolvedValue({ data: { grades: [] } });
  vi.spyOn(moodleApi, 'getAssignments').mockResolvedValue({ data: [] });
  vi.spyOn(moodleApi, 'getEvents').mockResolvedValue({ data: [] });
  vi.spyOn(moodleApi, 'getNotifications').mockResolvedValue({
    data: { notifications: [], unreadcount: 3 },
  });
  vi.spyOn(moodleApi, 'getStatistics').mockResolvedValue({ data: { total: 1 } });
  vi.spyOn(notificationsApi, 'getMyNotifications').mockResolvedValue({ data: [] });
}

beforeEach(() => {
  for (const key of Object.keys(storage)) {
    delete storage[key];
  }

  const storageMock = {
    getItem: vi.fn((key: string) => storage[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      storage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete storage[key];
    }),
  };

  vi.stubGlobal('localStorage', storageMock);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('loadDashboardData', () => {
  it('assembles the six Moodle responses into dashboard data', async () => {
    mockMoodleResponses();

    const dashboardData = await loadDashboardData(filters);

    expect(dashboardData.courses).toEqual([{ id: 1, fullname: 'Math' }]);
    expect(dashboardData.unreadCount).toBe(3);
    expect(dashboardData.statistics).toEqual({ total: 1 });
    expect(moodleApi.getAssignments).toHaveBeenCalledWith(
      expect.objectContaining({ sortByDate: 'asc', includeStatus: true }),
    );
  });

  it('stores the snapshot and the sync time after a successful load', async () => {
    mockMoodleResponses();

    await loadDashboardData(filters);

    expect(JSON.parse(storage.universe_dashboard_data).courses).toEqual([
      { id: 1, fullname: 'Math' },
    ]);
    expect(Number(storage.universe_last_sync_time)).toBeGreaterThan(0);
  });

  it('clears the session storage and rethrows when the session is unauthorized', async () => {
    mockMoodleResponses();
    vi.spyOn(moodleApi, 'getCourses').mockRejectedValue(new Error('HTTP error 401: Unauthorized'));
    storage.accessToken = 'token';
    storage.universe_dashboard_data = '{}';

    await expect(loadDashboardData(filters)).rejects.toThrow('401');

    expect(storage.accessToken).toBeUndefined();
    expect(storage.universe_dashboard_data).toBeUndefined();
  });

  it('does not rewrite the snapshot when Moodle was unlinked while the request ran', async () => {
    mockMoodleResponses();
    storage.isMoodleLinked = 'false';

    await loadDashboardData(filters);

    expect(storage.universe_dashboard_data).toBeUndefined();
    expect(storage.universe_last_sync_time).toBeUndefined();
  });

  it('keeps the stored snapshot when the request fails for another reason', async () => {
    mockMoodleResponses();
    vi.spyOn(moodleApi, 'getCourses').mockRejectedValue(new Error('HTTP error 500'));
    storage.accessToken = 'token';
    storage.universe_dashboard_data = '{"courses":[]}';

    await expect(loadDashboardData(filters)).rejects.toThrow('500');

    expect(storage.accessToken).toBe('token');
    expect(storage.universe_dashboard_data).toBe('{"courses":[]}');
  });

  it('combines Moodle notifications with platform notifications when available', async () => {
    mockMoodleResponses();
    vi.spyOn(notificationsApi, 'getMyNotifications').mockResolvedValue({
      data: [
        {
          id: 'plat-1',
          userId: 'user-1',
          title: 'Opportunity Moderated',
          message: 'Approved',
          type: 'OPPORTUNITY_MODERATED',
          isRead: false,
          createdAt: new Date(1_788_000_000 * 1000).toISOString(),
        },
      ],
    });

    const dashboardData = await loadDashboardData(filters);

    expect(dashboardData.notifications.some((n) => n.id === 'plat-1')).toBe(true);
    expect(dashboardData.unreadCount).toBe(4);
  });
});

describe('loadPlatformNotifications', () => {
  it('returns platform notifications from the API', async () => {
    const mockNotes = [
      {
        id: 'plat-1',
        userId: 'u1',
        type: 'OPP',
        title: 'Title',
        message: 'Message',
        link: null,
        isRead: false,
        createdAt: '2026-04-18T00:00:00.000Z',
      },
    ];

    vi.spyOn(notificationsApi, 'getMyNotifications').mockResolvedValue({ data: mockNotes });

    const result = await loadPlatformNotifications();

    expect(result).toEqual(mockNotes);
  });

  it('rethrows non-401 failure so query error states are detected', async () => {
    vi.spyOn(notificationsApi, 'getMyNotifications').mockRejectedValue(new Error('Network error'));

    await expect(loadPlatformNotifications()).rejects.toThrow('Network error');
  });

  it('clears session storage and throws on 401 error', async () => {
    storage.accessToken = 'token';
    vi.spyOn(notificationsApi, 'getMyNotifications').mockRejectedValue(
      new Error('HTTP error 401: Unauthorized'),
    );

    await expect(loadPlatformNotifications()).rejects.toThrow('401');
    expect(storage.accessToken).toBeUndefined();
  });
});

describe('dashboardQueryOptions', () => {
  it('keeps a separate cache entry for every set of filters', async () => {
    mockMoodleResponses();

    const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });

    await queryClient.fetchQuery(dashboardQueryOptions(filters));
    await queryClient.fetchQuery(dashboardQueryOptions({ ...filters, sortOrder: 'desc' }));
    await queryClient.fetchQuery(dashboardQueryOptions(filters));

    expect(moodleApi.getAssignments).toHaveBeenCalledTimes(2);

    queryClient.clear();
  });
});

describe('notificationKeys', () => {
  it('builds canonical notification keys', () => {
    expect(notificationKeys.platform()).toEqual(['notifications', 'platform']);
  });
});

describe('platformNotificationsQueryOptions', () => {
  it('configures canonical query key and polling refetchInterval', () => {
    expect(platformNotificationsQueryOptions.queryKey).toEqual(['notifications', 'platform']);
    expect(platformNotificationsQueryOptions.refetchInterval).toBe(30_000);
  });
});

describe('profileQueryOptions', () => {
  it('fetches Moodle profile, applies stored corporate identity, and syncs profile', async () => {
    storage.username = 'Богдан Мельник';
    storage.userEmail = 'melnyk.bogdan@student.karazin.ua';

    vi.spyOn(moodleApi, 'getProfile').mockResolvedValue({
      data: {
        ...fallbackStudentProfile,
        fullName: 'Тестовий акаунт3',
        email: 'test@student.karazin.ua',
        gpa: 98,
      },
    });

    const queryClient = new QueryClient();
    const result = await queryClient.fetchQuery(profileQueryOptions);

    expect(result.fullName).toBe('Богдан Мельник');
    expect(result.email).toBe('melnyk.bogdan@student.karazin.ua');
    expect(result.gpa).toBe(98);

    const cached = JSON.parse(storage[STUDENT_PROFILE_STORAGE_KEY]);

    expect(cached.fullName).toBe('Богдан Мельник');
    expect(cached.email).toBe('melnyk.bogdan@student.karazin.ua');

    queryClient.clear();
  });

  it('does not overlay or sync stale profile response if session changed while request was in-flight', async () => {
    storage.accessToken = 'token-A';
    storage.username = 'Account A';
    storage.userEmail = 'a@student.karazin.ua';

    let resolveDeferred: (val: unknown) => void = () => {};
    const deferredPromise = new Promise((resolve) => {
      resolveDeferred = resolve;
    });

    vi.spyOn(moodleApi, 'getProfile').mockImplementation(() => deferredPromise as any);

    const queryClient = new QueryClient();
    const queryPromise = queryClient.fetchQuery(profileQueryOptions);

    // Switch session to Account B before response arrives
    storage.accessToken = 'token-B';
    storage.username = 'Account B';
    storage.userEmail = 'b@student.karazin.ua';
    delete storage[STUDENT_PROFILE_STORAGE_KEY];

    // Resolve delayed response from Account A
    resolveDeferred({
      data: {
        ...fallbackStudentProfile,
        id: 'moodle-A',
        fullName: 'Account A Moodle',
        email: 'moodle-a@karazin.ua',
        gpa: 99,
      },
    });

    const result = await queryPromise;

    // Must not write Account A's data to Account B's cache
    expect(storage[STUDENT_PROFILE_STORAGE_KEY]).toBeUndefined();

    // Must not mix Account A's academic data with Account B's name/email
    expect(result.fullName).toBe('Account A Moodle');
    expect(result.email).toBe('moodle-a@karazin.ua');

    queryClient.clear();
  });

  it('does not sync profile to cache when query signal is aborted', async () => {
    storage.accessToken = 'token-A';
    storage.username = 'Account A';
    storage.userEmail = 'a@student.karazin.ua';

    const abortController = new AbortController();

    vi.spyOn(moodleApi, 'getProfile').mockImplementation(async () => {
      abortController.abort();

      return {
        data: {
          ...fallbackStudentProfile,
          fullName: 'Account A Moodle',
        },
      };
    });

    const queryClient = new QueryClient();

    await queryClient.fetchQuery({
      ...profileQueryOptions,
      queryFn: (ctx) => {
        return profileQueryOptions.queryFn!({ ...ctx, signal: abortController.signal });
      },
    });

    expect(storage[STUDENT_PROFILE_STORAGE_KEY]).toBeUndefined();

    queryClient.clear();
  });

  it('applies corporate overlay and syncs cache when access token rotates for the same user', async () => {
    const createMockJwt = (payload: Record<string, unknown>): string => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
        'base64url',
      );
      const body = Buffer.from(JSON.stringify(payload)).toString('base64url');

      return `${header}.${body}.mockSignature`;
    };

    const token1 = createMockJwt({ sub: 'user-123', email: 'melnyk.bogdan@student.karazin.ua' });
    const token2 = createMockJwt({ sub: 'user-123', email: 'melnyk.bogdan@student.karazin.ua' });

    storage.accessToken = token1;
    storage.username = 'Богдан Мельник';
    storage.userEmail = 'melnyk.bogdan@student.karazin.ua';
    storage.authProvider = 'google';

    vi.spyOn(moodleApi, 'getProfile').mockImplementation(async () => {
      storage.accessToken = token2;

      return {
        data: {
          ...fallbackStudentProfile,
          fullName: 'Moodle Test Account',
          email: 'test@student.karazin.ua',
          gpa: 98,
        },
      };
    });

    const queryClient = new QueryClient();
    const result = await queryClient.fetchQuery(profileQueryOptions);

    expect(result.fullName).toBe('Богдан Мельник');
    expect(result.email).toBe('melnyk.bogdan@student.karazin.ua');
    expect(result.gpa).toBe(98);

    const cached = JSON.parse(storage[STUDENT_PROFILE_STORAGE_KEY]);

    expect(cached.fullName).toBe('Богдан Мельник');
    expect(cached.email).toBe('melnyk.bogdan@student.karazin.ua');

    queryClient.clear();
  });
});
