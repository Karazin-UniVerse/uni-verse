import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  assembleDashboardData,
  mapPlatformNotification,
  applyPlatformNotifications,
  deriveDashboardState,
  parseDateFilterSeconds,
  resolveGradesResponse,
  buildAssignmentParams,
  filterFallbackAssignments,
  isUnauthorizedError,
  loadCachedDashboardData,
  persistDashboardSnapshot,
  getInitialSyncTime,
  buildFallbackData,
  isMoodleUnlinked,
  syncStudentProfile,
  getInitialUserProfile,
  type MoodleApiResponseTuple,
} from './helpers';
import { fallbackStudentProfile } from '../constants';
import type { DashboardData } from '../types';

vi.mock('@uni-hub/utils/browser', () => ({
  isBrowser: true,
}));

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  for (const key of Object.keys(mockStorage)) {
    delete mockStorage[key];
  }

  const storageMock = {
    getItem: vi.fn((key: string) => mockStorage[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      mockStorage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete mockStorage[key];
    }),
    clear: vi.fn(() => {
      for (const key of Object.keys(mockStorage)) {
        delete mockStorage[key];
      }
    }),
  };

  vi.stubGlobal('localStorage', storageMock);
  vi.stubGlobal('window', { localStorage: storageMock });
});

describe('assembleDashboardData', () => {
  it('reads the unread notification count from the unreadcount field the backend sends', () => {
    const dashboardData = assembleDashboardData([
      { data: [] },
      { data: { grades: [] } },
      { data: [] },
      { data: [] },
      { data: { notifications: [], unreadcount: 3 } },
      { data: { total: 0 } },
    ]);

    expect(dashboardData.unreadCount).toBe(3);
  });
});

describe('parseDateFilterSeconds', () => {
  it('returns null for empty or invalid date strings', () => {
    expect(parseDateFilterSeconds('')).toBeNull();
    expect(parseDateFilterSeconds(undefined)).toBeNull();
    expect(parseDateFilterSeconds('invalid')).toBeNull();
    expect(parseDateFilterSeconds('2025-13-45')).toBeNull();
  });

  it('parses valid YYYY-MM-DD date to timestamp', () => {
    const parsed = parseDateFilterSeconds('2025-01-01');

    expect(typeof parsed).toBe('number');
    expect(parsed).toBeGreaterThan(0);
  });
});

describe('resolveGradesResponse', () => {
  it('returns empty array if response is missing or empty', () => {
    expect(resolveGradesResponse(null)).toEqual([]);
    expect(resolveGradesResponse(undefined)).toEqual([]);
  });

  it('returns grades array from response', () => {
    const mockGrades = [{ courseId: 1, grade: '95' }] as any;

    expect(resolveGradesResponse({ data: { grades: mockGrades } } as any)).toEqual(mockGrades);
  });
});

describe('buildAssignmentParams', () => {
  it('builds assignment query parameters with object argument', () => {
    const params = buildAssignmentParams({
      sortOrder: 'asc',
      dateFrom: '2025-01-01',
      dateTo: '2025-01-10',
      hideCompleted: true,
    });

    expect(params.sortByDate).toBe('asc');
    expect(params.includeStatus).toBe(true);
    expect(params.status).toBe('not_completed');
    expect(typeof params.dateFrom).toBe('number');
    expect(typeof params.dateTo).toBe('number');
  });
});

describe('filterFallbackAssignments', () => {
  it('filters assignments based on object parameters when hideCompleted is true', () => {
    const assignments = [
      { id: 1, submissionStatus: 'graded', duedate: 1000 },
      { id: 2, submissionStatus: 'new', duedate: 2000 },
      { id: 3, submissionStatus: 'new', isLate: true, duedate: 1500 },
    ] as any;

    const filtered = filterFallbackAssignments({
      assignments,
      hideCompleted: true,
    });

    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe(2);
  });

  it('preserves completed and late assignments when hideCompleted is false', () => {
    const assignments = [
      { id: 1, submissionStatus: 'graded', duedate: 1000 },
      { id: 2, submissionStatus: 'new', duedate: 2000 },
      { id: 3, submissionStatus: 'new', isLate: true, duedate: 1500 },
    ] as any;

    const filtered = filterFallbackAssignments({
      assignments,
      hideCompleted: false,
    });

    expect(filtered.length).toBe(3);
  });
});

