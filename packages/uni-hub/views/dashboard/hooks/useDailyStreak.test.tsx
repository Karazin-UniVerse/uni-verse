import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGamificationStore } from '@uni-hub/store/useGamificationStore';
import { useDailyStreak } from './useDailyStreak';

describe('useDailyStreak', () => {
  beforeEach(() => {
    localStorage.clear();
    useGamificationStore.setState(useGamificationStore.getInitialState());
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 20, 23, 59, 59));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('counts a dashboard visit without awarding a day at midnight', () => {
    const { unmount } = renderHook(() => useDailyStreak('alice'));

    expect(useGamificationStore.getState().currentStreak).toBe(1);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(useGamificationStore.getState().currentStreak).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    vi.setSystemTime(new Date(2026, 9, 23, 12));
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(useGamificationStore.getState().currentStreak).toBe(0);
    expect(useGamificationStore.getState().progressByUser.alice.currentStreak).toBe(1);
  });

  it('does not count focus, visibility, or storage events as dashboard visits', () => {
    const { unmount } = renderHook(() => useDailyStreak('alice'));

    vi.setSystemTime(new Date(2026, 9, 21, 12));
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated' }));
    });
    expect(useGamificationStore.getState().currentStreak).toBe(1);
    expect(useGamificationStore.getState().lastActiveDate).toBe('2026-10-20');
    unmount();
  });

  it('counts consecutive dashboard entries once per day and resets after a missed day', () => {
    const firstVisit = renderHook(() => useDailyStreak('alice'));

    firstVisit.unmount();
    const sameDayVisit = renderHook(() => useDailyStreak('alice'));

    expect(useGamificationStore.getState().currentStreak).toBe(1);
    sameDayVisit.unmount();
    vi.setSystemTime(new Date(2026, 9, 21, 12));
    const nextDayVisit = renderHook(() => useDailyStreak('alice'));

    expect(useGamificationStore.getState().currentStreak).toBe(2);
    nextDayVisit.unmount();
    vi.setSystemTime(new Date(2026, 9, 23, 12));
    renderHook(() => useDailyStreak('alice'));
    expect(useGamificationStore.getState().currentStreak).toBe(1);
  });

  it('switches accounts without inheriting progress and clears active state on logout', () => {
    const { rerender } = renderHook(({ id }) => useDailyStreak(id), {
      initialProps: { id: 'alice' as string | null },
    });

    act(() => {
      useGamificationStore.getState().unlockBadge('NIGHT_OWL');
    });
    rerender({ id: 'bob' });
    expect(useGamificationStore.getState().unlockedBadges).toEqual([]);
    rerender({ id: null });
    expect(useGamificationStore.getState().currentStreak).toBe(0);
  });

  it('does not award progress when userId is null', () => {
    renderHook(() => useDailyStreak(null));

    expect(useGamificationStore.getState().activeUserId).toBeNull();
    expect(useGamificationStore.getState().currentStreak).toBe(0);
  });
});
