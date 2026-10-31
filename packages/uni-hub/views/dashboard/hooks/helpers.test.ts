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
  applyStoredIdentityToProfile,
  readSessionIdentity,
  hasSessionChanged,
  type StoredSessionIdentity,
  type MoodleApiResponseTuple,
} from './helpers';
import { STUDENT_PROFILE_STORAGE_KEY } from '../constants';
import { fallbackStudentProfile } from '@uni-hub/utils/test-fixtures';
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
  it('should return null for empty or invalid date strings', () => {
    expect(parseDateFilterSeconds('')).toBeNull();
    expect(parseDateFilterSeconds(undefined)).toBeNull();
    expect(parseDateFilterSeconds('invalid')).toBeNull();
    expect(parseDateFilterSeconds('2025-13-45')).toBeNull();
  });

  it('should parse valid YYYY-MM-DD date to timestamp', () => {
    const parsed = parseDateFilterSeconds('2025-01-01');

    expect(typeof parsed).toBe('number');
    expect(parsed).toBeGreaterThan(0);
  });
});

describe('resolveGradesResponse', () => {
  it('should return empty array if response is missing or empty', () => {
    expect(resolveGradesResponse(null)).toEqual([]);
    expect(resolveGradesResponse(undefined)).toEqual([]);
  });

  it('should return grades array from response', () => {
    const mockGrades = [{ courseId: 1, grade: '95' }] as any;

    expect(resolveGradesResponse({ data: { grades: mockGrades } } as any)).toEqual(mockGrades);
  });
});