describe('isUnauthorizedError', () => {
  it('detects 401 in error messages', () => {
    expect(isUnauthorizedError(new Error('Request failed with status code 401'))).toBe(true);
    expect(isUnauthorizedError(new Error('Server error 500'))).toBe(false);
    expect(isUnauthorizedError('not an error')).toBe(false);
  });
});

describe('storage helpers', () => {
  it('persists and loads cached dashboard data', () => {
    const snapshot: any = { courses: [{ id: 1 }] };

    persistDashboardSnapshot(12345678, snapshot);

    const cached = loadCachedDashboardData();

    expect(cached).toEqual(snapshot);
    expect(getInitialSyncTime()).toBe(12345678);
  });
});

describe('syncStudentProfile', () => {
  it('saves the student profile to storage', () => {
    const profile: any = { id: '1', fullName: 'John Doe' };

    syncStudentProfile(profile);

    expect(localStorage.getItem('universe_student_profile')).toBe(JSON.stringify(profile));
  });

  it('does nothing when profile is null or undefined', () => {
    syncStudentProfile(null);
    syncStudentProfile(undefined);

    expect(localStorage.getItem('universe_student_profile')).toBeNull();
  });
});

describe('getInitialUserProfile', () => {
  it('prefers the cached profile over the saved username', () => {
    const profile = { ...fallbackStudentProfile, fullName: 'Cached Student' };

    localStorage.setItem('universe_student_profile', JSON.stringify(profile));
    localStorage.setItem('username', 'saved.user');

    expect(getInitialUserProfile()).toEqual(profile);
  });

  it.each([
    ['an array', '[]'],
    ['an empty object', '{}'],
    ['a partial profile', JSON.stringify({ fullName: 'Partial Student' })],
    ['invalid JSON', '{not json'],
  ])('ignores a cached profile that is %s', (_label: string, cached: string) => {
    localStorage.setItem('universe_student_profile', cached);
    localStorage.setItem('username', 'saved.user');

    expect(getInitialUserProfile()?.fullName).toBe('saved.user');
  });

  it('builds a profile from the saved username when nothing is cached', () => {
    localStorage.setItem('username', 'saved.user');

    expect(getInitialUserProfile()).toEqual({
      ...fallbackStudentProfile,
      fullName: 'saved.user',
      email: 'saved.user@karazin.ua',
      group: '',
    });
  });

  it('keeps an email username as the email', () => {
    localStorage.setItem('username', 'student@karazin.ua');

    expect(getInitialUserProfile()?.email).toBe('student@karazin.ua');
  });

  it('prefers saved userEmail over username handle', () => {
    localStorage.setItem('username', 'Артем Новіков');
    localStorage.setItem('userEmail', 'artem.novikov@student.karazin.ua');

    const profile = getInitialUserProfile();

    expect(profile?.fullName).toBe('Артем Новіков');
    expect(profile?.email).toBe('artem.novikov@student.karazin.ua');
    expect(profile?.group).toBe('');
  });

  it('does not construct invalid email with spaces when only non-ascii full name is saved', () => {
    localStorage.setItem('username', 'Артем Новіков');

    const profile = getInitialUserProfile();

    expect(profile?.fullName).toBe('Артем Новіков');
    expect(profile?.email).toBe('');
  });

  it('returns null when there is no cache and no usable username', () => {
    expect(getInitialUserProfile()).toBeNull();

    localStorage.setItem('username', fallbackStudentProfile.fullName);

    expect(getInitialUserProfile()).toBeNull();
  });
});

