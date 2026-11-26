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
      key === 'sessionUser'
        ? JSON.stringify({ id: 'alice', email: 'alice@karazin.ua', roles: [], isLinked: false })
        : localStorage.getItem(key),
    );
    useGamificationStore.setState(useGamificationStore.getInitialState());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not redirect when user is authenticated with matching session user', () => {
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

  it('redirects to /login and clears active user when sessionUser is missing', () => {
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

  it('redirects to /login and clears active user when sessionUser id mismatches userId', () => {
    vi.mocked(safeStorage.getItem).mockReturnValue(
      JSON.stringify({ id: 'bob', email: 'bob@karazin.ua', roles: [], isLinked: false }),
    );
    useGamificationStore.getState().setActiveUser('alice');

    renderHook(() => useAuthProtection('alice'));

    expect(replace).toHaveBeenCalledWith('/login');
    expect(useGamificationStore.getState().activeUserId).toBeNull();
  });

  it('redirects to /login on cross-tab storage change when session owner changes', () => {
    renderHook(() => useAuthProtection('alice'));

    vi.mocked(safeStorage.getItem).mockReturnValue(
      JSON.stringify({ id: 'bob', email: 'bob@karazin.ua', roles: [], isLinked: false }),
    );
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'sessionUser' }));
    });

    expect(replace).toHaveBeenCalledWith('/login');
    expect(useGamificationStore.getState().activeUserId).toBeNull();
  });

  it('redirects to /login on cross-tab storage change when session ends', () => {
    renderHook(() => useAuthProtection('alice'));

    loggedIn = false;
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'sessionUser' }));
    });

    expect(replace).toHaveBeenCalledWith('/login');
    expect(useGamificationStore.getState().activeUserId).toBeNull();
  });

  it('cleans up storage listener on unmount', () => {
    const { unmount } = renderHook(() => useAuthProtection('alice'));

    unmount();
    loggedIn = false;
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'sessionUser' }));
    });

    expect(replace).not.toHaveBeenCalled();
  });
});
