import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGamificationStore } from '@uni-hub/store/useGamificationStore';
import { useDailyStreak } from './useDailyStreak';
import { safeStorage } from '@uni-hub/services/api.storage';

const replace = vi.fn();
const router = { replace };

vi.mock('next/navigation', () => ({ useRouter: () => router }));

let loggedIn = true;

vi.mock('@core/utils/auth', () => ({ isLoggedIn: () => loggedIn }));

describe('daily streak lifecycle', () => {
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
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 20, 23, 59, 59));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('counts midnight once and removes listeners and timers on unmount', () => {
    const { unmount } = renderHook(() => useDailyStreak('alice'));

    expect(useGamificationStore.getState().currentStreak).toBe(1);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(useGamificationStore.getState().currentStreak).toBe(2);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    vi.setSystemTime(new Date(2026, 9, 23, 12));
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(useGamificationStore.getState().currentStreak).toBe(0);
    expect(useGamificationStore.getState().progressByUser.alice.currentStreak).toBe(2);
  });

  it('rechecks on focus and visible-tab return after missing a day', () => {
    renderHook(() => useDailyStreak('alice'));
    vi.setSystemTime(new Date(2026, 9, 21, 12));
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(useGamificationStore.getState().currentStreak).toBe(2);
    vi.setSystemTime(new Date(2026, 9, 23, 12));
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(useGamificationStore.getState().currentStreak).toBe(1);
  });

  it('does not count hidden-tab midnight until the user returns', () => {
    renderHook(() => useDailyStreak('alice'));
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(useGamificationStore.getState().currentStreak).toBe(1);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(useGamificationStore.getState().currentStreak).toBe(2);
  });

  it('switches accounts without inheriting progress and clears active state on logout', () => {
    const { rerender } = renderHook(({ id }) => useDailyStreak(id), {
      initialProps: { id: 'alice' as string | null },
    });

    act(() => {
      useGamificationStore.getState().unlockBadge('NIGHT_OWL');
    });
    vi.mocked(safeStorage.getItem).mockReturnValue(
      `header.${btoa(JSON.stringify({ sub: 'bob' }))}.signature`,
    );
    rerender({ id: 'bob' });
    expect(useGamificationStore.getState().unlockedBadges).toEqual([]);
    rerender({ id: null });
    expect(useGamificationStore.getState().currentStreak).toBe(0);
  });

  it('stops stale dashboard progress when another tab changes the session owner', () => {
    renderHook(() => useDailyStreak('alice'));
    vi.setSystemTime(new Date(2026, 9, 21, 12));
    vi.mocked(safeStorage.getItem).mockReturnValue(
      `header.${btoa(JSON.stringify({ sub: 'bob' }))}.signature`,
    );
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'accessToken' }));
    });
    expect(useGamificationStore.getState().activeUserId).toBeNull();
    expect(useGamificationStore.getState().progressByUser.alice.currentStreak).toBe(1);
    expect(replace).toHaveBeenCalledWith('/login');
  });

  it('does not increase the streak after the authenticated session ends', () => {
    renderHook(() => useDailyStreak('alice'));
    loggedIn = false;
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(useGamificationStore.getState().currentStreak).toBe(0);
    expect(useGamificationStore.getState().progressByUser.alice.currentStreak).toBe(1);
  });
});
