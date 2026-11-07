import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { normalizeTag, normalizeTags } from '../tags.ts';

describe('tags utils', () => {
  test('should trim, collapse whitespace, and convert to lowercase', () => {
    assert.strictEqual(normalizeTag('  React   Native  '), 'react native');
    assert.strictEqual(normalizeTag('TYPESCRIPT'), 'typescript');
  });

  test('should normalize strings, filter non-strings, remove empties, and deduplicate', () => {
    const input = [' React ', null, 42, 'react', '  NODEJS ', ''];

    assert.deepStrictEqual(normalizeTags(input), ['react', 'nodejs']);
  });
});
