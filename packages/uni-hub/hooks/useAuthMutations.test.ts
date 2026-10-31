import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MutationObserver, QueryClient } from '@tanstack/react-query';
import { authApi } from '@uni-hub/services/api.auth';
import { opportunityKeys } from '@uni-hub/views/dashboard/tabs/opportunities/queryKeys';
import { googleLoginMutationOptions, logoutMutationOptions } from './useAuthMutations';

const storage: Record<string, string> = {};

function seedPreviousUser(): QueryClient {
  const queryClient = new QueryClient();

  queryClient.setQueryData(opportunityKeys.mine(), [{ id: 'opp-of-previous-user' }]);

  return queryClient;
}

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
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('googleLoginMutationOptions', () => {
  it('drops the cache of the previous user after a successful Google login', async () => {
    vi.spyOn(authApi, 'loginWithGoogle').mockResolvedValue({
      data: { access_token: 'token', isLinked: false },
    });

    const queryClient = seedPreviousUser();
    const observer = new MutationObserver(queryClient, googleLoginMutationOptions(queryClient));

    await observer.mutate('id-token');

    expect(queryClient.getQueryData(opportunityKeys.mine())).toBeUndefined();
  });

  it('keeps the cache when the Google login fails', async () => {
    vi.spyOn(authApi, 'loginWithGoogle').mockRejectedValue(new Error('HTTP error 401'));

    const queryClient = seedPreviousUser();
    const observer = new MutationObserver(queryClient, googleLoginMutationOptions(queryClient));

    await expect(observer.mutate('bad-token')).rejects.toThrow('401');

    expect(queryClient.getQueryData(opportunityKeys.mine())).toEqual([
      { id: 'opp-of-previous-user' },
    ]);
  });
});

describe('logoutMutationOptions', () => {
  it('clears the session storage and the cache even when the logout request fails', async () => {
    vi.spyOn(authApi, 'logout').mockRejectedValue(new Error('Network failure'));
    storage.accessToken = 'token';

    const queryClient = seedPreviousUser();
    const observer = new MutationObserver(queryClient, logoutMutationOptions(queryClient));

    await expect(observer.mutate(undefined)).rejects.toThrow('Network failure');

    expect(storage.accessToken).toBeUndefined();
    expect(queryClient.getQueryData(opportunityKeys.mine())).toBeUndefined();
  });
});
