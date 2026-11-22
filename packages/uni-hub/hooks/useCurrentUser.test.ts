import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { ROLE } from '@core/constants/roles';
import { safeStorage } from '@uni-hub/services/api.storage';
import { clearUserSessionStorage, saveSessionUser } from '@uni-hub/services/api.session';
import { useCurrentUser } from './useCurrentUser';

describe('useCurrentUser hook', () => {
  beforeEach(() => {
    safeStorage.removeItem('sessionUser');
  });

  it('should return null userId and empty roles when no session user is stored', () => {
    const { result } = renderHook(() => useCurrentUser());

    expect(result.current).toEqual({
      userId: null,
      roles: [],
      email: undefined,
      name: undefined,
    });
  });

  it('should return user details (userId, roles, email, name) when valid sessionUser is stored', () => {
    safeStorage.setItem(
      'sessionUser',
      JSON.stringify({
        id: 'user-123',
        roles: [ROLE.ADMIN, ROLE.MOODLE_STUDENT],
        email: 'test@karazin.ua',
        name: 'Test User',
        isLinked: true,
      }),
    );

    const { result } = renderHook(() => useCurrentUser());

    expect(result.current).toEqual({
      userId: 'user-123',
      roles: [ROLE.ADMIN, ROLE.MOODLE_STUDENT],
      email: 'test@karazin.ua',
      name: 'Test User',
    });
  });

  it('should handle non-array roles in sessionUser by defaulting to empty array', () => {
    safeStorage.setItem(
      'sessionUser',
      JSON.stringify({
        id: 'user-456',
        roles: 'not-an-array',
        email: 'user@karazin.ua',
        name: 'Sample User',
      }),
    );

    const { result } = renderHook(() => useCurrentUser());

    expect(result.current).toEqual({
      userId: 'user-456',
      roles: [],
      email: 'user@karazin.ua',
      name: 'Sample User',
    });
  });

  it('should handle malformed sessionUser JSON safely', () => {
    safeStorage.setItem('sessionUser', 'not-valid-json');

    const { result } = renderHook(() => useCurrentUser());

    expect(result.current).toEqual({
      userId: null,
      roles: [],
      email: undefined,
      name: undefined,
    });
  });

  it('should reactively update when saveSessionUser and clearUserSessionStorage are called', () => {
    const { result } = renderHook(() => useCurrentUser());

    expect(result.current.userId).toBeNull();

    act(() => {
      saveSessionUser({
        id: 'live-user',
        email: 'live@karazin.ua',
        name: 'Live User',
        roles: [ROLE.MOODLE_STUDENT],
        isLinked: true,
      });
    });

    expect(result.current).toEqual({
      userId: 'live-user',
      roles: [ROLE.MOODLE_STUDENT],
      email: 'live@karazin.ua',
      name: 'Live User',
    });

    act(() => {
      clearUserSessionStorage();
    });

    expect(result.current).toEqual({
      userId: null,
      roles: [],
      email: undefined,
      name: undefined,
    });
  });
});
