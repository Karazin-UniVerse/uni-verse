import { describe, expect, it } from 'vitest';
import { canSubmitAssignment, extractUploadedItemId } from './assignment-submission.helpers';

describe('extractUploadedItemId', () => {
  it('returns the item id of the first uploaded file', () => {
    expect(extractUploadedItemId([{ itemid: 12 }, { itemid: 13 }])).toBe(12);
  });

  it('returns undefined when nothing was uploaded', () => {
    expect(extractUploadedItemId(undefined)).toBeUndefined();
    expect(extractUploadedItemId([])).toBeUndefined();
  });

  it('returns undefined when the response is not a list', () => {
    expect(extractUploadedItemId({ itemid: 5 } as never)).toBeUndefined();
  });
});

describe('canSubmitAssignment', () => {
  it('allows a submission when the status is unknown, new or a draft', () => {
    expect(canSubmitAssignment(undefined)).toBe(true);
    expect(canSubmitAssignment({ status: 'new' })).toBe(true);
    expect(canSubmitAssignment({ status: 'draft' })).toBe(true);
  });

  it('blocks a new submission once the work is submitted or graded', () => {
    expect(canSubmitAssignment({ status: 'submitted' })).toBe(false);
    expect(canSubmitAssignment({ status: 'graded' })).toBe(false);
  });
});
