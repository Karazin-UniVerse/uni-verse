import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGamificationStore } from './useGamificationStore';

describe('account-scoped daily streak', () => {
  beforeEach(() => {
    localStorage.clear();
    useGamificationStore.setState(useGamificationStore.getInitialState());
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 20, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts local calendar days once and resets after a missed day', () => {
    const store = useGamificationStore.getState();

    store.setActiveUser('alice');
    store.checkIn();
    store.checkIn();
    expect(useGamificationStore.getState().currentStreak).toBe(1);
    vi.setSystemTime(new Date(2026, 9, 21, 12));
    store.checkIn();
    expect(useGamificationStore.getState().currentStreak).toBe(2);
    vi.setSystemTime(new Date(2026, 9, 23, 12));
    store.checkIn();
    expect(useGamificationStore.getState().currentStreak).toBe(1);
  });

  it('isolates streaks and badges and restores each account after logout', () => {
    const store = useGamificationStore.getState();

    store.setActiveUser('alice');
    store.checkIn();
    store.unlockBadge('NIGHT_OWL');
    store.setSoundEnabled(false);
    vi.setSystemTime(new Date(2026, 9, 21, 12));
    store.checkIn();
    store.setActiveUser(null);
    expect(useGamificationStore.getState().currentStreak).toBe(0);
    expect(store.unlockBadge('SEMESTER_MASTER')).toBe(false);
    store.checkIn();
    store.setActiveUser('bob');
    expect(useGamificationStore.getState().currentStreak).toBe(0);
    expect(useGamificationStore.getState().unlockedBadges).toEqual([]);
    expect(useGamificationStore.getState().soundEnabled).toBe(false);
    store.checkIn();
    store.setActiveUser('alice');
    expect(useGamificationStore.getState().currentStreak).toBe(2);
    expect(useGamificationStore.getState().unlockedBadges).toEqual(['NIGHT_OWL']);
    expect(store.unlockBadge('NIGHT_OWL')).toBe(false);
  });

  it('persists account progress without persisting the active session', async () => {
    const store = useGamificationStore.getState();

    store.setActiveUser('alice');
    store.checkIn();
    store.unlockBadge('NIGHT_OWL');
    const saved = localStorage.getItem('universe-gamification');

    expect(saved).not.toBeNull();
    useGamificationStore.setState(useGamificationStore.getInitialState());
    localStorage.setItem('universe-gamification', saved!);
    await useGamificationStore.persist.rehydrate();
    expect(useGamificationStore.getState().activeUserId).toBeNull();
    store.setActiveUser('alice');
    expect(useGamificationStore.getState().currentStreak).toBe(1);
    expect(useGamificationStore.getState().unlockedBadges).toEqual(['NIGHT_OWL']);
  });

  it('discards unowned legacy progress but preserves sound preferences', async () => {
    localStorage.setItem(
      'universe-gamification',
      JSON.stringify({
        version: 0,
        state: {
          currentStreak: 99,
          lastActiveDate: '2026-10-19',
          unlockedBadges: ['NIGHT_OWL'],
          soundEnabled: false,
        },
      }),
    );
    await useGamificationStore.persist.rehydrate();
    const store = useGamificationStore.getState();

    store.setActiveUser('alice');
    store.checkIn();
    expect(useGamificationStore.getState().currentStreak).toBe(1);
    expect(useGamificationStore.getState().unlockedBadges).toEqual([]);
    expect(useGamificationStore.getState().soundEnabled).toBe(false);
  });

  it('preserves progress written by another tab when changing sound or ending a session', () => {
    const store = useGamificationStore.getState();

    store.setActiveUser('alice');
    store.checkIn();
    const saved = JSON.parse(localStorage.getItem('universe-gamification')!);

    saved.state.progressByUser.bob = {
      currentStreak: 8,
      lastActiveDate: '2026-10-20',
      unlockedBadges: ['NIGHT_OWL'],
      lastCheckInWasNight: false,
    };
    saved.state.progressByUser.alice.unlockedBadges = ['SEMESTER_MASTER'];
    localStorage.setItem('universe-gamification', JSON.stringify(saved));
    store.setSoundEnabled(false);
    store.setActiveUser(null);
    expect(
      JSON.parse(localStorage.getItem('universe-gamification')!).state.progressByUser.bob
        .currentStreak,
    ).toBe(8);
    store.setActiveUser('alice');
    expect(useGamificationStore.getState().unlockedBadges).toContain('SEMESTER_MASTER');
  });

  it.each([
    [new Date(2026, 0, 1, 12), '2025-12-31'],
    [new Date(2024, 2, 1, 12), '2024-02-29'],
    [new Date(2026, 2, 1, 12), '2026-02-28'],
  ])('increments across a calendar boundary %s', (today, yesterday) => {
    const store = useGamificationStore.getState();

    store.setActiveUser('alice');
    useGamificationStore.setState({
      progressByUser: {
        alice: {
          currentStreak: 4,
          lastActiveDate: yesterday,
          unlockedBadges: [],
          lastCheckInWasNight: false,
        },
      },
    });
    vi.setSystemTime(today);
    store.checkIn();
    expect(useGamificationStore.getState().currentStreak).toBe(5);
  });
});
