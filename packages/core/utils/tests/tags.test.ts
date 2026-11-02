import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { OPPORTUNITY_STATUS } from '../../constants/opportunities.ts';
import { getOpportunityTagNames, normalizeTag, normalizeTags } from '../tags.ts';

describe('tags utils', () => {
  describe('normalizeTag', () => {
    test('should trim, collapse whitespace, and convert to lowercase', () => {
      assert.strictEqual(normalizeTag('  React   Native  '), 'react native');
      assert.strictEqual(normalizeTag('TYPESCRIPT'), 'typescript');
    });
  });

  describe('normalizeTags', () => {
    test('should normalize strings, filter non-strings, remove empties, and deduplicate', () => {
      const input = [' React ', null, 42, 'react', '  NODEJS ', ''];
      const result = normalizeTags(input);

      assert.deepStrictEqual(result, ['react', 'nodejs']);
    });
  });

  describe('getOpportunityTagNames', () => {
    test('should return published tag names for published opportunity', () => {
      const opp = {
        status: OPPORTUNITY_STATUS.PUBLISHED,
        tags: [
          { id: '1', name: 'react' },
          { id: '2', name: 'typescript' },
        ],
        proposedTags: ['ignored'],
      };

      assert.deepStrictEqual(getOpportunityTagNames(opp), ['react', 'typescript']);
    });

    test('should return proposedTags for non-published opportunity', () => {
      const opp = {
        status: OPPORTUNITY_STATUS.DRAFT,
        tags: [{ id: '1', name: 'old' }],
        proposedTags: ['new-tag', 'another-tag'],
      };

      assert.deepStrictEqual(getOpportunityTagNames(opp), ['new-tag', 'another-tag']);
    });

    test('should return proposed tags for opportunities awaiting moderation', () => {
      assert.deepStrictEqual(
        getOpportunityTagNames({
          status: OPPORTUNITY_STATUS.READY_FOR_REVIEW,
          tags: [{ id: 'old', name: 'old' }],
          proposedTags: ['react'],
        }),
        ['react'],
      );
    });

    test('should return empty array if tags or proposedTags are missing', () => {
      assert.deepStrictEqual(getOpportunityTagNames({ status: OPPORTUNITY_STATUS.PUBLISHED }), []);
      assert.deepStrictEqual(getOpportunityTagNames({ status: OPPORTUNITY_STATUS.DRAFT }), []);
    });
  });
});
