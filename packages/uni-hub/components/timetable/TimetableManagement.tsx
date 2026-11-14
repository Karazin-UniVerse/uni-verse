import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdjustSlotDialog } from './AdjustSlotDialog';
import { DraftResults } from './DraftResults';
import { WorkloadSummary } from './WorkloadSummary';
import {
  semesterCalendarQueryOptions,
  semesterSlotPreferencesQueryOptions,
} from './semesterQueries';
import { CurriculumPlanDialog } from './CurriculumPlanDialog';
import { AlertCircle, ChevronDown, ChevronRight, Play, Plus, Save, Trash2 } from 'lucide-react';
import { Button, CheckBox, Select, Tag, TextInput } from '@una';
import { checkTimetableConflicts } from '@core/utils/timetable';
import type {
  AcademicGroupResponse,
  CurriculumPlanResponse,
  CreateTeachingAssignmentRequest,
  GenerateTimetableDraftResult,
} from '@core/types/timetable';
import { useTimetableReferences } from '@uni-hub/hooks/useTimetableReferences';
import { useLanguage, type FormatMessage } from '@uni-hub/i18n/LanguageContext';
import { timetableApi } from '@uni-hub/services/api.timetable';
import { getEventWeekday, PREVIEW_DAYS } from './helpers';
import type { PreviewEvent } from './SchedulePreview.types';
import styles from './TimetableManagement.module.scss';

type DiagnosticsWithDuration = GenerateTimetableDraftResult['diagnostics'] & {
  durationMs?: number;
};

type DraftResultWithSummaries = GenerateTimetableDraftResult & {
  candidateSummaries?: Array<{
    eventCount?: number;
  }>;
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

  return message
    ? `${formatMessage('timetable.generateError')} (${message})`
    : formatMessage('timetable.generateError');
};

export interface WorkloadRow {
  id: string;
  disciplineTitle: string;
  teachingType: 'LECTURE' | 'PRACTICE' | 'SEMINAR' | 'LAB';
  academicHours: number;
  isSaturdayOnly: boolean;
  hasLateSlotAuthorization: boolean;
  teacherId?: string;
  groupId?: string;
  subgroupId?: string;
  streamId?: string;
}

const DEFAULT_GROUPS: AcademicGroupResponse[] = [
  {
    id: 'group-1',
    code: 'КС11',
    subgroups: [
      { id: 'subgroup-1', name: 'Підгрупа 1', academicGroupId: 'group-1' },
      { id: 'subgroup-2', name: 'Підгрупа 2', academicGroupId: 'group-1' },
    ],
  },
  {
    id: 'group-2',
    code: 'КС12',
    subgroups: [
      { id: 'subgroup-3', name: 'Підгрупа 1', academicGroupId: 'group-2' },
      { id: 'subgroup-4', name: 'Підгрупа 2', academicGroupId: 'group-2' },
    ],
  },
];

const toUiTeachingType = (type: string): WorkloadRow['teachingType'] => {
  switch (type) {
    case 'PRACTICAL':
    case 'PRACTICE':
      return 'PRACTICE';
    case 'LABORATORY':
    case 'LAB':
      return 'LAB';
    case 'SEMINAR':
      return 'SEMINAR';
    default:
      return 'LECTURE';
  }
};

const toApiTeachingType = (
  type: WorkloadRow['teachingType'],
): CreateTeachingAssignmentRequest['teachingType'] => {
  switch (type) {
    case 'PRACTICE':
      return 'PRACTICAL';
    case 'LAB':
      return 'LABORATORY';
    case 'SEMINAR':
      return 'SEMINAR';
    default:
      return 'LECTURE';
  }
};

