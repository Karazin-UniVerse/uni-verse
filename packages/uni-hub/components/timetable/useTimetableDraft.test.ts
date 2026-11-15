import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AdjustDraftSlotResponse,
  GenerateTimetableDraftResult,
  ScheduledEvent,
  TimetableVersionResponse,
} from '@core/types/timetable';
import { createLanguageWrapper } from '@uni-hub/utils/test-utils';
import { useTimetableDraft } from './useTimetableDraft';

const { adjustDraftSlot, generateTimetableDraft, publishTimetableVersion } = vi.hoisted(() => ({
  adjustDraftSlot: vi.fn(),
  generateTimetableDraft: vi.fn(),
  publishTimetableVersion: vi.fn(),
}));

vi.mock('@uni-hub/services/api.timetable', () => ({
  timetableApi: { adjustDraftSlot, generateTimetableDraft, publishTimetableVersion },
}));

const draft: GenerateTimetableDraftResult = {
  versionId: 'version-1',
  candidates: [
    { versionId: 'version-1', events: [], penaltyScore: 0 },
    { versionId: 'version-2', events: [], penaltyScore: 1 },
  ],
  diagnostics: { statesExplored: 2, timeMs: 10 },
};

describe('useTimetableDraft publication status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateTimetableDraft.mockResolvedValue({ data: draft });
    publishTimetableVersion.mockImplementation(async (versionId: string) => {
      const version: TimetableVersionResponse = {
        id: versionId,
        curriculumPlanId: 'plan-1',
        status: 'PUBLISHED',
        versionNumber: versionId === 'version-1' ? 1 : 2,
        events: [],
      };

      return { data: version };
    });
  });

  it('should keep an unpublished candidate publishable after publishing another candidate', async () => {
    const { result } = renderHook(
      () =>
        useTimetableDraft({
          planId: 'plan-1',
          canGenerate: true,
          compactSaturdays: false,
          saveWorkload: async (): Promise<void> => {},
          onError: vi.fn(),
        }),
      { wrapper: createLanguageWrapper() },
    );

    await act(async () => {
      await result.current.generate();
    });
    await act(async () => {
      await result.current.publish();
    });

    expect(result.current.isPublished).toBe(true);

    act(() => {
      result.current.selectCandidate(1);
    });

    expect(result.current.isPublished).toBe(false);
  });

  it('should clear publication status for an archived candidate when another version replaces it', async () => {
    const { result } = renderHook(
      () =>
        useTimetableDraft({
          planId: 'plan-1',
          canGenerate: true,
          compactSaturdays: false,
          saveWorkload: async (): Promise<void> => {},
          onError: vi.fn(),
        }),
      { wrapper: createLanguageWrapper() },
    );

    await act(async () => {
      await result.current.generate();
    });
    await act(async () => {
      await result.current.publish();
    });
    act(() => {
      result.current.selectCandidate(1);
    });
    await act(async () => {
      await result.current.publish();
    });

    expect(publishTimetableVersion).toHaveBeenLastCalledWith('version-2');
    expect(result.current.isPublished).toBe(true);

    act(() => {
      result.current.selectCandidate(0);
    });

    expect(result.current.isPublished).toBe(false);
  });
});

describe('useTimetableDraft adjustment context', () => {
  const originalEvent: ScheduledEvent = {
    id: 'event-original',
    teachingAssignmentId: 'assignment-original',
    disciplineTitle: 'Algorithms',
    teachingType: 'LECTURE',
    groupIds: ['group-1'],
    date: '2026-09-07',
    pair: 1,
  };
  const originalDraft: GenerateTimetableDraftResult = {
    versionId: 'version-original',
    candidates: [{ versionId: 'version-original', events: [originalEvent], penaltyScore: 0 }],
    diagnostics: { statesExplored: 1, timeMs: 10 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    generateTimetableDraft.mockResolvedValue({ data: originalDraft });
  });

  const renderDraft = (): ReturnType<
    typeof renderHook<ReturnType<typeof useTimetableDraft>, void>
  > =>
    renderHook(
      () =>
        useTimetableDraft({
          planId: 'plan-1',
          canGenerate: true,
          compactSaturdays: false,
          saveWorkload: async (): Promise<void> => {},
          onError: vi.fn(),
        }),
      { wrapper: createLanguageWrapper() },
    );

  it('should close the adjustment dialog when resetting the draft', async () => {
    const { result } = renderDraft();

    await act(async () => {
      await result.current.generate();
    });
    act(() => {
      result.current.startAdjust(originalEvent, 1);
    });

    expect(result.current.adjustingEvent).toEqual(originalEvent);

    act(() => {
      result.current.reset();
    });

    expect(result.current.adjustingEvent).toBeNull();
    expect(result.current.draftResult).toBeNull();
  });

  it('should preserve a fresh draft when an adjustment of the reset version resolves late', async () => {
    let resolveAdjustment!: (response: { data: AdjustDraftSlotResponse }) => void;
    const pendingAdjustment = new Promise<{ data: AdjustDraftSlotResponse }>((resolve) => {
      resolveAdjustment = resolve;
    });
    const freshEvent: ScheduledEvent = {
      ...originalEvent,
      id: 'event-fresh',
      teachingAssignmentId: 'assignment-fresh',
      disciplineTitle: 'Databases',
    };
    const freshDraft: GenerateTimetableDraftResult = {
      versionId: 'version-fresh',
      candidates: [{ versionId: 'version-fresh', events: [freshEvent], penaltyScore: 7 }],
      diagnostics: { statesExplored: 2, timeMs: 20 },
    };
    const { result } = renderDraft();

    adjustDraftSlot.mockReturnValueOnce(pendingAdjustment);

    await act(async () => {
      await result.current.generate();
    });
    act(() => {
      result.current.startAdjust(originalEvent, 1);
      result.current.changeTargetPair('2');
    });

    let adjustment!: Promise<void>;

    act(() => {
      adjustment = result.current.adjustSlot();
    });

    expect(adjustDraftSlot).toHaveBeenCalledWith('version-original', {
      teachingAssignmentId: 'assignment-original',
      fromWeekday: 1,
      fromPair: 1,
      toWeekday: 1,
      toPair: 2,
    });

    act(() => {
      result.current.reset();
    });
    generateTimetableDraft.mockResolvedValueOnce({ data: freshDraft });

    await act(async () => {
      await result.current.generate();
    });
    await act(async () => {
      resolveAdjustment({
        data: {
          id: 'version-original',
          status: 'DRAFT',
          events: [{ ...originalEvent, pair: 2 }],
          penaltyScore: 3,
        },
      });
      await adjustment;
    });

    expect(result.current.draftResult?.versionId).toBe('version-fresh');
    expect(result.current.draftResult?.candidates[0]).toEqual({
      versionId: 'version-fresh',
      events: [freshEvent],
      penaltyScore: 7,
    });
    expect(result.current.isAdjusting).toBe(false);
  });
});
