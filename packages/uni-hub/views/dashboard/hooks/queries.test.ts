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
} from './queries';

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
    vi.spyOn(notificationsApi, 'getMyNotifications').mockResolvedValue({
      data: [
        {
          id: 'plat-1',
          userId: 'user-1',
          title: 'Notif',
          message: 'Msg',
          type: 'INFO',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    const notifs = await loadPlatformNotifications();

    expect(notifs).toHaveLength(1);
    expect(notifs[0].id).toBe('plat-1');
  });

  it('logs error and returns empty array on non-401 failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.spyOn(notificationsApi, 'getMyNotifications').mockRejectedValue(new Error('Network error'));

    const notifs = await loadPlatformNotifications();

    expect(notifs).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
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

describe('loadPlatformNotifications', () => {
  it('loads platform notifications from notificationsApi', async () => {
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

  it('clears user session storage on 401 unauthorized', async () => {
    vi.spyOn(notificationsApi, 'getMyNotifications').mockRejectedValue(
      new Error('HTTP error 401: Unauthorized'),
    );
    storage.accessToken = 'token';

    await expect(loadPlatformNotifications()).rejects.toThrow('401');
    expect(storage.accessToken).toBeUndefined();
  });
});

describe('notificationKeys', () => {
  it('builds canonical notification keys', () => {
    expect(notificationKeys.platform()).toEqual(['notifications', 'platform']);
  });
});
