import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  parseDateFilterSeconds,
  resolveGradesResponse,
  buildAssignmentParams,
  filterFallbackAssignments,
  isUnauthorizedError,
  loadCachedDashboardData,
  persistDashboardSnapshot,
  clearUserSessionStorage,
  getInitialSyncTime,
  buildFallbackData,
  isMoodleUnlinked,
  syncStudentProfile,
  getInitialUserProfile,
  mapPlatformNotification,
  assembleDashboardData,
} from './helpers';
import { fallbackStudentProfile } from '../constants';

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

  it('clears user session storage', () => {
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('username', 'user');

    clearUserSessionStorage();

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('username')).toBeNull();
  });
});

describe('syncStudentProfile', () => {
  it('saves student profile to storage and calls setter callback', () => {
    const setter = vi.fn();
    const profile: any = { id: '1', fullName: 'John Doe' };

    syncStudentProfile(profile, setter);

    expect(setter).toHaveBeenCalledWith(profile);
    expect(localStorage.getItem('universe_student_profile')).toBe(JSON.stringify(profile));
  });

  it('does nothing when profile is null or undefined', () => {
    const setter = vi.fn();

    syncStudentProfile(null, setter);
    syncStudentProfile(undefined, setter);

    expect(setter).not.toHaveBeenCalled();
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
    });
  });

  it('keeps an email username as the email', () => {
    localStorage.setItem('username', 'student@karazin.ua');

    expect(getInitialUserProfile()?.email).toBe('student@karazin.ua');
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
    const moodleResponses: any = [
      { data: [] },
      { data: { grades: [] } },
      { data: [] },
      { data: { events: [] } },
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
