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
} from './useDashboardData.helpers';

describe('useDashboardData.helpers', () => {
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
    it('filters assignments based on object parameters', () => {
      const assignments = [
        { id: 1, submissionStatus: 'graded', duedate: 1000 },
        { id: 2, submissionStatus: 'new', duedate: 2000 },
      ] as any;

      const filtered = filterFallbackAssignments({
        assignments,
        hideCompleted: true,
      });

      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe(2);
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
});
