import { useCallback, useMemo, useState } from 'react';
import type { GenerateTimetableDraftResult } from '@core/types/timetable';
import { checkTimetableConflicts } from '@core/utils/timetable';
import { useLanguage, type FormatMessage } from '@uni-hub/i18n/LanguageContext';
import { timetableApi } from '@uni-hub/services/api.timetable';
import { getEventWeekday, PREVIEW_DAYS } from './helpers';
import type { PreviewEvent } from './SchedulePreview.types';

type DiagnosticsWithDuration = GenerateTimetableDraftResult['diagnostics'] & {
  durationMs?: number;
};

type DraftResultWithSummaries = GenerateTimetableDraftResult & {
  candidateSummaries?: Array<{
    eventCount?: number;
  }>;
};

type UseTimetableDraftParams = {
  planId: string;
  canGenerate: boolean;
  compactSaturdays: boolean;
  saveWorkload: () => Promise<void>;
  onError: (message: string | null) => void;
};

/** Solver failures the dean can act on get their own explanation; the rest keep the server text. */
const describeGenerationError = (failure: unknown, formatMessage: FormatMessage): string => {
  const message = failure instanceof Error ? failure.message : '';

  if (message.includes('TIMEOUT')) {
    return formatMessage('timetable.generateTimeout');
  }

  if (message.includes('INVALID_INPUT')) {
    return formatMessage('timetable.generateInvalidInput');
  }

  if (message.includes('NO_FEASIBLE_SOLUTION')) {
    return formatMessage('timetable.generateNoSolution');
  }

  return message
    ? `${formatMessage('timetable.generateError')} (${message})`
    : formatMessage('timetable.generateError');
};

