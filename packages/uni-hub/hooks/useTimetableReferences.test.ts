import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { timetableApi } from '@uni-hub/services/api.timetable';
import { useTimetableReferences } from './useTimetableReferences';

describe('useTimetableReferences', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads plans and teachers', async () => {
    vi.spyOn(timetableApi, 'listCurriculumPlans').mockResolvedValue({
      data: [
        {
          id: 'plan-1',
          faculty: 'F',
          title: 'CS',
          academicYear: '2026/2027',
          semester: 1,
          isDraft: false,
        },
      ],
    });
    vi.spyOn(timetableApi, 'listTeachers').mockResolvedValue({
      data: [{ id: 't-1', name: 'Prof' }],
    });

    const { result } = renderHook(() => useTimetableReferences());

    await waitFor(() => expect(result.current.plans).toHaveLength(1));
    expect(result.current.teachers).toEqual([{ id: 't-1', name: 'Prof' }]);
  });

  it('keeps the other list when one request fails', async () => {
    vi.spyOn(timetableApi, 'listCurriculumPlans').mockRejectedValue(new Error('403'));
    vi.spyOn(timetableApi, 'listTeachers').mockResolvedValue({
      data: [{ id: 't-1', name: 'Prof' }],
    });

    const { result } = renderHook(() => useTimetableReferences());

    await waitFor(() => expect(result.current.teachers).toHaveLength(1));
    expect(result.current.plans).toEqual([]);
  });
  it('puts a newly created plan first without refetching', async () => {
    const listPlans = vi.spyOn(timetableApi, 'listCurriculumPlans').mockResolvedValue({ data: [] });

    vi.spyOn(timetableApi, 'listTeachers').mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useTimetableReferences());

    await waitFor(() => expect(listPlans).toHaveBeenCalledTimes(1));
    await act(async () => {});
    act(() => {
      result.current.addPlan({
        id: 'plan-new',
        faculty: 'CS',
        title: 'New',
        academicYear: '2026/2027',
        semester: 2,
        isDraft: true,
      });
    });

    expect(result.current.plans.map((plan) => plan.id)).toEqual(['plan-new']);
    expect(listPlans).toHaveBeenCalledTimes(1);
  });
});
