import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { noop } from '../fn.ts';

describe('fn utils', () => {
  test('noop is a callable function that returns undefined', () => {
    assert.strictEqual(typeof noop, 'function');
    assert.strictEqual(noop(), undefined);
  });
});
