import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { moodleKeys } from '@uni-hub/queries/moodle/queryKeys';
import { opportunityKeys } from '@uni-hub/views/dashboard/tabs/opportunities/queryKeys';
import { USER_SESSION_STORAGE_KEYS, clearUserSessionStorage, endSession } from './api.session';
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
