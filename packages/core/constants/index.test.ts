import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { RESPONSE_CODES } from './index.ts';

describe('RESPONSE_CODES constants', () => {
  test('validates RESPONSE_CODES values', () => {
    assert.strictEqual(RESPONSE_CODES.OK, 200);
    assert.strictEqual(RESPONSE_CODES.CREATED, 201);
    assert.strictEqual(RESPONSE_CODES.NO_CONTENT, 204);
    assert.strictEqual(RESPONSE_CODES.BAD_REQUEST, 400);
    assert.strictEqual(RESPONSE_CODES.UNAUTHORIZED, 401);
    assert.strictEqual(RESPONSE_CODES.FORBIDDEN, 403);
    assert.strictEqual(RESPONSE_CODES.NOT_FOUND, 404);
    assert.strictEqual(RESPONSE_CODES.INTERNAL_SERVER_ERROR, 500);
  });
});
