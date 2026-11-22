import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildQueryString, authApi, moodleApi, ApiClient, getErrorMessage } from './api';
import { resetRefreshPromiseForTests } from './api.request';
import { clearUserSessionStorage, saveSessionUser } from './api.session';

describe('UniHub API Service', () => {
  const originalFetch = global.fetch;
  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    resetRefreshPromiseForTests();

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

    it('should serialize object values safely using JSON.stringify without [object Object]', () => {
      const result = buildQueryString({
        filter: { status: 'completed' },
      });

      expect(result).toBe(`?filter=${encodeURIComponent('{"status":"completed"}')}`);
    });
  });

  describe('AuthApi', () => {
    const sampleSessionUser = {
      id: 'user-1',
      email: 'student@karazin.ua',
      name: 'Test Student',
      roles: ['MOODLE_STUDENT'],
      isLinked: true,
    };

    it('login should send POST to /auth/login and save non-secret session metadata without storing accessToken', async () => {
      const mockResponseData = {
        user: sampleSessionUser,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponseData,
      } as Response);

      const response = await authApi.login('student@karazin.ua', 'SecretPass123!');

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(response.data).toEqual(mockResponseData);
      expect(mockStorage.accessToken).toBeUndefined();
      expect(JSON.parse(mockStorage.sessionUser)).toEqual(sampleSessionUser);
      expect(mockStorage.isLoggedIn).toBe('true');
      expect(mockStorage.userEmail).toBe('student@karazin.ua');
    });

    it('logout should call /auth/logout and clear session metadata from localStorage', async () => {
      mockStorage.sessionUser = JSON.stringify(sampleSessionUser);
      mockStorage.isLoggedIn = 'true';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Logged out successfully' }),
      } as Response);

      await authApi.logout();

      expect(mockStorage.sessionUser).toBeUndefined();
      expect(mockStorage.accessToken).toBeUndefined();
      expect(mockStorage.isLoggedIn).toBeUndefined();
      expect(mockStorage.isMoodleLinked).toBeUndefined();
    });

    it('loginWithGoogle should send POST to /auth/google with idToken and store sessionUser', async () => {
      const mockGoogleResponse = {
        isLinked: true,
        user: sampleSessionUser,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockGoogleResponse,
      } as Response);

      const response = await authApi.loginWithGoogle('mock-id-token-abc');

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(response.data).toEqual(mockGoogleResponse);
      expect(mockStorage.accessToken).toBeUndefined();
      expect(JSON.parse(mockStorage.sessionUser)).toEqual(sampleSessionUser);
      expect(mockStorage.isLoggedIn).toBe('true');
      expect(mockStorage.isMoodleLinked).toBe('true');

      const call = vi.mocked(global.fetch).mock.calls[0];

      expect(call[0]).toContain('/auth/google');
      expect(call[1]?.body).toBe(JSON.stringify({ idToken: 'mock-id-token-abc' }));
    });

    it('loginWithGoogle with isLinked: false should store sessionUser and mark isMoodleLinked as false', async () => {
      const unlinkedUser = { ...sampleSessionUser, isLinked: false };
      const mockGoogleResponse = {
        isLinked: false,
        user: unlinkedUser,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockGoogleResponse,
      } as Response);

      const response = await authApi.loginWithGoogle('mock-id-token-unlinked');

      expect(response.data).toEqual(mockGoogleResponse);
      expect(mockStorage.accessToken).toBeUndefined();
      expect(JSON.parse(mockStorage.sessionUser)).toEqual(unlinkedUser);
      expect(mockStorage.isLoggedIn).toBeUndefined();
      expect(mockStorage.isMoodleLinked).toBe('false');
    });

    it('loginWithGoogle should throw error with server message when domain is restricted (403)', async () => {
      const forbiddenMessage =
        'Доступ дозволено лише для облікових записів @student.karazin.ua та @karazin.ua';

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({
          statusCode: 403,
          message: forbiddenMessage,
          error: 'Forbidden',
        }),
      } as Response);

      await expect(authApi.loginWithGoogle('invalid-domain-token')).rejects.toThrow(
        forbiddenMessage,
      );
    });

    it('login, loginWithGoogle, linkMoodleAccount and logout do not retry failed requests', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('network down'));

      await expect(authApi.login('student@karazin.ua', 'SecretPass123!')).rejects.toThrow(
        'network down',
      );
      await expect(authApi.loginWithGoogle('google-id-token')).rejects.toThrow('network down');
      await expect(authApi.linkMoodleAccount('moodle-user', 'moodle-pass')).rejects.toThrow(
        'network down',
      );
      await expect(authApi.logout()).rejects.toThrow('network down');

      expect(global.fetch).toHaveBeenCalledTimes(4);
    });

    it.each(['linkMoodleAccount', 'unlinkMoodleAccount'] as const)(
      '%s discards responses belonging to a previous session',
      async (method) => {
        global.fetch = vi.fn().mockImplementation(async () => {
          mockStorage.sessionRevision = 'new-tab-revision';

          return { ok: true, json: async () => ({ user: sampleSessionUser, isLinked: true }) };
        });
        await expect(authApi[method]('student', 'password')).rejects.toThrow('Session changed');
        expect(mockStorage.sessionUser).toBeUndefined();
        expect(mockStorage.isMoodleLinked).toBeUndefined();
      },
    );

    it('preserves local metadata when logout returns 401', async () => {
      mockStorage.isLoggedIn = 'true';
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });
      await expect(authApi.logout()).rejects.toThrow('401');
      expect(mockStorage.isLoggedIn).toBe('true');
    });

    it('linkMoodleAccount should send POST to /auth/moodle/link and store updated sessionUser', async () => {
      const mockLinkResponse = {
        isLinked: true,
        user: sampleSessionUser,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockLinkResponse,
      } as Response);

      const response = await authApi.linkMoodleAccount('moodle.student', 'SecretPassword');

      expect(response.data).toEqual(mockLinkResponse);
      expect(mockStorage.accessToken).toBeUndefined();
      expect(JSON.parse(mockStorage.sessionUser)).toEqual(sampleSessionUser);
      expect(mockStorage.isLoggedIn).toBe('true');
      expect(mockStorage.isMoodleLinked).toBe('true');

      const call = vi.mocked(global.fetch).mock.calls[0];

      expect(call[0]).toContain('/auth/moodle/link');
      expect(call[1]?.body).toBe(
        JSON.stringify({ username: 'moodle.student', password: 'SecretPassword' }),
      );
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

    it('retries a failed request twice by default', async () => {
      vi.useFakeTimers();
      global.fetch = vi.fn().mockRejectedValue(new Error('network down'));

      try {
        const rejection = expect(moodleApi.getCourses()).rejects.toThrow('network down');

        await vi.runAllTimersAsync();
        await rejection;

        expect(global.fetch).toHaveBeenCalledTimes(3);
      } finally {
        vi.useRealTimers();
      }
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

  describe('Token Refresh and Session Handling', () => {
    const refreshedSessionUser = {
      id: 'user-1',
      email: 'student@karazin.ua',
      name: 'Test Student',
      roles: ['MOODLE_STUDENT'],
      isLinked: true,
    };

    it('automatically refreshes cookie session on 401 and retries original request', async () => {
      mockStorage.isLoggedIn = 'true';

      const mockCourses = [{ id: 101, fullname: 'Основи програмування' }];
      let cookieRefreshed = false;

      global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        expect(init?.credentials).toBe('include');
        expect((init?.headers as Record<string, string>)?.['X-Requested-With']).toBe(
          'XMLHttpRequest',
        );

        if (url.includes('/auth/refresh')) {
          cookieRefreshed = true;

          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ user: refreshedSessionUser }),
          } as Response);
        }

        if (url.includes('/moodle/courses')) {
          if (cookieRefreshed) {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: async () => mockCourses,
            } as Response);
          }

          return Promise.resolve({
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            json: async () => ({ statusCode: 401, message: 'Unauthorized' }),
          } as Response);
        }

        return Promise.reject(new Error(`Unexpected call to ${url}`));
      });

      const response = await moodleApi.getCourses();

      expect(response.data).toEqual(mockCourses);
      expect(mockStorage.accessToken).toBeUndefined();
      expect(JSON.parse(mockStorage.sessionUser)).toEqual(refreshedSessionUser);

      const fetchCalls = vi.mocked(global.fetch).mock.calls;

      expect(fetchCalls).toHaveLength(3);
      expect(fetchCalls[0][0]).toContain('/moodle/courses');
      expect(fetchCalls[1][0]).toContain('/auth/refresh');
      expect(fetchCalls[2][0]).toContain('/moodle/courses');
    });

    it('deduplicates concurrent 401 requests to a single /auth/refresh call', async () => {
      mockStorage.isLoggedIn = 'true';

      let refreshCallCount = 0;
      let cookieRefreshed = false;

      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/auth/refresh')) {
          refreshCallCount += 1;
          await new Promise((resolve) => setTimeout(resolve, 20));
          cookieRefreshed = true;

          return {
            ok: true,
            status: 200,
            json: async () => ({ user: refreshedSessionUser }),
          } as Response;
        }

        if (cookieRefreshed) {
          return {
            ok: true,
            status: 200,
            json: async () => [],
          } as Response;
        }

        return {
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: async () => ({ statusCode: 401, message: 'Unauthorized' }),
        } as Response;
      });

      const [coursesRes, gradesRes] = await Promise.all([
        moodleApi.getCourses(),
        moodleApi.getGrades(),
      ]);

      expect(coursesRes.data).toEqual([]);
      expect(gradesRes.data).toEqual([]);
      expect(refreshCallCount).toBe(1);
    });

    it('clears session storage and throws 401 when /auth/refresh returns 401', async () => {
      mockStorage.isLoggedIn = 'true';
      mockStorage.sessionUser = JSON.stringify(refreshedSessionUser);

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/auth/refresh')) {
          return Promise.resolve({
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            json: async () => ({ statusCode: 401, message: 'Refresh token expired' }),
          } as Response);
        }

        return Promise.resolve({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: async () => ({ statusCode: 401, message: 'Unauthorized' }),
        } as Response);
      });

      await expect(moodleApi.getCourses()).rejects.toThrow('Refresh token expired (HTTP 401)');
      expect(mockStorage.sessionUser).toBeUndefined();
      expect(mockStorage.isLoggedIn).toBeUndefined();
    });

    it('clears session storage and throws 403 when /auth/refresh returns 403 Forbidden', async () => {
      mockStorage.isLoggedIn = 'true';
      mockStorage.sessionUser = JSON.stringify(refreshedSessionUser);

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/auth/refresh')) {
          return Promise.resolve({
            ok: false,
            status: 403,
            statusText: 'Forbidden',
            json: async () => ({ statusCode: 403, message: 'Refresh token revoked' }),
          } as Response);
        }

        return Promise.resolve({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: async () => ({ statusCode: 401, message: 'Unauthorized' }),
        } as Response);
      });

      await expect(moodleApi.getCourses()).rejects.toThrow('Refresh token revoked (HTTP 403)');
      expect(mockStorage.sessionUser).toBeUndefined();
      expect(mockStorage.isLoggedIn).toBeUndefined();
    });

    it('reuses refreshed cookie session when a trailing 401 request completes after refresh', async () => {
      mockStorage.isLoggedIn = 'true';

      let refreshCallCount = 0;
      let gradesCallCount = 0;
      let releaseTrailingGrades401!: () => void;
      const trailingGrades401Gate = new Promise<void>((resolve) => {
        releaseTrailingGrades401 = resolve;
      });
      let cookieRefreshed = false;

      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/auth/refresh')) {
          refreshCallCount += 1;
          cookieRefreshed = true;

          return {
            ok: true,
            status: 200,
            json: async () => ({ user: refreshedSessionUser }),
          } as Response;
        }

        if (url.includes('/moodle/grades')) {
          gradesCallCount += 1;

          if (gradesCallCount === 1) {
            await trailingGrades401Gate;

            return {
              ok: false,
              status: 401,
              statusText: 'Unauthorized',
              json: async () => ({ statusCode: 401, message: 'Unauthorized' }),
            } as Response;
          }

          return {
            ok: true,
            status: 200,
            json: async () => [],
          } as Response;
        }

        if (cookieRefreshed) {
          return {
            ok: true,
            status: 200,
            json: async () => [],
          } as Response;
        }

        return {
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: async () => ({ statusCode: 401, message: 'Unauthorized' }),
        } as Response;
      });

      // Start both requests before refresh completes so trailing request enters with stale epoch
      const coursesPromise = moodleApi.getCourses();
      const trailingGradesPromise = moodleApi.getGrades();

      await coursesPromise;
      expect(refreshCallCount).toBe(1);

      // Now let the trailing request receive its initial 401 after refresh already bumped refreshEpoch
      releaseTrailingGrades401();

      const trailingResult = await trailingGradesPromise;

      expect(trailingResult.data).toEqual([]);
      expect(gradesCallCount).toBe(2);
      expect(refreshCallCount).toBe(1);
    });

    it('does not repopulate session or replay request if user logs out while refresh is in flight', async () => {
      mockStorage.isLoggedIn = 'true';
      mockStorage.sessionUser = JSON.stringify(refreshedSessionUser);

      let coursesCallCount = 0;
      let releaseRefresh!: () => void;
      const refreshGate = new Promise<void>((resolve) => {
        releaseRefresh = resolve;
      });
      let refreshStarted!: () => void;
      const refreshStartedPromise = new Promise<void>((resolve) => {
        refreshStarted = resolve;
      });

      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/auth/refresh')) {
          refreshStarted();
          await refreshGate;

          return {
            ok: true,
            status: 200,
            json: async () => ({ user: refreshedSessionUser }),
          } as Response;
        }

        coursesCallCount += 1;

        return {
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: async () => ({ statusCode: 401, message: 'Unauthorized' }),
        } as Response;
      });

      const coursesPromise = moodleApi.getCourses();

      await refreshStartedPromise;
      clearUserSessionStorage();
      releaseRefresh();

      await expect(coursesPromise).rejects.toThrow('Session changed during token refresh');
      expect(mockStorage.sessionUser).toBeUndefined();
      expect(coursesCallCount).toBe(1);
    });

    it('preserves a replacement session when an in-flight refresh is rejected', async () => {
      mockStorage.isLoggedIn = 'true';
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.endsWith('/auth/refresh')) {
          mockStorage.sessionRevision = 'another-tab-login';
          mockStorage.sessionUser = JSON.stringify(refreshedSessionUser);
        }

        return { ok: false, status: 401, json: async () => ({ message: 'Unauthorized' }) };
      });

      await expect(moodleApi.getCourses()).rejects.toThrow(
        /^Session changed during token refresh$/,
      );
      expect(JSON.parse(mockStorage.sessionUser)).toEqual(refreshedSessionUser);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('does not wipe a newly logged-in user session when a stale 401 fails', async () => {
      const userA = { ...refreshedSessionUser, id: 'user-a', email: 'a@karazin.ua' };
      const userB = { ...refreshedSessionUser, id: 'user-b', email: 'b@karazin.ua' };

      saveSessionUser(userA);
      mockStorage.isLoggedIn = 'true';

      let releaseStaleResponse!: () => void;
      const staleGate = new Promise<void>((resolve) => {
        releaseStaleResponse = resolve;
      });

      global.fetch = vi.fn().mockImplementation(async () => {
        await staleGate;

        return {
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: async () => ({ statusCode: 401, message: 'Unauthorized' }),
        } as Response;
      });

      const staleRequest = moodleApi.getCourses();

      // Another tab starts a session before storage events reach this tab.
      mockStorage.sessionRevision = 'new-tab-revision';
      saveSessionUser(userB);
      mockStorage.isLoggedIn = 'true';
      releaseStaleResponse();

      await expect(staleRequest).rejects.toThrow('Session changed during request');
      expect(JSON.parse(mockStorage.sessionUser)).toEqual(userB);
    });

    it('does not refresh token when skipAuthRefresh option is passed', async () => {
      mockStorage.isLoggedIn = 'true';

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ statusCode: 401, message: 'Unauthorized' }),
      } as Response);

      class CustomClient extends ApiClient {
        fetchNoRefresh() {
          return this.request('/moodle/profile', { skipAuthRefresh: true });
        }
      }

      const custom = new CustomClient();

      await expect(custom.fetchNoRefresh()).rejects.toThrow('Unauthorized (HTTP 401)');

      const refreshCalls = vi
        .mocked(global.fetch)
        .mock.calls.filter((call) => String(call[0]).includes('/auth/refresh'));

      expect(refreshCalls).toHaveLength(0);
    });

    it('does not clear session storage when /auth/refresh fails due to network error', async () => {
      mockStorage.sessionUser = JSON.stringify(refreshedSessionUser);
      mockStorage.isLoggedIn = 'true';

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/auth/refresh')) {
          return Promise.reject(new Error('Network offline'));
        }

        return Promise.resolve({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: async () => ({ statusCode: 401, message: 'Unauthorized' }),
        } as Response);
      });

      await expect(moodleApi.getCourses()).rejects.toThrow('Network offline');
      expect(JSON.parse(mockStorage.sessionUser)).toEqual(refreshedSessionUser);
      expect(mockStorage.isLoggedIn).toBe('true');
    });

    it('does not attempt token refresh when public login endpoint returns 401', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ statusCode: 401, message: 'Invalid credentials' }),
      } as Response);

      await expect(authApi.login('wrong@student.karazin.ua', 'wrong-pass')).rejects.toThrow(
        'Invalid credentials (HTTP 401)',
      );

      const calledUrls = vi.mocked(global.fetch).mock.calls.map((call) => call[0]);

      expect(calledUrls.some((url) => String(url).includes('/auth/refresh'))).toBe(false);
    });

    it('downloads Moodle attachments as blobs through the authenticated backend proxy', async () => {
      mockStorage.accessToken = 'jwt-access-token';
      const expectedBlob = new Blob(['pdf-content'], { type: 'application/pdf' });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        blob: async () => expectedBlob,
      } as Response);

      const fileUrl = 'https://moodle.test/webservice/pluginfile.php/12/task.pdf';
      const result = await moodleApi.downloadFile(fileUrl);

      expect(result).toBe(expectedBlob);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/moodle/files/download?url=${encodeURIComponent(fileUrl)}`),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer jwt-access-token',
          }),
          credentials: 'include',
        }),
      );
    });
  });

  describe('getErrorMessage', () => {
    it('strips trailing HTTP status codes from error messages', () => {
      expect(getErrorMessage(new Error('Access denied (HTTP 403)'), 'Fallback')).toBe(
        'Access denied',
      );
      expect(
        getErrorMessage(
          { response: { data: { message: 'Already exists (HTTP 409)' } } },
          'Fallback',
        ),
      ).toBe('Already exists');
    });

    it('returns localized fallback when only a transport HTTP error string is available', () => {
      expect(getErrorMessage(new Error('HTTP error 403: Forbidden'), 'Sign in failed')).toBe(
        'Sign in failed',
      );
      expect(getErrorMessage(null, 'Sign in failed')).toBe('Sign in failed');
    });
  });
});