describe('isMoodleUnlinked', () => {
  it('returns true when isMoodleLinked is explicitly false', () => {
    localStorage.setItem('isMoodleLinked', 'false');

    expect(isMoodleUnlinked()).toBe(true);
  });

  it('returns false when isMoodleLinked is true or missing', () => {
    localStorage.setItem('isMoodleLinked', 'true');
    expect(isMoodleUnlinked()).toBe(false);

    delete mockStorage.isMoodleLinked;
    expect(isMoodleUnlinked()).toBe(false);
  });
});

describe('buildFallbackData', () => {
  it('constructs fallback dashboard data with filtered assignments', () => {
    const cachedData: any = {
      courses: [{ id: 1 }],
      assignments: [
        { id: 10, submissionStatus: 'graded', duedate: 1000 },
        { id: 20, submissionStatus: 'new', duedate: 2000 },
      ],
    };

    const previousData: any = {
      courses: [],
      grades: [],
      assignments: [],
      events: [],
      notifications: [],
      unreadCount: 0,
      statistics: null,
    };

    const result = buildFallbackData({
      cachedData,
      previousData,
      hideCompleted: true,
      dateFrom: '',
      dateTo: '',
    });

    expect(result.courses).toEqual([{ id: 1 }]);
    expect(result.assignments.length).toBe(1);
    expect(result.assignments[0].id).toBe(20);
  });

  it('applies fresh platformNotifications onto cached Moodle fallback data', () => {
    localStorage.setItem('isMoodleLinked', 'true');

    const cachedData: Partial<DashboardData> = {
      notifications: [
        {
          id: 7,
          subject: 'Cached Moodle Alert',
          message: 'Cached Moodle body',
          timecreated: 1000,
          read: false,
        },
      ],
      unreadCount: 1,
    };

    const previousData: DashboardData = {
      courses: [],
      grades: [],
      assignments: [],
      events: [],
      notifications: [],
      unreadCount: 0,
      statistics: null,
    };

    const result = buildFallbackData({
      cachedData,
      previousData,
      hideCompleted: false,
      dateFrom: '',
      dateTo: '',
      platformNotifications: [
        {
          id: 'plat-fresh',
          userId: 'user-1',
          title: 'Platform Alert',
          message: 'Platform body',
          isRead: false,
          createdAt: new Date(2000 * 1000).toISOString(),
        },
      ],
    });

    expect(result.notifications).toHaveLength(2);
    expect(result.notifications[0].id).toBe('plat-fresh');
    expect(result.notifications[1].id).toBe(7);
    expect(result.unreadCount).toBe(2);
  });
});

describe('mapPlatformNotification', () => {
  it('maps platform notification fields and converts ISO timestamp to seconds', () => {
    const raw = {
      id: 'plat-1',
      userId: 'user-1',
      title: 'notifications.opportunityApplicationStatus.title',
      message: JSON.stringify({
        opportunityTitle: 'Frontend Intern',
        status: 'ACCEPTED',
        comment: 'Welcome to the team!',
      }),
      type: 'OPPORTUNITY_APPLICATION_STATUS',
      isRead: false,
      createdAt: '2025-01-01T12:00:00Z',
    };

    const mapped = mapPlatformNotification(raw);

    expect(mapped.id).toBe('plat-1');
    expect(mapped.subject).toBe('notifications.opportunityApplicationStatus.title');
    expect(mapped.message).toBe(raw.message);
    expect(mapped.read).toBe(false);
    expect(mapped.timecreated).toBe(Math.floor(new Date('2025-01-01T12:00:00Z').getTime() / 1000));
  });
});

