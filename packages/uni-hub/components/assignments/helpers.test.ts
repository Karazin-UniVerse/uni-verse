import { describe, expect, it } from 'vitest';
import type { CourseSection } from '@core/types/moodle';
import { canSubmitAssignment, extractUploadedItemId, findAssignmentModule } from './helpers';

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

describe('findAssignmentModule', () => {
  const sections: CourseSection[] = [
    {
      id: 1,
      name: 'Week 1',
      summary: '',
      modules: [
        { id: 10, name: 'Lecture', modname: 'resource', instance: 7 },
        { id: 11, name: 'Lab 1', modname: 'assign', instance: 7 },
      ],
    },
  ];

  it('finds the assign module with the given instance id', () => {
    expect(findAssignmentModule([undefined, sections], 7)?.name).toBe('Lab 1');
  });

  it('returns undefined when no assign module has that instance', () => {
    expect(findAssignmentModule([sections], 8)).toBeUndefined();
    expect(findAssignmentModule([], 7)).toBeUndefined();
  });
});
