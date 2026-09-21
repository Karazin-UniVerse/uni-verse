import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { isLoggedIn } from './index.ts';

describe('auth utilities', () => {
  test('isLoggedIn checks session correctly', () => {
    const mockStorage = (items: Record<string, string>) => ({
      getItem: (key: string) => items[key] ?? null,
    });

    assert.strictEqual(
      isLoggedIn(mockStorage({ isLoggedIn: 'true', accessToken: 'token123' })),
      true,
    );
    assert.strictEqual(
      isLoggedIn(mockStorage({ isLoggedIn: 'false', accessToken: 'token123' })),
      false,
    );
    assert.strictEqual(isLoggedIn(mockStorage({ isLoggedIn: 'true' })), false);
    assert.strictEqual(isLoggedIn(mockStorage({ accessToken: 'token123' })), false);
    assert.strictEqual(isLoggedIn(mockStorage({})), false);
    assert.strictEqual(isLoggedIn(undefined), false);
  });
});
