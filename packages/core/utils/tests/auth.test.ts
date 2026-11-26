import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { isLoggedIn } from '../auth.ts';

describe('auth utilities', () => {
  test('isLoggedIn returns false when storage is empty or missing credentials', () => {
    assert.strictEqual(isLoggedIn(), false);

    const emptyStore = { getItem: () => null };

    assert.strictEqual(isLoggedIn(emptyStore), false);
  });

  test('isLoggedIn checks session correctly', () => {
    const validStore = {
      getItem: (key: string) => (key === 'isLoggedIn' ? 'true' : null),
    };

    assert.strictEqual(isLoggedIn(validStore), true);

    const invalidStore = {
      getItem: (key: string) => (key === 'isLoggedIn' ? 'false' : null),
    };

    assert.strictEqual(isLoggedIn(invalidStore), false);
  });
});
