import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { moodleKeys } from '@uni-hub/queries/moodle/queryKeys';
import { opportunityKeys } from '@uni-hub/views/dashboard/tabs/opportunities/queryKeys';
import {
  USER_SESSION_STORAGE_KEYS,
  clearUserSessionStorage,
  endSession,
  getSessionGeneration,
  getSessionUserSnapshot,
  readSessionUser,
  saveSessionUser,
  subscribeSessionUser,
} from './api.session';
import { useGamificationStore } from '@uni-hub/store/useGamificationStore';

const storage: Record<string, string> = {};

beforeEach(() => {
  for (const key of Object.keys(storage)) {
    delete storage[key];
  }

  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => storage[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      storage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete storage[key];
    }),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function seedSession(): void {
  for (const key of USER_SESSION_STORAGE_KEYS) {
    storage[key] = 'value';
  }

  storage.language = 'uk';
}

function seedQueryClient(): QueryClient {
  const queryClient = new QueryClient();

  queryClient.setQueryData(opportunityKeys.mine(), [{ id: 'opp-1' }]);
  queryClient.setQueryData(moodleKeys.profile(), { id: 'user-1' });

  return queryClient;
}

describe('clearUserSessionStorage', () => {
  it('removes every session key and leaves unrelated keys alone', () => {
    seedSession();

    clearUserSessionStorage();

    for (const key of USER_SESSION_STORAGE_KEYS) {
      expect(storage[key]).toBeUndefined();
    }

    expect(storage.language).toBe('uk');
  });
});

describe('endSession', () => {
  it('clears visible gamification progress but preserves the account history', () => {
    const store = useGamificationStore.getState();

    store.setActiveUser('logout-user');
    store.checkIn();
    store.unlockBadge('NIGHT_OWL');
    endSession(new QueryClient());
    expect(useGamificationStore.getState().activeUserId).toBeNull();
    expect(useGamificationStore.getState().currentStreak).toBe(0);
    expect(useGamificationStore.getState().unlockedBadges).toEqual([]);
    store.setActiveUser('logout-user');
    expect(useGamificationStore.getState().currentStreak).toBe(1);
    expect(useGamificationStore.getState().unlockedBadges).toContain('NIGHT_OWL');
    store.setActiveUser(null);
  });
  it('clears the session storage and the whole query cache', () => {
    seedSession();

    const queryClient = seedQueryClient();

    endSession(queryClient);

    expect(storage.accessToken).toBeUndefined();
    expect(queryClient.getQueryCache().getAll()).toEqual([]);
  });
});

describe('sessionUser helpers', () => {
  it('saves, reads, and caches sessionUser snapshots while notifying subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSessionUser(listener);
    const generationBefore = getSessionGeneration();
    const user = {
      id: 'user-1',
      email: 'student@karazin.ua',
      name: 'Student',
      roles: ['MOODLE_STUDENT'],
      isLinked: true,
    };

    saveSessionUser(user);

    expect(readSessionUser()).toEqual(user);
    expect(storage.userEmail).toBe('student@karazin.ua');
    expect(listener).toHaveBeenCalledTimes(1);

    const firstSnapshot = getSessionUserSnapshot();
    const secondSnapshot = getSessionUserSnapshot();

    expect(firstSnapshot).toEqual(user);
    expect(secondSnapshot).toBe(firstSnapshot);

    // Switching to another account increments sessionGeneration
    saveSessionUser({ ...user, id: 'user-2' });
    expect(getSessionGeneration()).toBe(generationBefore + 1);
    expect(listener).toHaveBeenCalledTimes(2);

    clearUserSessionStorage();
    expect(getSessionGeneration()).toBe(generationBefore + 2);
    expect(getSessionUserSnapshot()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
  });

  it('returns null from readSessionUser on missing, invalid, or incomplete JSON', () => {
    expect(readSessionUser()).toBeNull();

    storage.sessionUser = 'not-json';
    expect(readSessionUser()).toBeNull();

    storage.sessionUser = JSON.stringify({ email: 'missing-id@karazin.ua' });
    expect(readSessionUser()).toBeNull();
  });
});
