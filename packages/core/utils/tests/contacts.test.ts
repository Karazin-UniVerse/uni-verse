import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { isValidContactInfo } from '../contacts.ts';

describe('contacts utils', () => {
  describe('isValidContactInfo', () => {
    test('validates telegram usernames', () => {
      assert.strictEqual(isValidContactInfo('@username'), true);
      assert.strictEqual(isValidContactInfo('@user_123'), true);
      assert.strictEqual(isValidContactInfo('@abcd'), true);
      assert.strictEqual(isValidContactInfo('@12345'), false);
      assert.strictEqual(isValidContactInfo('@a'), false);
      assert.strictEqual(isValidContactInfo('@'), false);
    });

    test('validates t.me links', () => {
      assert.strictEqual(isValidContactInfo('t.me/karazin_dev'), true);
      assert.strictEqual(isValidContactInfo('https://t.me/karazin_dev'), true);
      assert.strictEqual(isValidContactInfo('http://t.me/karazin_dev/'), true);
      assert.strictEqual(isValidContactInfo('https://www.t.me/karazin_dev'), true);
      assert.strictEqual(isValidContactInfo('t.me/12345'), false);
      assert.strictEqual(isValidContactInfo('https://t.me/12345'), false);
    });

    test('validates phone numbers', () => {
      assert.strictEqual(isValidContactInfo('+380501234567'), true);
      assert.strictEqual(isValidContactInfo('+380 (50) 123-45-67'), true);
      assert.strictEqual(isValidContactInfo('0501234567'), true);
      assert.strictEqual(isValidContactInfo('+12025550123'), true);
      assert.strictEqual(isValidContactInfo('+123 (456) 789-012345'), true);
      assert.strictEqual(isValidContactInfo('123'), false);
      assert.strictEqual(isValidContactInfo('+123456789012345678'), false);
      assert.strictEqual(isValidContactInfo('+123 (456) 789-0123456'), false);
    });

    test('rejects empty or invalid formats', () => {
      assert.strictEqual(isValidContactInfo(''), false);
      assert.strictEqual(isValidContactInfo('   '), false);
      assert.strictEqual(isValidContactInfo(null), false);
      assert.strictEqual(isValidContactInfo(undefined), false);
      assert.strictEqual(isValidContactInfo('random text'), false);
      assert.strictEqual(isValidContactInfo('email@example.com'), false);
    });
  });
});
