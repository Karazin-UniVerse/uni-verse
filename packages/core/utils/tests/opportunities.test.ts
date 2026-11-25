import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import {
  hasOpportunityContentChanged,
  isRecruitmentPhase,
  normalizeOpportunityContent,
  isWithdrawableApplicationStatus,
  hasReachedApplicationReapplyLimit,
  canChangeApplicationStatus,
  isReapplicableApplicationStatus,
  isOwnerTrackedWithdrawalStatus,
} from '../opportunities.ts';

describe('opportunities utils', () => {
  const ALL_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'] as const;

  test('submitted, under-review and accepted applications are withdrawable', () => {
    for (const status of ALL_STATUSES) {
      assert.equal(
        isWithdrawableApplicationStatus(status),
        status === 'SUBMITTED' || status === 'UNDER_REVIEW' || status === 'ACCEPTED',
      );
    }
  });

  test('withdrawn and rejected applications are reapplicable', () => {
    for (const status of ALL_STATUSES) {
      assert.equal(
        isReapplicableApplicationStatus(status),
        status === 'WITHDRAWN' || status === 'REJECTED',
      );
    }
  });

  test('only under-review and accepted withdrawals are tracked for the owner', () => {
    for (const status of ALL_STATUSES) {
      assert.equal(
        isOwnerTrackedWithdrawalStatus(status),
        status === 'UNDER_REVIEW' || status === 'ACCEPTED',
      );
    }
  });

  test('status transitions follow the agreed table for every pair', () => {
    const allowed: Record<string, string[]> = {
      SUBMITTED: ['UNDER_REVIEW', 'ACCEPTED', 'REJECTED'],
      UNDER_REVIEW: ['ACCEPTED', 'REJECTED'],
      ACCEPTED: [],
      REJECTED: [],
      WITHDRAWN: [],
    };

    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        assert.equal(canChangeApplicationStatus(from, to), allowed[from].includes(to));
      }
    }
  });

  test('reapply limit includes the boundary and preserves missing counts as zero', () => {
    assert.equal(hasReachedApplicationReapplyLimit(undefined), false);
    assert.equal(hasReachedApplicationReapplyLimit(0), false);
    assert.equal(hasReachedApplicationReapplyLimit(2), false);
    assert.equal(hasReachedApplicationReapplyLimit(3), true);
    assert.equal(hasReachedApplicationReapplyLimit(4), true);
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