describe('assembleDashboardData', () => {
  it('combines and sorts moodle and platform notifications by timecreated desc and calculates total unread count', () => {
    const moodleResponses: MoodleApiResponseTuple = [
      { data: [] },
      { data: { grades: [] } },
      { data: [] },
      { data: [] },
      {
        data: {
          notifications: [
            {
              id: 1,
              subject: 'Moodle Notif',
              message: 'Old moodle message',
              timecreated: 1000,
              read: true,
            },
          ],
          unreadCount: 0,
        },
      },
      { data: null },
    ];

    const platformNotifications = [
      {
        id: 'plat-1',
        userId: 'user-1',
        title: 'Platform Notif',
        message: 'New platform message',
        type: 'CUSTOM',
        isRead: false,
        createdAt: new Date(2000 * 1000).toISOString(),
      },
    ];

    const result = assembleDashboardData(moodleResponses, platformNotifications);

    expect(result.notifications.length).toBe(2);
    expect(result.notifications[0].id).toBe('plat-1');
    expect(result.notifications[1].id).toBe(1);
    expect(result.unreadCount).toBe(1);
  });
});

describe('applyPlatformNotifications', () => {
  it('updates notifications and unreadCount on existing dashboard state', () => {
    const previousData: DashboardData = {
      courses: [],
      grades: [],
      assignments: [],
      events: [],
      notifications: [],
      unreadCount: 0,
      statistics: null,
    };

    const result = applyPlatformNotifications(previousData, [
      {
        id: 'plat-1',
        userId: 'user-1',
        title: 'Title 1',
        message: 'Message 1',
        isRead: false,
        createdAt: '2025-01-01T12:00:00Z',
      },
      {
        id: 'plat-2',
        userId: 'user-1',
        title: 'Title 2',
        message: 'Message 2',
        isRead: true,
        createdAt: '2025-01-02T12:00:00Z',
      },
    ]);

    expect(result.notifications).toHaveLength(2);
    expect(result.notifications[0].id).toBe('plat-2');
    expect(result.unreadCount).toBe(1);
  });

  it('preserves existing Moodle notifications and combines unread count', () => {
    const previousData: DashboardData = {
      courses: [],
      grades: [],
      assignments: [],
      events: [],
      notifications: [
        {
          id: 101,
          subject: 'Moodle Notification',
          message: 'Moodle content',
          timecreated: 1000,
          read: false,
        },
      ],
      unreadCount: 1,
      statistics: null,
    };

    const result = applyPlatformNotifications(previousData, [
      {
        id: 'plat-1',
        userId: 'user-1',
        title: 'Platform Title',
        message: 'Platform Message',
        isRead: false,
        createdAt: new Date(2000 * 1000).toISOString(),
      },
    ]);

    expect(result.notifications).toHaveLength(2);
    expect(result.notifications[0].id).toBe('plat-1');
    expect(result.notifications[1].id).toBe(101);
    expect(result.unreadCount).toBe(2);
  });

  it('clears retained Moodle notifications when isMoodleUnlinked is true', () => {
    localStorage.setItem('isMoodleLinked', 'false');

    const previousData: DashboardData = {
      courses: [],
      grades: [],
      assignments: [],
      events: [],
      notifications: [
        {
          id: 101,
          subject: 'Moodle Notification',
          message: 'Moodle content',
          timecreated: 1000,
          read: false,
        },
      ],
      unreadCount: 1,
      statistics: null,
    };

    const result = applyPlatformNotifications(previousData, [
      {
        id: 'plat-1',
        userId: 'user-1',
        title: 'Platform Title',
        message: 'Platform Message',
        isRead: false,
        createdAt: new Date(2000 * 1000).toISOString(),
      },
    ]);

    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0].id).toBe('plat-1');
    expect(result.unreadCount).toBe(1);
  });
});

