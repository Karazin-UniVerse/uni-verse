import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { TeachingAssignmentResponse } from '@core/types/timetable';
import { timetableApi } from '@uni-hub/services/api.timetable';
import { createAppProvidersWrapper } from '@uni-hub/utils/test-utils';
import { useWorkloadEditor } from './useWorkloadEditor';
import type { WorkloadRow } from './workload';

const firstRow: WorkloadRow = {
  id: 'assignment-1',
  disciplineTitle: 'Algorithms',
  teachingType: 'LECTURE',
  academicHours: 32,
  groupId: 'group-1',
  isSaturdayOnly: false,
  hasLateSlotAuthorization: false,
};

const secondRow: WorkloadRow = {
  ...firstRow,
  id: 'assignment-2',
  disciplineTitle: 'Databases',
};

const savedAssignment: TeachingAssignmentResponse = {
  id: 'assignment-created',
  curriculumPlanId: 'plan-1',
  disciplineTitle: 'Algorithms',
  teachingType: 'LECTURE',
  academicHours: 48,
  teacherId: null,
  groupId: 'group-1',
  subgroupId: null,
  streamId: null,
  meetingUrl: null,
  isSaturdayOnly: false,
  hasLateSlotAuthorization: false,
};

describe('useWorkloadEditor', () => {
  beforeEach(() => {
    vi.spyOn(timetableApi, 'listAcademicGroups').mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should replace demo rows with an empty workload when the plan has no assignments', async () => {
    vi.spyOn(timetableApi, 'listTeachingAssignments').mockResolvedValue({ data: [] });

    const { result } = renderHook(
      () => useWorkloadEditor({ planId: 'plan-1', streams: [], onError: vi.fn() }),
      { wrapper: createAppProvidersWrapper() },
    );

    await waitFor(() => expect(result.current.workload).toEqual([]));

    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(result.current.isLoadFailed).toBe(false);
  });

  it('should preserve a newly created assignment ID after a later row fails to save', async () => {
    const createAssignment = vi
      .spyOn(timetableApi, 'createTeachingAssignment')
      .mockResolvedValue({ data: savedAssignment });
    const updateAssignment = vi
      .spyOn(timetableApi, 'updateTeachingAssignment')
      .mockRejectedValueOnce(new Error('Update unavailable'))
      .mockResolvedValue({ data: { ...savedAssignment, id: 'assignment-2' } });
    const onError = vi.fn();
    const { result } = renderHook(
      () =>
        useWorkloadEditor({
          planId: 'plan-1',
          streams: [],
          onError,
          initialWorkload: [{ ...firstRow, id: 'row-new' }, secondRow],
        }),
      { wrapper: createAppProvidersWrapper() },
    );

    act(() => {
      result.current.updateRow('row-new', 'academicHours', 48);
      result.current.updateRow('assignment-2', 'academicHours', 64);
    });

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.workload[0]).toMatchObject({
      id: 'assignment-created',
      academicHours: 48,
    });
    expect(result.current.hasUnsavedChanges).toBe(true);
    expect(result.current.isSaving).toBe(false);
    expect(onError).toHaveBeenLastCalledWith(expect.stringContaining('Update unavailable'));

    await act(async () => {
      await result.current.save();
    });

    expect(createAssignment).toHaveBeenCalledTimes(1);
    expect(updateAssignment).toHaveBeenCalledTimes(2);
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('should clear a previous load failure after switching plans and successfully returning', async () => {
    vi.spyOn(timetableApi, 'listTeachingAssignments')
      .mockRejectedValueOnce(new Error('Plan unavailable'))
      .mockResolvedValueOnce({
        data: [{ ...savedAssignment, id: 'assignment-other', curriculumPlanId: 'plan-2' }],
      })
      .mockResolvedValueOnce({ data: [savedAssignment] });

    const { result, rerender } = renderHook(
      ({ planId }) => useWorkloadEditor({ planId, streams: [], onError: vi.fn() }),
      { initialProps: { planId: 'plan-1' }, wrapper: createAppProvidersWrapper() },
    );

    await waitFor(() => expect(result.current.isLoadFailed).toBe(true));

    rerender({ planId: 'plan-2' });

    await waitFor(() =>
      expect(result.current.workload).toEqual([
        expect.objectContaining({ id: 'assignment-other' }),
      ]),
    );

    expect(result.current.isLoadFailed).toBe(false);

    rerender({ planId: 'plan-1' });

    await waitFor(() =>
      expect(result.current.workload).toEqual([
        expect.objectContaining({ id: 'assignment-created' }),
      ]),
    );

    expect(result.current.isLoadFailed).toBe(false);
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('should retry only the failed update after an earlier row was saved successfully', async () => {
    const updateAssignment = vi
      .spyOn(timetableApi, 'updateTeachingAssignment')
      .mockResolvedValueOnce({ data: { ...savedAssignment, id: 'assignment-1' } })
      .mockRejectedValueOnce(new Error('Update unavailable'))
      .mockResolvedValue({ data: { ...savedAssignment, id: 'assignment-2' } });
    const { result } = renderHook(
      () =>
        useWorkloadEditor({
          planId: 'plan-1',
          streams: [],
          onError: vi.fn(),
          initialWorkload: [firstRow, secondRow],
        }),
      { wrapper: createAppProvidersWrapper() },
    );

    act(() => {
      result.current.updateRow('assignment-1', 'academicHours', 48);
      result.current.updateRow('assignment-2', 'academicHours', 64);
    });

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.hasUnsavedChanges).toBe(true);

    await act(async () => {
      await result.current.save();
    });

    expect(updateAssignment.mock.calls.map(([id]) => id)).toEqual([
      'assignment-1',
      'assignment-2',
      'assignment-2',
    ]);
    expect(updateAssignment).toHaveBeenLastCalledWith(
      'assignment-2',
      expect.objectContaining({ academicHours: 64, curriculumPlanId: 'plan-1' }),
    );
    expect(result.current.hasUnsavedChanges).toBe(false);
  });
});
