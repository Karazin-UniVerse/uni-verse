import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { safeStorage } from '@uni-hub/services/api.storage';
import { useGamificationStore } from '@uni-hub/store/useGamificationStore';
import { useAuthProtection } from './useAuthProtection';

const replace = vi.fn();
const router = { replace };

vi.mock('next/navigation', () => ({ useRouter: () => router }));

let loggedIn = true;

vi.mock('@core/utils/auth', () => ({ isLoggedIn: () => loggedIn }));

describe('useAuthProtection', () => {
  beforeEach(() => {
    loggedIn = true;
    localStorage.clear();
    replace.mockClear();
    vi.spyOn(safeStorage, 'getItem').mockImplementation((key) =>
      key === 'accessToken'
        ? `header.${btoa(JSON.stringify({ sub: 'alice' }))}.signature`
        : localStorage.getItem(key),
    );
    useGamificationStore.setState(useGamificationStore.getInitialState());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not redirect when user is authenticated with matching token', () => {
    renderHook(() => useAuthProtection('alice'));

    expect(replace).not.toHaveBeenCalled();
  });

  it('redirects to /login and clears active user when user is not logged in', () => {
    loggedIn = false;
    useGamificationStore.getState().setActiveUser('alice');

    renderHook(() => useAuthProtection('alice'));

    expect(replace).toHaveBeenCalledWith('/login');
    expect(useGamificationStore.getState().activeUserId).toBeNull();
  });

  it('redirects to /login and clears active user when token is missing', () => {
    vi.mocked(safeStorage.getItem).mockReturnValue(null);
    useGamificationStore.getState().setActiveUser('alice');

    renderHook(() => useAuthProtection('alice'));

    expect(replace).toHaveBeenCalledWith('/login');
    expect(useGamificationStore.getState().activeUserId).toBeNull();
  });

  it('redirects to /login and clears active user when userId is null', () => {
    renderHook(() => useAuthProtection(null));

    expect(replace).toHaveBeenCalledWith('/login');
    expect(useGamificationStore.getState().activeUserId).toBeNull();
  });

  it('redirects to /login and clears active user when token sub mismatches userId', () => {
    vi.mocked(safeStorage.getItem).mockReturnValue(
      `header.${btoa(JSON.stringify({ sub: 'bob' }))}.signature`,
    );
    useGamificationStore.getState().setActiveUser('alice');

    renderHook(() => useAuthProtection('alice'));

    expect(replace).toHaveBeenCalledWith('/login');
    expect(useGamificationStore.getState().activeUserId).toBeNull();
  });

  it('redirects to /login on cross-tab storage change when token owner changes', () => {
    renderHook(() => useAuthProtection('alice'));

    vi.mocked(safeStorage.getItem).mockReturnValue(
      `header.${btoa(JSON.stringify({ sub: 'bob' }))}.signature`,
    );
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'accessToken' }));
    });

    expect(replace).toHaveBeenCalledWith('/login');
    expect(useGamificationStore.getState().activeUserId).toBeNull();
  });

  it('redirects to /login on cross-tab storage change when session ends', () => {
    renderHook(() => useAuthProtection('alice'));

    loggedIn = false;
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'accessToken' }));
    });

    expect(replace).toHaveBeenCalledWith('/login');
    expect(useGamificationStore.getState().activeUserId).toBeNull();
  });

  it('cleans up storage listener on unmount', () => {
    const { unmount } = renderHook(() => useAuthProtection('alice'));

    unmount();
    loggedIn = false;
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'accessToken' }));
    });

    expect(replace).not.toHaveBeenCalled();
  });
});
