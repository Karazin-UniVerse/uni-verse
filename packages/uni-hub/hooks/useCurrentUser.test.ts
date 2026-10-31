import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { safeStorage } from '@uni-hub/services/api.storage';
import { useCurrentUser } from './useCurrentUser';

function createMockToken(payload: Record<string, unknown>): string {
  const base64Payload = btoa(JSON.stringify(payload));

  return `header.${base64Payload}.signature`;
}

describe('useCurrentUser hook', () => {
  beforeEach(() => {
    safeStorage.removeItem('accessToken');
  });

  it('should return null userId and empty roles when no access token exists', () => {
    const { result } = renderHook(() => useCurrentUser());

    expect(result.current).toEqual({
      userId: null,
      roles: [],
      email: undefined,
      name: undefined,
    });
  });

  it('should return user details (userId, roles, email, name) when valid JWT token is stored', () => {
    const payload = {
      sub: 'user-123',
      roles: ['admin', 'student'],
      email: 'test@example.com',
      name: 'Test User',
    };
    const token = createMockToken(payload);

    safeStorage.setItem('accessToken', token);

    const { result } = renderHook(() => useCurrentUser());

    expect(result.current).toEqual({
      userId: 'user-123',
      roles: ['admin', 'student'],
      email: 'test@example.com',
      name: 'Test User',
    });
  });

  it('should handle non-array roles in JWT by defaulting to empty array', () => {
    const payload = {
      sub: 'user-456',
      roles: 'not-an-array',
      email: 'user@example.com',
      name: 'Sample User',
    };
    const token = createMockToken(payload);

    safeStorage.setItem('accessToken', token);

    const { result } = renderHook(() => useCurrentUser());

    expect(result.current).toEqual({
      userId: 'user-456',
      roles: [],
      email: 'user@example.com',
      name: 'Sample User',
    });
  });

  it('should handle malformed or corrupted JWT token safely', () => {
    safeStorage.setItem('accessToken', 'malformed-jwt-token');

    const { result } = renderHook(() => useCurrentUser());

    expect(result.current).toEqual({
      userId: null,
      roles: [],
      email: undefined,
      name: undefined,
    });
  });
});
