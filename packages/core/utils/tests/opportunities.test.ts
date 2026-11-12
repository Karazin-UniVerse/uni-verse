import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import {
  hasOpportunityContentChanged,
  isRecruitmentPhase,
  normalizeOpportunityContent,
  isWithdrawableApplicationStatus,
  hasReachedApplicationWithdrawalLimit,
} from '../opportunities.ts';

describe('opportunities utils', () => {
  test('only submitted and under-review applications have a withdrawable status', () => {
    for (const status of [
      'SUBMITTED',
      'UNDER_REVIEW',
      'ACCEPTED',
      'REJECTED',
      'WITHDRAWN',
    ] as const) {
      assert.equal(
        isWithdrawableApplicationStatus(status),
        status === 'SUBMITTED' || status === 'UNDER_REVIEW',
      );
    }
  });

  test('withdrawal limit includes the boundary and preserves missing counts as zero', () => {
    assert.equal(hasReachedApplicationWithdrawalLimit(undefined), false);
    assert.equal(hasReachedApplicationWithdrawalLimit(0), false);
    assert.equal(hasReachedApplicationWithdrawalLimit(2), false);
    assert.equal(hasReachedApplicationWithdrawalLimit(3), true);
    assert.equal(hasReachedApplicationWithdrawalLimit(4), true);
  });
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

    test('ignores tag changes because tags are not moderated', () => {
      assert.strictEqual(hasOpportunityContentChanged(baseOpportunity, { tags: ['IT'] }), false);
    });
  });
});
