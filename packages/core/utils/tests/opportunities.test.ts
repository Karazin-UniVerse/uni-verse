import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import {
  hasOpportunityContentChanged,
  isRecruitmentPhase,
  normalizeOpportunityContent,
} from '../opportunities.ts';

describe('opportunities utils', () => {
  describe('isRecruitmentPhase', () => {
    test('allows recruitment only in START, ACTIVE, or default undefined phase', () => {
      assert.strictEqual(isRecruitmentPhase(undefined), true);
      assert.strictEqual(isRecruitmentPhase('START'), true);
      assert.strictEqual(isRecruitmentPhase('ACTIVE'), true);
      assert.strictEqual(isRecruitmentPhase('PAUSED'), false);
      assert.strictEqual(isRecruitmentPhase('COMPLETED'), false);
      assert.strictEqual(isRecruitmentPhase('CANCELLED'), false);
    });
  });

  describe('normalizeOpportunityContent & hasOpportunityContentChanged', () => {
    const baseOpportunity = {
      title: '  Research Assistant ',
      description: ' Help with ML experiments ',
      ownerContactInfo: ' @ml_lab ',
      paymentType: 'PAID' as const,
      paymentDetails: ' 5000 UAH ',
    };

    test('normalizes whitespace and clears paymentDetails when UNPAID', () => {
      assert.deepStrictEqual(normalizeOpportunityContent(baseOpportunity), [
        'Research Assistant',
        'Help with ML experiments',
        '@ml_lab',
        'PAID',
        '5000 UAH',
      ]);

      assert.deepStrictEqual(
        normalizeOpportunityContent({
          ...baseOpportunity,
          paymentType: 'UNPAID',
        }),
        ['Research Assistant', 'Help with ML experiments', '@ml_lab', 'UNPAID', null],
      );
    });

    test('returns false when content fields are identical after trimming or omitted', () => {
      assert.strictEqual(hasOpportunityContentChanged(baseOpportunity, {}), false);
      assert.strictEqual(
        hasOpportunityContentChanged(baseOpportunity, {
          title: 'Research Assistant',
          description: 'Help with ML experiments',
          ownerContactInfo: '@ml_lab',
          paymentType: 'PAID',
          paymentDetails: '5000 UAH',
        }),
        false,
      );
    });

    test('returns true when any moderated content field changes', () => {
      assert.strictEqual(
        hasOpportunityContentChanged(baseOpportunity, { title: 'Updated Title' }),
        true,
      );
      assert.strictEqual(
        hasOpportunityContentChanged(baseOpportunity, { description: 'Updated Desc' }),
        true,
      );
      assert.strictEqual(
        hasOpportunityContentChanged(baseOpportunity, { ownerContactInfo: '@new_contact' }),
        true,
      );
      assert.strictEqual(
        hasOpportunityContentChanged(baseOpportunity, { paymentType: 'UNPAID' }),
        true,
      );
      assert.strictEqual(
        hasOpportunityContentChanged(baseOpportunity, { paymentDetails: '6000 UAH' }),
        true,
      );
    });

    test('detects changed published tags without remoderating identical normalized tags', () => {
      const published = {
        ...baseOpportunity,
        status: 'PUBLISHED' as const,
        tags: [
          { id: 'react', name: 'react' },
          { id: 'typescript', name: 'typescript' },
        ],
        proposedTags: ['outdated'],
      };

      assert.strictEqual(hasOpportunityContentChanged(published, { tags: ['nodejs'] }), true);
      assert.strictEqual(hasOpportunityContentChanged(published, { tags: [] }), true);
      assert.strictEqual(
        hasOpportunityContentChanged(published, { tags: [' TypeScript ', 'REACT', 'react'] }),
        false,
      );
      assert.strictEqual(hasOpportunityContentChanged(published, {}), false);
    });

    test('compares proposed tags for unpublished opportunities', () => {
      const draft = {
        ...baseOpportunity,
        status: 'DRAFT' as const,
        tags: [{ id: 'old', name: 'old' }],
        proposedTags: ['react'],
      };

      assert.strictEqual(hasOpportunityContentChanged(draft, { tags: ['nodejs'] }), true);
      assert.strictEqual(hasOpportunityContentChanged(draft, { tags: [' REACT '] }), false);
    });
  });
});