describe('deriveDashboardState', () => {
  const dashboardData = {
    courses: [],
    grades: [],
    assignments: [],
    events: [],
    notifications: [],
    unreadCount: 0,
    statistics: null,
  };

  it('is loading without data on the first load', () => {
    expect(
      deriveDashboardState({
        data: undefined,
        isError: false,
        isFetching: true,
        dataUpdatedAt: 0,
      }),
    ).toEqual({ loading: true, hasLoadedOnce: false, isOfflineData: false, lastSyncTime: null });
  });

  it('stays loading while a refetch runs and reports that data exists', () => {
    expect(
      deriveDashboardState({
        data: dashboardData,
        isError: false,
        isFetching: true,
        dataUpdatedAt: 1_700_000_000_000,
      }),
    ).toEqual({
      cachedData: dashboardData,
      loading: true,
      hasLoadedOnce: true,
      isOfflineData: false,
      lastSyncTime: 1_700_000_000_000,
    });
  });

  it('flags offline data when the last load failed but data is still there', () => {
    const state = deriveDashboardState({
      data: dashboardData,
      isError: true,
      isFetching: false,
      dataUpdatedAt: 1_700_000_000_000,
    });

    expect(state.isOfflineData).toBe(true);
    expect(state.loading).toBe(false);
  });

  it('falls back to the stored snapshot when the load of new filters failed', () => {
    const state = deriveDashboardState({
      data: undefined,
      isError: true,
      isFetching: false,
      dataUpdatedAt: 0,
      snapshot: dashboardData,
    });

    expect(state.cachedData).toBe(dashboardData);
    expect(state.isOfflineData).toBe(true);
    expect(state.hasLoadedOnce).toBe(true);
  });

  it('ignores the stored snapshot while there is no error', () => {
    const state = deriveDashboardState({
      data: undefined,
      isError: false,
      isFetching: true,
      dataUpdatedAt: 0,
      snapshot: dashboardData,
    });

    expect(state.cachedData).toBeUndefined();
    expect(state.isOfflineData).toBe(false);
  });

  it('does not flag offline data when nothing was ever loaded', () => {
    expect(
      deriveDashboardState({
        data: undefined,
        isError: true,
        isFetching: false,
        dataUpdatedAt: 0,
      }).isOfflineData,
    ).toBe(false);
  });
});

describe('mapPlatformNotification', () => {
  it('maps PlatformNotification to Notification with link preserved', () => {
    const platform = {
      id: 'plat-1',
      userId: 'user-1',
      type: 'OPPORTUNITY_NEW_APPLICATION',
      title: 'New application',
      message: 'Someone applied',
      link: '/opportunities/123',
      isRead: false,
      createdAt: '2026-04-18T12:00:00.000Z',
    };

    const mapped = mapPlatformNotification(platform);

    expect(mapped).toEqual({
      id: 'plat-1',
      subject: 'New application',
      timecreated: Math.floor(new Date('2026-04-18T12:00:00.000Z').getTime() / 1000),
      read: false,
      message: 'Someone applied',
      link: '/opportunities/123',
    });
  });
});

describe('applyPlatformNotifications', () => {
  it('merges platform notifications with existing moodle notifications and sorts desc', () => {
    const baseDashboard = {
      courses: [],
      grades: [],
      assignments: [],
      events: [],
      notifications: [
        {
          id: 1,
          subject: 'Moodle note',
          timecreated: 1000,
          read: true,
        },
      ],
      unreadCount: 0,
      statistics: null,
    };

    const platformItems = [
      {
        id: 'plat-1',
        userId: 'u1',
        type: 'OPP',
        title: 'Platform note',
        message: 'Hello',
        link: '/opportunities/1',
        isRead: false,
        createdAt: '1970-01-01T00:33:20.000Z', // 2000 sec
      },
    ];

    const result = applyPlatformNotifications(baseDashboard, platformItems);

    expect(result.notifications).toHaveLength(2);
    expect(result.notifications[0].id).toBe('plat-1');
    expect(result.notifications[1].id).toBe(1);
    expect(result.unreadCount).toBe(1);
  });
});