const createDefaultWorkload = (formatMessage: FormatMessage): WorkloadRow[] => [
  {
    id: 'row-1',
    disciplineTitle: formatMessage('timetable.defaultDiscipline1'),
    teachingType: 'LECTURE',
    academicHours: 32,
    teacherId: 'teacher-1',
    groupId: 'group-1',
    subgroupId: undefined,
    streamId: undefined,
    isSaturdayOnly: false,
    hasLateSlotAuthorization: false,
  },
  {
    id: 'row-2',
    disciplineTitle: formatMessage('timetable.defaultDiscipline2'),
    teachingType: 'PRACTICE',
    academicHours: 32,
    teacherId: 'teacher-2',
    groupId: 'group-1',
    subgroupId: undefined,
    streamId: undefined,
    isSaturdayOnly: false,
    hasLateSlotAuthorization: false,
  },
  {
    id: 'row-3',
    disciplineTitle: formatMessage('timetable.defaultDiscipline3'),
    teachingType: 'LAB',
    academicHours: 32,
    teacherId: 'teacher-3',
    groupId: 'group-1',
    subgroupId: 'subgroup-1',
    streamId: undefined,
    isSaturdayOnly: false,
    hasLateSlotAuthorization: true,
  },
];

export interface TimetableManagementProps {
  initialPlanId?: string;
  initialWorkload?: WorkloadRow[];
}

