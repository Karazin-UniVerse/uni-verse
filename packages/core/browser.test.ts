import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { isBrowser } from './browser.ts';

describe('browser utilities', () => {
  test('isBrowser returns false in Node test environment', () => {
    assert.strictEqual(isBrowser(), false);
  });
});
