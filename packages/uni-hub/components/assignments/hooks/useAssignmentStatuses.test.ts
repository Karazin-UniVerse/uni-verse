import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { Assignment } from '@core/types/moodle';
import { moodleApi } from '@uni-hub/services/api.moodle';
import { createQueryClientWrapper } from '@uni-hub/utils/test-utils';
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
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns an empty record before any status has loaded', () => {
    vi.spyOn(moodleApi, 'getAssignmentStatus').mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useAssignmentStatuses([buildAssignment(101)]), {
      wrapper: createQueryClientWrapper(),
    });

    expect(result.current).toEqual({});
  });

  it('loads and returns the statuses for assignments needing them', async () => {
    vi.spyOn(moodleApi, 'getAssignmentStatus').mockResolvedValue({
      data: { status: 'submitted', grade: '95' },
    });

    const { result } = renderHook(() => useAssignmentStatuses([buildAssignment(101)]), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toEqual({
        101: { status: 'submitted', grade: '95' },
      });
    });
  });

  it('tolerates an API rejection and leaves the assignment absent from the map', async () => {
    const spy = vi.spyOn(moodleApi, 'getAssignmentStatus').mockRejectedValue(new Error('500'));

    const { result } = renderHook(() => useAssignmentStatuses([buildAssignment(101)]), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(result.current).toEqual({});
    });
  });
});
