import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Assignment } from '@core/types/moodle';
import {
  getAssignmentsNeedingStatus,
  toLocalStatuses,
  useAssignmentStatuses,
} from './useAssignmentStatuses';

function buildAssignment(id: number, submissionStatus?: string): Assignment {
  return {
    id,
    name: `Assignment ${id}`,
    courseName: 'Math',
    description: 'Description',
    duedate: 1700000000,
    submissionStatus,
  };
}

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }): React.ReactElement =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('getAssignmentsNeedingStatus', () => {
  it('returns the ids of assignments without a submission status, once each', () => {
    const ids = getAssignmentsNeedingStatus([
      buildAssignment(1),
      buildAssignment(2, 'submitted'),
      buildAssignment(3),
      buildAssignment(1),
    ]);

    expect(ids).toEqual([1, 3]);
  });

  it('returns an empty list when every assignment already has a status', () => {
    expect(getAssignmentsNeedingStatus([buildAssignment(2, 'graded')])).toEqual([]);
  });
});

describe('toLocalStatuses', () => {
  it('keeps only the assignments whose status was loaded', () => {
    const statuses = toLocalStatuses(
      [1, 2],
      [{ data: { status: 'submitted', grade: '95' } }, { data: undefined }],
    );

    expect(statuses).toEqual({ 1: { status: 'submitted', grade: '95' } });
  });
});

describe('useAssignmentStatuses hook', () => {
  it('returns an empty record before any status has loaded', () => {
    const { result } = renderHook(() => useAssignmentStatuses([buildAssignment(101)]), {
      wrapper: createWrapper(),
    });

    expect(result.current).toEqual({});
  });

  it('returns an empty record when every assignment already has a status', () => {
    const assignments: Assignment[] = [buildAssignment(101, 'submitted')];

    const { result } = renderHook(() => useAssignmentStatuses(assignments), {
      wrapper: createWrapper(),
    });

    expect(result.current).toEqual({});
  });

  it('should return empty record when given empty assignments', () => {
    const { result } = renderHook(() => useAssignmentStatuses([]), {
      wrapper: createWrapper(),
    });

    expect(result.current).toEqual({});
  });
});