/** Generating, choosing, adjusting and publishing the draft timetables of one plan. */
export function useTimetableDraft({
  planId,
  canGenerate,
  compactSaturdays,
  saveWorkload,
  onError,
}: UseTimetableDraftParams) {
  const { formatMessage, localeTag } = useLanguage();
  const [draftResult, setDraftResult] = useState<GenerateTimetableDraftResult | null>(null);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedVersionId, setPublishedVersionId] = useState<string | null>(null);
  const [adjustingEvent, setAdjustingEvent] = useState<PreviewEvent | null>(null);
  const [targetWeekday, setTargetWeekday] = useState('1');
  const [targetPair, setTargetPair] = useState('1');
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null);
  const [isAdjusting, setIsAdjusting] = useState(false);

  const selectedCandidate = draftResult?.candidates[selectedCandidateIndex];

  const generate = useCallback(async () => {
    if (!canGenerate) {
      onError(formatMessage('timetable.calendarError'));

      return;
    }

    setIsGenerating(true);
    setPublishedVersionId(null);
    onError(null);

    try {
      await saveWorkload();

      const response = await timetableApi.generateTimetableDraft(planId, {
        maxCandidates: 3,
        timeoutMs: 5000,
        compactSaturdays,
      });

      setDraftResult(response.data);
      setSelectedCandidateIndex(0);
    } catch (failure) {
      setDraftResult(null);
      onError(describeGenerationError(failure, formatMessage));
    } finally {
      setIsGenerating(false);
    }
  }, [canGenerate, compactSaturdays, formatMessage, onError, planId, saveWorkload]);

  const publish = useCallback(async () => {
    if (!draftResult) {
      return;
    }

    setIsPublishing(true);
    onError(null);

    const targetVersionId =
      draftResult.candidates[selectedCandidateIndex]?.versionId || draftResult.versionId;

    try {
      await timetableApi.publishTimetableVersion(targetVersionId);
      setPublishedVersionId(targetVersionId);
    } catch {
      setPublishedVersionId(null);
      onError(formatMessage('timetable.publishError'));
    } finally {
      setIsPublishing(false);
    }
  }, [draftResult, formatMessage, onError, selectedCandidateIndex]);

  const weekdayOptions = PREVIEW_DAYS.map((day) => ({
    value: String(day),
    label: new Intl.DateTimeFormat(localeTag, { weekday: 'long' }).format(new Date(2024, 0, day)),
  }));

  const adjustmentConflict = useMemo(() => {
    if (!adjustingEvent || !selectedCandidate) {
      return false;
    }

    const projected = selectedCandidate.events.map((event) => {
      if (
        event.teachingAssignmentId !== adjustingEvent.teachingAssignmentId ||
        getEventWeekday(event) !== getEventWeekday(adjustingEvent) ||
        event.pair !== adjustingEvent.pair
      ) {
        return event;
      }

      const date = new Date(event.date);

      date.setUTCDate(date.getUTCDate() + Number(targetWeekday) - getEventWeekday(adjustingEvent)!);

      return { ...event, date: date.toISOString().slice(0, 10), pair: Number(targetPair) };
    });

    return !checkTimetableConflicts({ events: projected }).isValid;
  }, [adjustingEvent, selectedCandidate, targetWeekday, targetPair]);

  const startAdjust = useCallback((event: PreviewEvent, weekday: number): void => {
    setAdjustingEvent(event);
    setTargetWeekday(String(weekday));
    setTargetPair(String(event.pair));
    setAdjustmentError(null);
  }, []);

  const adjustSlot = async (): Promise<void> => {
    if (!draftResult || !adjustingEvent || adjustmentConflict) {
      return;
    }

    const candidateIndex = selectedCandidateIndex;
    const versionId = selectedCandidate?.versionId ?? draftResult.versionId;

    setIsAdjusting(true);
    setAdjustmentError(null);

    try {
      const response = await timetableApi.adjustDraftSlot(versionId, {
        teachingAssignmentId: adjustingEvent.teachingAssignmentId,
        fromWeekday: getEventWeekday(adjustingEvent)!,
        fromPair: adjustingEvent.pair,
        toWeekday: Number(targetWeekday),
        toPair: Number(targetPair),
      });

      setDraftResult(
        (previous) =>
          previous && {
            ...previous,
            candidates: previous.candidates.map((candidate, index) =>
              index === candidateIndex && (candidate.versionId ?? previous.versionId) === versionId
                ? {
                    ...candidate,
                    events: response.data.events,
                    penaltyScore: response.data.penaltyScore,
                  }
                : candidate,
            ),
          },
      );
      setAdjustingEvent(null);
    } catch (failure) {
      setAdjustmentError(
        failure instanceof Error && failure.message.includes('SOURCE_DAY_REGENERATION_REQUIRED')
          ? formatMessage('timetable.sourceDayRegenerationRequired')
          : failure instanceof Error
            ? failure.message
            : formatMessage('timetable.adjustError'),
      );
    } finally {
      setIsAdjusting(false);
    }
  };

  const closeAdjust = useCallback(() => setAdjustingEvent(null), []);

  const reset = useCallback(() => {
    setDraftResult(null);
    setSelectedCandidateIndex(0);
    setPublishedVersionId(null);
    setAdjustingEvent(null);
    setAdjustmentError(null);
  }, []);

  return {
    draftResult,
    selectedCandidateIndex,
    isGenerating,
    isPublishing,
    isPublished:
      publishedVersionId !== null &&
      publishedVersionId === (selectedCandidate?.versionId ?? draftResult?.versionId),
    adjustingEvent,
    targetWeekday,
    targetPair,
    adjustmentError,
    isAdjusting,
    adjustmentConflict,
    weekdayOptions,
    executionTimeMs:
      draftResult?.diagnostics?.timeMs ??
      (draftResult?.diagnostics as DiagnosticsWithDuration | undefined)?.durationMs ??
      0,
    scheduledEventsCount:
      (draftResult as DraftResultWithSummaries | null)?.candidateSummaries?.[selectedCandidateIndex]
        ?.eventCount ??
      selectedCandidate?.events?.length ??
      0,
    generate,
    publish,
    startAdjust,
    adjustSlot,
    closeAdjust,
    selectCandidate: setSelectedCandidateIndex,
    changeTargetWeekday: setTargetWeekday,
    changeTargetPair: setTargetPair,
    reset,
  };
}