describe('buildAssignmentParams', () => {
  it('should build assignment query parameters with object argument', () => {
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
  it('should filter assignments based on object parameters when hideCompleted is true', () => {
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

  it('should preserve completed and late assignments when hideCompleted is false', () => {
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
  it('should detect 401 in error messages', () => {
    expect(isUnauthorizedError(new Error('Request failed with status code 401'))).toBe(true);
    expect(isUnauthorizedError(new Error('Server error 500'))).toBe(false);
    expect(isUnauthorizedError('not an error')).toBe(false);
  });
});

describe('storage helpers', () => {
  it('should persist and load cached dashboard data', () => {
    const snapshot: any = { courses: [{ id: 1 }] };

    persistDashboardSnapshot(12345678, snapshot);

    const cached = loadCachedDashboardData();

    expect(cached).toEqual(snapshot);
    expect(getInitialSyncTime()).toBe(12345678);
  });
});

describe('syncStudentProfile', () => {
  it('should save the student profile to storage', () => {
    const profile: any = { id: '1', fullName: 'John Doe' };

    syncStudentProfile(profile);

    expect(localStorage.getItem(STUDENT_PROFILE_STORAGE_KEY)).toBe(JSON.stringify(profile));
  });

  it('should do nothing when profile is null or undefined', () => {
    syncStudentProfile(null);
    syncStudentProfile(undefined);

    expect(localStorage.getItem(STUDENT_PROFILE_STORAGE_KEY)).toBeNull();
  });
});

describe('applyStoredIdentityToProfile', () => {
  it('should overlay stored corporate username and userEmail when userEmail is set', () => {
    localStorage.setItem('username', 'Богдан Мельник');
    localStorage.setItem('userEmail', 'melnyk.bogdan@student.karazin.ua');

    const moodleProfile = {
      ...fallbackStudentProfile,
      fullName: 'Тестовий акаунт3',
      email: 'csai_test3@student.karazin.ua',
      gpa: 95.5,
    };

    const resolved = applyStoredIdentityToProfile(moodleProfile);

    expect(resolved.fullName).toBe('Богдан Мельник');
    expect(resolved.email).toBe('melnyk.bogdan@student.karazin.ua');
    expect(resolved.gpa).toBe(95.5);
  });

  it('should keep moodle fullName if saved username is empty, but apply userEmail', () => {
    localStorage.setItem('userEmail', 'melnyk.bogdan@student.karazin.ua');
    localStorage.setItem('username', '');

    const moodleProfile = {
      ...fallbackStudentProfile,
      fullName: 'Оригінальне Ім’я',
    };

    const resolved = applyStoredIdentityToProfile(moodleProfile);

    expect(resolved.fullName).toBe('Оригінальне Ім’я');
    expect(resolved.email).toBe('melnyk.bogdan@student.karazin.ua');
  });

  it('should return profile untouched when userEmail is not in localStorage', () => {
    localStorage.setItem('username', 'moodle.user');

    const moodleProfile = {
      ...fallbackStudentProfile,
      fullName: 'Moodle Student',
      email: 'moodle@karazin.ua',
    };

    const resolved = applyStoredIdentityToProfile(moodleProfile);

    expect(resolved).toEqual(moodleProfile);
  });

  it('should return profile untouched when localStorage.getItem throws on email read', () => {
    const getItemSpy = vi.mocked(localStorage.getItem).mockImplementationOnce(() => {
      throw new Error('SecurityError: Access denied');
    });

    const moodleProfile = {
      ...fallbackStudentProfile,
      fullName: 'Оригінальне Ім’я',
    };

    const resolved = applyStoredIdentityToProfile(moodleProfile);

    expect(getItemSpy).toHaveBeenCalledWith('userEmail');
    expect(resolved).toEqual(moodleProfile);
  });

  it('should safely fall back to profileData.fullName when username storage read throws', () => {
    mockStorage.userEmail = 'melnyk.bogdan@student.karazin.ua';

    const getItemSpy = vi.mocked(localStorage.getItem).mockImplementation((key: string) => {
      if (key === 'username') {
        throw new Error('QuotaExceededError');
      }

      return mockStorage[key] ?? null;
    });

    const moodleProfile = {
      ...fallbackStudentProfile,
      fullName: 'Оригінальне Ім’я',
    };

    const resolved = applyStoredIdentityToProfile(moodleProfile);

    expect(getItemSpy).toHaveBeenCalledWith('username');
    expect(resolved.fullName).toBe('Оригінальне Ім’я');
    expect(resolved.email).toBe('melnyk.bogdan@student.karazin.ua');
  });

  it('should return profile untouched when storage access throws an unhandled exception', () => {
    const getItemSpy = vi.mocked(localStorage.getItem).mockImplementation(() => {
      throw new Error('SecurityError: Access denied');
    });

    const moodleProfile = {
      ...fallbackStudentProfile,
      fullName: 'Оригінальне Ім’я',
    };

    const resolved = applyStoredIdentityToProfile(moodleProfile);

    expect(getItemSpy).toHaveBeenCalled();
    expect(resolved).toEqual(moodleProfile);
  });

  it('should resolve email from session JWT in applyStoredIdentityToProfile when userEmail is absent', () => {
    const token = `header.${Buffer.from(
      JSON.stringify({ email: 'melnyk.bogdan@student.karazin.ua' }),
    ).toString('base64')}.signature`;

    mockStorage.username = 'Богдан Мельник';
    mockStorage.accessToken = token;

    const moodleProfile = {
      ...fallbackStudentProfile,
      fullName: 'Moodle Student',
    };

    const resolved = applyStoredIdentityToProfile(moodleProfile);

    expect(resolved.fullName).toBe('Богдан Мельник');
    expect(resolved.email).toBe('melnyk.bogdan@student.karazin.ua');
  });

  it('should preserve moodle fullName and profile for credential sessions even if session token contains email', () => {
    const token = `header.${Buffer.from(
      JSON.stringify({ email: 'moodle.student@karazin.ua' }),
    ).toString('base64')}.signature`;

    mockStorage.username = 'moodle.student';
    mockStorage.accessToken = token;
    mockStorage.authProvider = 'credentials';

    const moodleProfile = {
      ...fallbackStudentProfile,
      fullName: 'Барсуков Родіон Сергійович',
      email: 'moodle.student@karazin.ua',
    };

    const resolved = applyStoredIdentityToProfile(moodleProfile);

    expect(resolved.fullName).toBe('Барсуков Родіон Сергійович');
    expect(resolved).toEqual(moodleProfile);
  });
});

describe('isMoodleUnlinked', () => {
  it('should return true when isMoodleLinked is explicitly false', () => {
    localStorage.setItem('isMoodleLinked', 'false');

    expect(isMoodleUnlinked()).toBe(true);
  });

  it('should return false when isMoodleLinked is true or missing', () => {
    localStorage.setItem('isMoodleLinked', 'true');
    expect(isMoodleUnlinked()).toBe(false);

    delete mockStorage.isMoodleLinked;
    expect(isMoodleUnlinked()).toBe(false);
  });
});

describe('buildFallbackData', () => {
  it('should construct fallback dashboard data with filtered assignments', () => {
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

function createMockJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');

  return `${header}.${body}.mockSignature`;
}

describe('readSessionIdentity', () => {
  it('reads session identity from storage and extracts userId from JWT accessToken', () => {
    const token = createMockJwt({ sub: 'user-456', email: 'test@karazin.ua' });

    mockStorage.accessToken = token;
    mockStorage.username = 'Test User';
    mockStorage.userEmail = 'test@karazin.ua';
    mockStorage.authProvider = 'google';

    const identity = readSessionIdentity();

    expect(identity).toEqual({
      userId: 'user-456',
      token,
      username: 'Test User',
      userEmail: 'test@karazin.ua',
      authProvider: 'google',
    });
  });

  it('handles missing or malformed token gracefully without throwing', () => {
    mockStorage.accessToken = 'not-a-jwt';
    mockStorage.username = 'Opaque User';

    const identity = readSessionIdentity();

    expect(identity).toEqual({
      userId: null,
      token: 'not-a-jwt',
      username: 'Opaque User',
      userEmail: null,
      authProvider: null,
    });
  });
});

describe('hasSessionChanged', () => {
  it('returns false when both snapshot and current are identical', () => {
    const identity: StoredSessionIdentity = {
      userId: 'u1',
      token: 'tok-1',
      username: 'User 1',
      userEmail: 'u1@karazin.ua',
      authProvider: 'google',
    };

    expect(hasSessionChanged(identity, identity)).toBe(false);
  });

  it('returns false when token rotates but userId and account identity remain unchanged', () => {
    const snapshot: StoredSessionIdentity = {
      userId: 'u1',
      token: 'initial-token',
      username: 'User 1',
      userEmail: 'u1@karazin.ua',
      authProvider: 'google',
    };
    const current: StoredSessionIdentity = {
      userId: 'u1',
      token: 'refreshed-token',
      username: 'User 1',
      userEmail: 'u1@karazin.ua',
      authProvider: 'google',
    };

    expect(hasSessionChanged(snapshot, current)).toBe(false);
  });

  it('returns true when userId changes (different account login)', () => {
    const snapshot: StoredSessionIdentity = {
      userId: 'u1',
      token: 'token-u1',
      username: 'User 1',
      userEmail: 'u1@karazin.ua',
      authProvider: 'google',
    };
    const current: StoredSessionIdentity = {
      userId: 'u2',
      token: 'token-u2',
      username: 'User 2',
      userEmail: 'u2@karazin.ua',
      authProvider: 'google',
    };

    expect(hasSessionChanged(snapshot, current)).toBe(true);
  });

  it('returns true when user logs out while request was in-flight', () => {
    const snapshot: StoredSessionIdentity = {
      userId: 'u1',
      token: 'token-u1',
      username: 'User 1',
      userEmail: 'u1@karazin.ua',
      authProvider: 'google',
    };
    const current: StoredSessionIdentity = {
      userId: null,
      token: null,
      username: null,
      userEmail: null,
      authProvider: null,
    };

    expect(hasSessionChanged(snapshot, current)).toBe(true);
  });

  it('returns true when authProvider changes', () => {
    const snapshot: StoredSessionIdentity = {
      userId: 'u1',
      token: 'tok',
      username: 'User',
      userEmail: 'u@karazin.ua',
      authProvider: 'google',
    };
    const current: StoredSessionIdentity = {
      ...snapshot,
      authProvider: 'credentials',
    };

    expect(hasSessionChanged(snapshot, current)).toBe(true);
  });

  it('returns true when userEmail or username changes', () => {
    const snapshot: StoredSessionIdentity = {
      userId: 'u1',
      token: 'tok',
      username: 'User A',
      userEmail: 'a@karazin.ua',
      authProvider: 'google',
    };
    const currentEmailChanged: StoredSessionIdentity = {
      ...snapshot,
      userEmail: 'b@karazin.ua',
    };
    const currentNameChanged: StoredSessionIdentity = {
      ...snapshot,
      username: 'User B',
    };

    expect(hasSessionChanged(snapshot, currentEmailChanged)).toBe(true);
    expect(hasSessionChanged(snapshot, currentNameChanged)).toBe(true);
  });

  it('returns true when either snapshot or current is null', () => {
    const snapshot: StoredSessionIdentity = { token: 'tok' };

    expect(hasSessionChanged(snapshot, null)).toBe(true);
    expect(hasSessionChanged(null, snapshot)).toBe(true);
    expect(hasSessionChanged(null, null)).toBe(false);
  });

  it('handles opaque non-JWT tokens by allowing rotation if user identity matches', () => {
    const snapshot: StoredSessionIdentity = {
      token: 'opaque-1',
      username: 'User A',
      userEmail: 'a@karazin.ua',
    };
    const current: StoredSessionIdentity = {
      token: 'opaque-2',
      username: 'User A',
      userEmail: 'a@karazin.ua',
    };

    expect(hasSessionChanged(snapshot, current)).toBe(false);
  });

  it('treats opaque token change as session change if no username or email is available', () => {
    const snapshot: StoredSessionIdentity = {
      token: 'opaque-1',
    };
    const current: StoredSessionIdentity = {
      token: 'opaque-2',
    };

    expect(hasSessionChanged(snapshot, current)).toBe(true);
  });
});