export const TimetableManagement: React.FC<TimetableManagementProps> = ({
  initialWorkload,
  initialPlanId = '',
}) => {
  const { formatMessage, localeTag } = useLanguage();
  const baseId = useId();

  const [chosenPlanId, setPlanId] = useState(initialPlanId);
  const [calendarReady, setCalendarReady] = useState(false);
  const [academicGroups, setAcademicGroups] = useState<AcademicGroupResponse[]>(
    () => DEFAULT_GROUPS,
  );
  const [workload, setWorkload] = useState<WorkloadRow[]>(
    () => initialWorkload ?? createDefaultWorkload(formatMessage),
  );
  const [dirtyRowIds, setDirtyRowIds] = useState<Set<string>>(() => new Set());
  const [deletedRowIds, setDeletedRowIds] = useState<Set<string>>(() => new Set());
  const [isSavingWorkload, setIsSavingWorkload] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [draftResult, setDraftResult] = useState<GenerateTimetableDraftResult | null>(null);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(0);
  const [isPublished, setIsPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adjustingEvent, setAdjustingEvent] = useState<PreviewEvent | null>(null);
  const [targetWeekday, setTargetWeekday] = useState('1');
  const [targetPair, setTargetPair] = useState('1');
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const { plans, teachers, addPlan } = useTimetableReferences();
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const planId = chosenPlanId || plans[0]?.id || '';
  const selectedPlan = plans.find((plan) => plan.id === planId);
  const calendarQuery = useQuery(
    semesterCalendarQueryOptions(selectedPlan?.academicYear ?? '', selectedPlan?.semester ?? 1),
  );
  const slotPreferencesQuery = useQuery(
    semesterSlotPreferencesQueryOptions(calendarQuery.data?.id ?? ''),
  );

  const handleSelectPlan = useCallback((id: string) => {
    setError(null);
    setCalendarReady(false);
    setWorkload([]);
    setDraftResult(null);
    setSelectedCandidateIndex(0);
    setIsPublished(false);
    setPlanId(id);
  }, []);

  const handlePlanCreated = useCallback(
    (plan: CurriculumPlanResponse) => {
      addPlan(plan);
      setIsPlanDialogOpen(false);
      handleSelectPlan(plan.id);
    },
    [addPlan, handleSelectPlan],
  );

  const planOptions = useMemo(() => {
    const options = plans.map((plan) => ({
      value: plan.id,
      label: formatMessage('timetable.planOption', {
        title: plan.title,
        academicYear: plan.academicYear,
        semester: plan.semester,
      }),
    }));

    if (options.length === 0) {
      return [{ value: '', label: formatMessage('timetable.noPlans') }];
    }

    return [{ value: '', label: formatMessage('timetable.selectPlan') }, ...options];
  }, [formatMessage, plans]);

  const teacherOptions = useMemo(() => {
    const options = teachers.map((teacher) => ({
      value: teacher.id,
      label: teacher.name ?? teacher.id,
    }));

    return [
      {
        value: '',
        label: formatMessage(
          options.length === 0 ? 'timetable.noTeachers' : 'timetable.selectTeacher',
        ),
      },
      ...options,
    ];
  }, [formatMessage, teachers]);

  useEffect(() => {
    let isActive = true;

    timetableApi
      .listAcademicGroups()
      .then((response) => {
        if (isActive && Array.isArray(response?.data) && response.data.length > 0) {
          setAcademicGroups(response.data);
        }
      })
      .catch(() => {
        // Keep current/default groups when offline or unmocked
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (initialWorkload || !planId.trim()) {
      return;
    }

    let isActive = true;

    Promise.resolve(timetableApi.listTeachingAssignments(planId))
      .then((response) => {
        if (isActive && Array.isArray(response?.data) && response.data.length > 0) {
          setWorkload(
            response.data.map((assignment) => ({
              id: assignment.id,
              disciplineTitle: assignment.disciplineTitle,
              teachingType: toUiTeachingType(assignment.teachingType),
              academicHours: assignment.academicHours,
              teacherId: assignment.teacherId ?? undefined,
              groupId: assignment.groupId ?? undefined,
              subgroupId: assignment.subgroupId ?? undefined,
              streamId: assignment.streamId ?? undefined,
              isSaturdayOnly: Boolean(assignment.isSaturdayOnly),
              hasLateSlotAuthorization: Boolean(assignment.hasLateSlotAuthorization),
            })),
          );
          setDirtyRowIds(new Set());
        }
      })
      .catch(() => {
        // Keep current/default rows when offline or unmocked
      });

    return () => {
      isActive = false;
    };
  }, [initialWorkload, planId]);

  const teachingTypeOptions = useMemo(
    () => [
      { value: 'LECTURE', label: formatMessage('timetable.typeLecture') },
      { value: 'PRACTICE', label: formatMessage('timetable.typePractical') },
      { value: 'SEMINAR', label: formatMessage('timetable.typeSeminar') },
      { value: 'LAB', label: formatMessage('timetable.typeLaboratory') },
    ],
    [formatMessage],
  );

  const groupOrStreamOptions = useMemo(() => {
    const options: Array<{ value: string; label: string }> = [
      ...academicGroups
        .filter((g) => g.id !== 'stream-1' && g.code !== 'stream-1')
        .map((g) => ({
          value: g.id,
          label: g.code,
        })),
      { value: 'stream-1', label: formatMessage('timetable.stream1') },
      { value: 'custom-stream', label: formatMessage('timetable.specifyStream') },
    ];

    return options;
  }, [academicGroups, formatMessage]);

  const subgroupOptions = useMemo(
    () => [
      { value: '', label: formatMessage('timetable.subgroupAll') },
      { value: '1', label: formatMessage('timetable.subgroup1') },
      { value: '2', label: formatMessage('timetable.subgroup2') },
    ],
    [formatMessage],
  );

  const [collapsedGroups, setCollapsedGroups] = useState<ReadonlySet<string>>(() => new Set());

  const workloadGroups = useMemo(() => {
    const byTitle = new Map<string, WorkloadRow[]>();

    for (const row of workload) {
      const title = row.disciplineTitle.trim();

      byTitle.set(title, [...(byTitle.get(title) ?? []), row]);
    }

    return [...byTitle.entries()].map(([title, rows]) => ({ key: rows[0].id, title, rows }));
  }, [workload]);

  const handleRenameGroup = useCallback((ids: readonly string[], title: string) => {
    setWorkload((prev) =>
      prev.map((row) => (ids.includes(row.id) ? { ...row, disciplineTitle: title } : row)),
    );
    setDirtyRowIds((prev) => new Set([...prev, ...ids]));
  }, []);

  const handleToggleGroup = useCallback((key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);

      if (!next.delete(key)) {
        next.add(key);
      }

      return next;
    });
  }, []);

  const handleAddRow = useCallback(
    (disciplineTitle = '') => {
      const newId = `row-${Date.now()}`;
      const defaultGroup = academicGroups[0]?.id ?? 'group-1';
      const newRow: WorkloadRow = {
        id: newId,
        disciplineTitle,
        teachingType: 'LECTURE',
        academicHours: 32,
        teacherId: undefined,
        groupId: defaultGroup,
        subgroupId: undefined,
        streamId: undefined,
        isSaturdayOnly: false,
        hasLateSlotAuthorization: false,
      };

      setWorkload((prev) => [...prev, newRow]);
      setDirtyRowIds((prev) => new Set(prev).add(newId));
    },
    [academicGroups],
  );

  const handleRemoveRow = useCallback((id: string) => {
    if (!id.startsWith('row-')) {
      setDeletedRowIds((prev) => new Set(prev).add(id));
    }

    setWorkload((prev) => prev.filter((row) => row.id !== id));
    setDirtyRowIds((prev) => {
      const next = new Set(prev);

      next.delete(id);

      return next;
    });
  }, []);

  const handleUpdateRow = useCallback(
    <K extends keyof WorkloadRow>(id: string, key: K, value: WorkloadRow[K]) => {
      setWorkload((prev) => prev.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
      setDirtyRowIds((prev) => new Set(prev).add(id));
    },
    [],
  );

  const handleGroupOrStreamChange = useCallback(
    (rowId: string, val: string) => {
      setWorkload((prev) =>
        prev.map((r) => {
          if (r.id !== rowId) return r;

          if (val === 'custom-stream') {
            return {
              ...r,
              streamId: r.streamId && r.streamId !== 'stream-1' ? r.streamId : 'stream-custom',
              groupId: undefined,
              subgroupId: undefined,
            };
          }

          if (val === 'stream-1') {
            return {
              ...r,
              streamId: 'stream-1',
              groupId: undefined,
              subgroupId: undefined,
            };
          }

          const matchedGroup = academicGroups.find((g) => g.id === val || g.code === val);
          const groupId = matchedGroup?.id ?? val;

          let newSubgroupId = undefined;

          if (r.subgroupId) {
            const isSub2 =
              r.subgroupId === '2' || r.subgroupId.endsWith('-2') || r.subgroupId === 'subgroup-2';

            newSubgroupId = isSub2
              ? (matchedGroup?.subgroups?.[1]?.id ?? 'subgroup-2')
              : (matchedGroup?.subgroups?.[0]?.id ?? 'subgroup-1');
          }

          return {
            ...r,
            groupId,
            streamId: undefined,
            subgroupId: newSubgroupId,
          };
        }),
      );
      setDirtyRowIds((prev) => new Set(prev).add(rowId));
    },
    [academicGroups],
  );

  const handleSubgroupChange = useCallback(
    (rowId: string, val: string) => {
      setWorkload((prev) =>
        prev.map((r) => {
          if (r.id !== rowId) return r;

          if (!val) {
            return { ...r, subgroupId: undefined };
          }

          const currentGroup = academicGroups.find(
            (g) => g.id === r.groupId || g.code === r.groupId,
          );

          const targetSubgroupId =
            val === '2'
              ? (currentGroup?.subgroups?.[1]?.id ?? 'subgroup-2')
              : (currentGroup?.subgroups?.[0]?.id ?? 'subgroup-1');

          return { ...r, subgroupId: targetSubgroupId };
        }),
      );
      setDirtyRowIds((prev) => new Set(prev).add(rowId));
    },
    [academicGroups],
  );

  const getSelectedGroupOrStream = useCallback(
    (row: WorkloadRow) => {
      if (row.streamId) {
        if (row.streamId === 'stream-1') {
          return 'stream-1';
        }

        return 'custom-stream';
      }

      if (row.groupId) {
        const found = academicGroups.find((g) => g.id === row.groupId || g.code === row.groupId);

        return found?.id ?? row.groupId;
      }

      return academicGroups[0]?.id ?? '';
    },
    [academicGroups],
  );

  const getSubgroupValue = useCallback(
    (row: WorkloadRow) => {
      if (!row.subgroupId || row.streamId) {
        return '';
      }

      const currentGroup = academicGroups.find(
        (g) => g.id === row.groupId || g.code === row.groupId,
      );

      if (currentGroup?.subgroups && currentGroup.subgroups.length > 0) {
        if (row.subgroupId === currentGroup.subgroups[0]?.id) {
          return '1';
        }

        if (row.subgroupId === currentGroup.subgroups[1]?.id) {
          return '2';
        }
      }

      if (
        row.subgroupId === 'subgroup-2' ||
        row.subgroupId === '2' ||
        row.subgroupId.endsWith('-2')
      ) {
        return '2';
      }

      return '1';
    },
    [academicGroups],
  );

  const persistDirtyWorkload = useCallback(async () => {
    for (const id of deletedRowIds) {
      await timetableApi.deleteTeachingAssignment(id);
      setDeletedRowIds((prev) => {
        const next = new Set(prev);

        next.delete(id);

        return next;
      });
    }

    const rowsToPersist = workload.filter(
      (row) => dirtyRowIds.has(row.id) && row.disciplineTitle.trim(),
    );

    if (rowsToPersist.length === 0) {
      return;
    }

    const updatedIds = new Map<string, string>();

    for (const row of rowsToPersist) {
      const payload = {
        curriculumPlanId: planId,
        disciplineTitle: row.disciplineTitle.trim(),
        teachingType: toApiTeachingType(row.teachingType),
        academicHours: row.academicHours,
        teacherId: row.teacherId || undefined,
        groupId: row.groupId?.trim() || undefined,
        subgroupId: row.subgroupId?.trim() || undefined,
        streamId: row.streamId?.trim() || undefined,
        isSaturdayOnly: row.isSaturdayOnly,
        hasLateSlotAuthorization: row.hasLateSlotAuthorization,
      };

      const isTemporaryRow = row.id.startsWith('row-');

      if (isTemporaryRow) {
        const created = await timetableApi.createTeachingAssignment(payload);

        if (created?.data?.id) {
          updatedIds.set(row.id, created.data.id);
        }
      } else {
        await timetableApi.updateTeachingAssignment(row.id, payload);
      }
    }

    if (updatedIds.size > 0) {
      setWorkload((prev) =>
        prev.map((row) =>
          updatedIds.has(row.id) ? { ...row, id: updatedIds.get(row.id) ?? row.id } : row,
        ),
      );
    }

    setDirtyRowIds((prev) => {
      const next = new Set(prev);

      for (const row of rowsToPersist) {
        next.delete(row.id);
      }

      return next;
    });
  }, [deletedRowIds, dirtyRowIds, planId, workload]);

  const handleSaveWorkload = useCallback(async () => {
    setIsSavingWorkload(true);
    setError(null);

    try {
      await persistDirtyWorkload();
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? `${formatMessage('timetable.generateError')} (${err.message})`
          : formatMessage('timetable.generateError'),
      );
    } finally {
      setIsSavingWorkload(false);
    }
  }, [formatMessage, persistDirtyWorkload]);

  const handleGenerate = useCallback(async () => {
    if (!calendarReady) {
      setError(formatMessage('timetable.calendarError'));

      return;
    }

    setIsGenerating(true);
    setIsPublished(false);
    setError(null);

    try {
      await persistDirtyWorkload();

      const response = await timetableApi.generateTimetableDraft(planId, {
        maxCandidates: 3,
        timeoutMs: 5000,
      });

      setDraftResult(response.data);
      setSelectedCandidateIndex(0);
    } catch (err) {
      setDraftResult(null);
      setError(describeGenerationError(err, formatMessage));
    } finally {
      setIsGenerating(false);
    }
  }, [calendarReady, formatMessage, persistDirtyWorkload, planId]);

  const handlePublish = useCallback(async () => {
    if (!draftResult) {
      return;
    }

    setIsPublishing(true);
    setError(null);

    const targetVersionId =
      draftResult.candidates[selectedCandidateIndex]?.versionId || draftResult.versionId;

    try {
      await timetableApi.publishTimetableVersion(targetVersionId);
      setIsPublished(true);
    } catch {
      setIsPublished(false);
      setError(formatMessage('timetable.publishError'));
    } finally {
      setIsPublishing(false);
    }
  }, [draftResult, formatMessage, selectedCandidateIndex]);

  const selectedCandidate = draftResult?.candidates[selectedCandidateIndex];
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
  const handleStartAdjust = useCallback((event: PreviewEvent, weekday: number): void => {
    setAdjustingEvent(event);
    setTargetWeekday(String(weekday));
    setTargetPair(String(event.pair));
    setAdjustmentError(null);
  }, []);
  const handleAdjustSlot = async (): Promise<void> => {
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
              index === candidateIndex
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
        failure instanceof Error ? failure.message : formatMessage('timetable.adjustError'),
      );
    } finally {
      setIsAdjusting(false);
    }
  };
  const hasPendingWorkload =
    deletedRowIds.size > 0 || dirtyRowIds.size > 0 || isSavingWorkload || isGenerating;
  const executionTimeMs =
    draftResult?.diagnostics?.timeMs ??
    (draftResult?.diagnostics as DiagnosticsWithDuration | undefined)?.durationMs ??
    0;
  const scheduledEventsCount =
    (draftResult as DraftResultWithSummaries | null)?.candidateSummaries?.[selectedCandidateIndex]
      ?.eventCount ??
    selectedCandidate?.events?.length ??
    0;

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h2>{formatMessage('timetable.managementTitle')}</h2>
      </header>

      {error && (
        <div className={styles.errorBanner} role="alert">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Curriculum Plan Selection */}
      <section className={styles.planRow}>
        <label htmlFor={`${baseId}-planId`}>{formatMessage('timetable.planId')}</label>
        <Select
          id={`${baseId}-planId`}
          value={planId}
          options={planOptions}
          onChange={handleSelectPlan}
          disabled={hasPendingWorkload}
          aria-label={formatMessage('timetable.planId')}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => setIsPlanDialogOpen(true)}
          disabled={hasPendingWorkload}
        >
          <Plus size={16} /> {formatMessage('timetable.addPlan')}
        </Button>
      </section>
      {isPlanDialogOpen && (
        <CurriculumPlanDialog
          open
          academicGroups={academicGroups}
          plans={plans}
          onClose={() => setIsPlanDialogOpen(false)}
          onCreated={handlePlanCreated}
        />
      )}

      {/* Workload Table */}
      {selectedPlan && (
        <WorkloadSummary
          key={planId}
          academicYear={selectedPlan.academicYear}
          semester={selectedPlan.semester}
          workload={workload}
          onCalendarReadyChange={setCalendarReady}
        />
      )}
      <section className={styles.section}>
        <h3>{formatMessage('timetable.workloadTitle')}</h3>
        <fieldset
          className={styles.tableContainer}
          aria-label={formatMessage('timetable.workloadTitle')}
          disabled={isSavingWorkload || isGenerating}
          tabIndex={0}
        >
          <div className={styles.tableInner}>
            <div className={styles.tableHead}>
              <table className={styles.workloadTable}>
                <thead>
                  <tr>
                    <th>{formatMessage('timetable.teachingType')}</th>
                    <th>{formatMessage('timetable.groupOrStream')}</th>
                    <th>{formatMessage('timetable.subgroup')}</th>
                    <th>{formatMessage('timetable.hours')}</th>
                    <th>{formatMessage('timetable.teacher')}</th>
                    <th>{formatMessage('timetable.saturdayOnly')}</th>
                    <th>{formatMessage('timetable.lateSlotAuth')}</th>
                    <th>{formatMessage('timetable.actions')}</th>
                  </tr>
                </thead>
              </table>
            </div>
            {workloadGroups.map((group) => {
              const isCollapsed = collapsedGroups.has(group.key);
              const ids = group.rows.map((row) => row.id);
              const label = group.title || formatMessage('timetable.disciplineTitle');

              return (
                <section key={group.key} className={styles.workloadGroup}>
                  <div className={styles.groupHeader}>
                    <Button
                      type="button"
                      variant="secondary"
                      size="small"
                      aria-expanded={!isCollapsed}
                      aria-label={formatMessage(
                        isCollapsed ? 'timetable.expandDiscipline' : 'timetable.collapseDiscipline',
                        { discipline: label },
                      )}
                      onClick={() => handleToggleGroup(group.key)}
                    >
                      {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    </Button>
                    <TextInput
                      value={group.title}
                      onChange={(e) => handleRenameGroup(ids, e.target.value)}
                      placeholder={formatMessage('timetable.disciplineTitle')}
                      aria-label={formatMessage('timetable.disciplineTitle')}
                    />
                    <Tag>{group.rows.length}</Tag>
                    <Button
                      type="button"
                      variant="secondary"
                      size="small"
                      onClick={() => handleAddRow(group.title)}
                      aria-label={formatMessage('timetable.addWorkloadToDiscipline', {
                        discipline: label,
                      })}
                    >
                      <Plus size={14} />
                    </Button>
                  </div>
                  {!isCollapsed && (
                    <table className={styles.workloadTable}>
                      <tbody>
                        {group.rows.map((row) => (
                          <tr key={row.id}>
                            <td data-label={formatMessage('timetable.teachingType')}>
                              <Select
                                value={row.teachingType}
                                options={teachingTypeOptions}
                                onChange={(val) =>
                                  handleUpdateRow(
                                    row.id,
                                    'teachingType',
                                    val as WorkloadRow['teachingType'],
                                  )
                                }
                                aria-label={formatMessage('timetable.teachingType')}
                              />
                            </td>
                            <td data-label={formatMessage('timetable.groupOrStream')}>
                              <div className={styles.groupCell}>
                                <Select
                                  value={getSelectedGroupOrStream(row)}
                                  options={groupOrStreamOptions}
                                  onChange={(val) => handleGroupOrStreamChange(row.id, val)}
                                  aria-label={formatMessage('timetable.groupOrStream')}
                                />
                                {(row.streamId === 'custom-stream' ||
                                  (Boolean(row.streamId) && row.streamId !== 'stream-1')) && (
                                  <TextInput
                                    value={
                                      row.streamId === 'custom-stream' ? '' : (row.streamId ?? '')
                                    }
                                    placeholder={formatMessage('timetable.streamPlaceholder')}
                                    onChange={(e) =>
                                      handleUpdateRow(row.id, 'streamId', e.target.value)
                                    }
                                    aria-label={formatMessage('timetable.streamPlaceholder')}
                                  />
                                )}
                              </div>
                            </td>
                            <td data-label={formatMessage('timetable.subgroup')}>
                              <div className={styles.subgroupCell}>
                                <Select
                                  value={getSubgroupValue(row)}
                                  options={subgroupOptions}
                                  onChange={(val) => handleSubgroupChange(row.id, val)}
                                  disabled={Boolean(row.streamId)}
                                  aria-label={formatMessage('timetable.subgroup')}
                                />
                              </div>
                            </td>
                            <td data-label={formatMessage('timetable.hours')}>
                              <TextInput
                                type="number"
                                value={row.academicHours}
                                onChange={(e) =>
                                  handleUpdateRow(
                                    row.id,
                                    'academicHours',
                                    Number(e.target.value) || 0,
                                  )
                                }
                                className={styles.hoursInput}
                                aria-label={formatMessage('timetable.hours')}
                              />
                            </td>
                            <td
                              data-label={formatMessage('timetable.teacher')}
                              className={row.teacherId ? undefined : styles.missingTeacher}
                              title={
                                row.teacherId
                                  ? undefined
                                  : formatMessage('timetable.teacherMissing')
                              }
                            >
                              <Select
                                value={row.teacherId ?? ''}
                                options={teacherOptions}
                                onChange={(val) => handleUpdateRow(row.id, 'teacherId', val)}
                                aria-label={formatMessage('timetable.teacher')}
                              />
                            </td>
                            <td
                              className={styles.checkCell}
                              data-label={formatMessage('timetable.saturdayOnly')}
                            >
                              <CheckBox
                                variant="primary"
                                checked={row.isSaturdayOnly}
                                onChange={(e) =>
                                  handleUpdateRow(row.id, 'isSaturdayOnly', e.target.checked)
                                }
                                aria-label={formatMessage('timetable.saturdayOnlyRow', {
                                  discipline:
                                    row.disciplineTitle ||
                                    formatMessage('timetable.disciplineTitle'),
                                })}
                              />
                            </td>
                            <td
                              className={styles.checkCell}
                              data-label={formatMessage('timetable.lateSlotAuth')}
                            >
                              <CheckBox
                                variant="primary"
                                checked={row.hasLateSlotAuthorization}
                                onChange={(e) =>
                                  handleUpdateRow(
                                    row.id,
                                    'hasLateSlotAuthorization',
                                    e.target.checked,
                                  )
                                }
                                aria-label={formatMessage('timetable.lateSlotAuthRow', {
                                  discipline:
                                    row.disciplineTitle ||
                                    formatMessage('timetable.disciplineTitle'),
                                })}
                              />
                            </td>
                            <td data-label={formatMessage('timetable.actions')}>
                              <Button
                                type="button"
                                variant="secondary"
                                size="small"
                                onClick={() => handleRemoveRow(row.id)}
                                aria-label={formatMessage('timetable.deleteRow', {
                                  discipline:
                                    row.disciplineTitle ||
                                    formatMessage('timetable.disciplineTitle'),
                                })}
                              >
                                <Trash2 size={14} />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </section>
              );
            })}
          </div>
        </fieldset>

        <div className={styles.tableActions}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleAddRow()}
            disabled={isSavingWorkload || isGenerating}
          >
            <Plus size={16} /> {formatMessage('timetable.addDiscipline')}
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={handleSaveWorkload}
            disabled={isSavingWorkload || isGenerating || !planId}
          >
            <Save size={16} /> {formatMessage('timetable.saveWorkload')}
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleGenerate}
            disabled={isGenerating || isSavingWorkload || !planId || !calendarReady}
          >
            {isGenerating ? (
              <>
                <span className={styles.inlineSpinner} aria-hidden="true" />{' '}
                {formatMessage('timetable.generating')}
              </>
            ) : (
              <>
                <Play size={16} /> {formatMessage('timetable.generateDraft')}
              </>
            )}
          </Button>
        </div>
      </section>

      {draftResult && (
        <DraftResults
          draft={draftResult}
          selectedIndex={selectedCandidateIndex}
          executionTimeMs={executionTimeMs}
          scheduledEventsCount={scheduledEventsCount}
          teachers={teachers}
          academicGroups={academicGroups}
          slotPreferences={slotPreferencesQuery.data}
          isPublished={isPublished}
          isPublishing={isPublishing}
          isGenerating={isGenerating}
          onSelect={setSelectedCandidateIndex}
          onRegenerate={() => void handleGenerate()}
          onPublish={() => void handlePublish()}
          onAdjust={handleStartAdjust}
        />
      )}
      <AdjustSlotDialog
        event={adjustingEvent}
        weekdayOptions={weekdayOptions}
        targetWeekday={targetWeekday}
        targetPair={targetPair}
        hasConflict={adjustmentConflict}
        isSaving={isAdjusting}
        error={adjustmentError}
        onWeekdayChange={setTargetWeekday}
        onPairChange={setTargetPair}
        onClose={() => setAdjustingEvent(null)}
        onSubmit={() => void handleAdjustSlot()}
      />
    </div>
  );
};

export default TimetableManagement;
