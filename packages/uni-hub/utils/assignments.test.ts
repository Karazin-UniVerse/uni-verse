import { describe, it, expect } from 'vitest';
import { isAssignmentCompleted } from './assignments';

describe('isAssignmentCompleted', () => {
  it('returns true when submissionStatus is submitted', () => {
    expect(isAssignmentCompleted({ submissionStatus: 'submitted' } as any)).toBe(true);
  });

  it('returns true when submissionStatus is graded', () => {
    expect(isAssignmentCompleted({ submissionStatus: 'graded' } as any)).toBe(true);
  });

  it('returns true when graded flag is set', () => {
    expect(isAssignmentCompleted({ graded: true } as any)).toBe(true);
  });

  it('returns true when grade exists and is truthy', () => {
    expect(isAssignmentCompleted({ grade: '100' } as any)).toBe(true);
  });

  it('returns true when submittedAt timestamp exists', () => {
    expect(isAssignmentCompleted({ submittedAt: 1729000000 } as any)).toBe(true);
  });

  it('returns false when assignment is not submitted or graded', () => {
    expect(isAssignmentCompleted({ submissionStatus: 'new', graded: false } as any)).toBe(false);
  });
});
