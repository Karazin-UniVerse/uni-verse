import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { parseBoolean } from '../boolean.ts';

describe('boolean utils', () => {
  describe('parseBoolean', () => {
    test('handles boolean values', () => {
      assert.strictEqual(parseBoolean(true), true);
      assert.strictEqual(parseBoolean(false), false);
    });

    test('handles number values 1 and 0', () => {
      assert.strictEqual(parseBoolean(1), true);
      assert.strictEqual(parseBoolean(0), false);
    });

    test('handles truthy string values', () => {
      assert.strictEqual(parseBoolean('true'), true);
      assert.strictEqual(parseBoolean('TRUE'), true);
      assert.strictEqual(parseBoolean('1'), true);
      assert.strictEqual(parseBoolean('yes'), true);
      assert.strictEqual(parseBoolean('on'), true);
    });

    test('handles falsy string values', () => {
      assert.strictEqual(parseBoolean('false'), false);
      assert.strictEqual(parseBoolean('FALSE'), false);
      assert.strictEqual(parseBoolean('0'), false);
      assert.strictEqual(parseBoolean('no'), false);
      assert.strictEqual(parseBoolean('off'), false);
    });

    test('returns undefined for non-boolean inputs', () => {
      assert.strictEqual(parseBoolean('other'), undefined);
      assert.strictEqual(parseBoolean(undefined), undefined);
      assert.strictEqual(parseBoolean(null), undefined);
    });
  });
});
