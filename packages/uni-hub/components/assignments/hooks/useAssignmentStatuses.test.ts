import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { Assignment } from '@uni-hub/types';
import { useAssignmentStatuses } from './useAssignmentStatuses';

describe('useAssignmentStatuses hook', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return empty record initially', () => {
    const assignments: Assignment[] = [
      {
        id: 101,
        name: 'Math Homework',
        courseName: 'Math',
        description: 'Description',
        duedate: 1700000000,
        submissionStatus: 'submitted',
      },
    ];

    const { result } = renderHook(() => useAssignmentStatuses(assignments));

    expect(result.current).toEqual({});
  });

  it('should return empty record when given empty assignments', () => {
    const { result } = renderHook(() => useAssignmentStatuses([]));

    expect(result.current).toEqual({});
  });
});
