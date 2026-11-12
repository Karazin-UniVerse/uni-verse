import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ExternalLink,
  Play,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { Button, CheckBox, Modal, Select, Tag, TextInput } from '@una';
import { PAIR_SCHEDULE, type PairNumber } from '@core/constants/timetable';
import { checkTimetableConflicts } from '@core/utils/timetable';
import type {
  AcademicGroupResponse,
  CreateTeachingAssignmentRequest,
  GenerateTimetableDraftResult,
  ScheduledEvent,
} from '@core/types/timetable';
import { useTimetableReferences } from '@uni-hub/hooks/useTimetableReferences';
import { useLanguage, type FormatMessage } from '@uni-hub/i18n/LanguageContext';
import { timetableApi } from '@uni-hub/services/api.timetable';
import styles from './TimetableManagement.module.scss';

type PreviewEvent = ScheduledEvent & {
  weekday?: number;
  dayOfWeek?: number;
  teacherName?: string;
  groupCode?: string;
  groupCodes?: string[];
  subgroupName?: string;
  streamName?: string;
  meetingUrl?: string | null;
};

type DiagnosticsWithDuration = GenerateTimetableDraftResult['diagnostics'] & {
  durationMs?: number;
};

type DraftResultWithSummaries = GenerateTimetableDraftResult & {
  candidateSummaries?: Array<{
    eventCount?: number;
  }>;
};

const PREVIEW_DAYS = [1, 2, 3, 4, 5, 6] as const;
const PREVIEW_PAIRS: PairNumber[] = [1, 2, 3, 4, 5, 6, 7];

const getEventWeekday = (event: PreviewEvent): number | null => {
  if (typeof event.weekday === 'number' && event.weekday >= 1 && event.weekday <= 6) {
    return event.weekday;
  }

  if (typeof event.dayOfWeek === 'number' && event.dayOfWeek >= 1 && event.dayOfWeek <= 6) {
    return event.dayOfWeek;
  }

  if (event.date) {
    const normalized = event.date.includes('T') ? event.date : `${event.date}T00:00:00Z`;
    const day = new Date(normalized).getUTCDay();

    if (day >= 1 && day <= 6) {
      return day;
    }
  }

  return null;
};

const buildPreviewSlots = (events: PreviewEvent[]): Map<string, PreviewEvent[]> => {
  const slots = new Map<string, PreviewEvent[]>();
  const seenPerSlot = new Map<string, Set<string>>();
  const hasRegularEvents = events.some((event) => !event.isMakeupSaturday);

  for (const event of events) {
    if (hasRegularEvents && event.isMakeupSaturday) {
      continue;
    }

    const weekday = getEventWeekday(event);

    if (!weekday) {
      continue;
    }

    const span = Math.max(1, event.pairSpan ?? 1);
    const dedupeKey =
      event.teachingAssignmentId ||
      `${event.disciplineTitle}|${event.teachingType}|${event.teacherId}|${(event.groupCodes ?? event.groupIds ?? []).join(',')}|${event.subgroupId ?? ''}|${event.streamId ?? ''}`;

    for (let offset = 0; offset < span; offset += 1) {
      const pair = event.pair + offset;

      if (pair < 1 || pair > 7) {
        continue;
      }

      const slotKey = `${weekday}-${pair}`;
      let seen = seenPerSlot.get(slotKey);

      if (!seen) {
        seen = new Set<string>();
        seenPerSlot.set(slotKey, seen);
      }

      if (seen.has(dedupeKey)) {
        continue;
      }

      seen.add(dedupeKey);

      const list = slots.get(slotKey) ?? [];

      list.push(event);
      slots.set(slotKey, list);
    }
  }

  return slots;
};

const getTeachingTypeBadge = (
  type: string,
  formatMessage: FormatMessage,
): {
  label: string;
  tone: 'info' | 'success' | 'warning' | 'default';
  cardClass: string;
} => {
  switch (type) {
    case 'PRACTICAL':
    case 'PRACTICE':
      return {
        label: formatMessage('timetable.typePracticalShort'),
        tone: 'success',
        cardClass: styles.eventPractice,
      };
    case 'LABORATORY':
    case 'LAB':
      return {
        label: formatMessage('timetable.typeLaboratoryShort'),
        tone: 'warning',
        cardClass: styles.eventLab,
      };
    case 'SEMINAR':
      return {
        label: formatMessage('timetable.typeSeminarShort'),
        tone: 'default',
        cardClass: styles.eventSeminar,
      };
    default:
      return {
        label: formatMessage('timetable.typeLectureShort'),
        tone: 'info',
        cardClass: styles.eventLecture,
      };
  }
};

const getTargetBadges = (
  event: PreviewEvent,
  academicGroups: AcademicGroupResponse[],
  formatMessage: FormatMessage,
): string[] => {
  const badges: string[] = [];

  if (event.streamName || event.streamId) {
    badges.push(
      formatMessage('timetable.streamBadge', {
        stream: event.streamName || event.streamId || '',
      }),
    );
  }

  const rawGroups = event.groupCodes?.length
    ? event.groupCodes
    : event.groupCode
      ? [event.groupCode]
      : (event.groupIds ?? []);

  if (rawGroups.length > 0) {
    const resolvedGroups = rawGroups.map((groupId) => {
      const matched = academicGroups.find(
        (group) => group.id === groupId || group.code === groupId,
      );

      return matched?.code ?? groupId;
    });

    badges.push(resolvedGroups.join(', '));
  }

  if (event.subgroupName || event.subgroupId) {
    const rawSubgroup = event.subgroupName || event.subgroupId || '';
    let resolvedSubgroup = rawSubgroup;

    for (const group of academicGroups) {
      const matched = group.subgroups?.find(
        (sub) => sub.id === rawSubgroup || sub.name === rawSubgroup,
      );

      if (matched) {
        resolvedSubgroup = matched.name;
        break;
      }
    }

    badges.push(
      formatMessage('timetable.subgroupBadge', {
        subgroup: resolvedSubgroup,
      }),
    );
  }

  return badges;
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
  const { plans, teachers } = useTimetableReferences();
  const planId = chosenPlanId || plans[0]?.id || '';

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

  const handleAddRow = useCallback(() => {
    const newId = `row-${Date.now()}`;
    const defaultGroup = academicGroups[0]?.id ?? 'group-1';
    const newRow: WorkloadRow = {
      id: newId,
      disciplineTitle: '',
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
  }, [academicGroups]);

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
      setError(
        err instanceof Error && err.message
          ? `${formatMessage('timetable.generateError')} (${err.message})`
          : formatMessage('timetable.generateError'),
      );
    } finally {
      setIsGenerating(false);
    }
  }, [formatMessage, persistDirtyWorkload, planId]);

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
                    events: response.data.events.map((event) => ({
                      ...candidate.events.find((previousEvent) => previousEvent.id === event.id),
                      ...event,
                    })),
                    penaltyScore: response.data.penaltyScore ?? candidate.penaltyScore,
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
  const previewSlots = useMemo(
    () => buildPreviewSlots((selectedCandidate?.events ?? []) as PreviewEvent[]),
    [selectedCandidate],
  );
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
          onChange={(id) => {
            setWorkload([]);
            setPlanId(id);
          }}
          disabled={
            deletedRowIds.size > 0 || dirtyRowIds.size > 0 || isSavingWorkload || isGenerating
          }
          aria-label={formatMessage('timetable.planId')}
        />
      </section>

      {/* Workload Table */}
      <section className={styles.section}>
        <h3>{formatMessage('timetable.workloadTitle')}</h3>
        <fieldset
          className={styles.tableContainer}
          disabled={isSavingWorkload || isGenerating}
          style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
        >
          <table className={styles.workloadTable}>
            <thead>
              <tr>
                <th>{formatMessage('timetable.disciplineTitle')}</th>
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
            <tbody>
              {workload.map((row) => (
                <tr key={row.id}>
                  <td>
                    <TextInput
                      value={row.disciplineTitle}
                      onChange={(e) => handleUpdateRow(row.id, 'disciplineTitle', e.target.value)}
                      placeholder={formatMessage('timetable.disciplineTitle')}
                      aria-label={formatMessage('timetable.disciplineTitle')}
                    />
                  </td>
                  <td>
                    <Select
                      value={row.teachingType}
                      options={teachingTypeOptions}
                      onChange={(val) =>
                        handleUpdateRow(row.id, 'teachingType', val as WorkloadRow['teachingType'])
                      }
                      aria-label={formatMessage('timetable.teachingType')}
                    />
                  </td>
                  <td>
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
                          value={row.streamId === 'custom-stream' ? '' : (row.streamId ?? '')}
                          placeholder={formatMessage('timetable.streamPlaceholder')}
                          onChange={(e) => handleUpdateRow(row.id, 'streamId', e.target.value)}
                          aria-label={formatMessage('timetable.streamPlaceholder')}
                        />
                      )}
                    </div>
                  </td>
                  <td>
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
                  <td>
                    <TextInput
                      type="number"
                      value={row.academicHours}
                      onChange={(e) =>
                        handleUpdateRow(row.id, 'academicHours', Number(e.target.value) || 0)
                      }
                      style={{ width: '80px' }}
                      aria-label={formatMessage('timetable.hours')}
                    />
                  </td>
                  <td>
                    <Select
                      value={row.teacherId ?? ''}
                      options={teacherOptions}
                      onChange={(val) => handleUpdateRow(row.id, 'teacherId', val)}
                      aria-label={formatMessage('timetable.teacher')}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <CheckBox
                      variant="primary"
                      checked={row.isSaturdayOnly}
                      onChange={(e) => handleUpdateRow(row.id, 'isSaturdayOnly', e.target.checked)}
                      aria-label={formatMessage('timetable.saturdayOnlyRow', {
                        discipline:
                          row.disciplineTitle || formatMessage('timetable.disciplineTitle'),
                      })}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <CheckBox
                      variant="primary"
                      checked={row.hasLateSlotAuthorization}
                      onChange={(e) =>
                        handleUpdateRow(row.id, 'hasLateSlotAuthorization', e.target.checked)
                      }
                      aria-label={formatMessage('timetable.lateSlotAuthRow', {
                        discipline:
                          row.disciplineTitle || formatMessage('timetable.disciplineTitle'),
                      })}
                    />
                  </td>
                  <td>
                    <Button
                      type="button"
                      variant="secondary"
                      size="small"
                      onClick={() => handleRemoveRow(row.id)}
                      aria-label={formatMessage('timetable.deleteRow', {
                        discipline:
                          row.disciplineTitle || formatMessage('timetable.disciplineTitle'),
                      })}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </fieldset>

        <div className={styles.tableActions}>
          <Button
            type="button"
            variant="secondary"
            onClick={handleAddRow}
            disabled={isSavingWorkload || isGenerating}
          >
            <Plus size={16} /> {formatMessage('timetable.addAssignment')}
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
            disabled={isGenerating || isSavingWorkload || !planId}
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

      {/* Diagnostics and Candidates Display */}
      {draftResult && (
        <section className={styles.section}>
          <h3>{formatMessage('timetable.diagnosticsTitle')}</h3>
          <div className={styles.diagnosticsGrid}>
            <div className={styles.diagCard}>
              <span>{formatMessage('timetable.statesExplored')}</span>
              <strong>{draftResult.diagnostics.statesExplored}</strong>
            </div>
            <div className={styles.diagCard}>
              <span>{formatMessage('timetable.executionTime')}</span>
              <strong>
                {formatMessage('timetable.executionTimeVal', {
                  time: executionTimeMs,
                })}
              </strong>
            </div>
            <div className={styles.diagCard}>
              <span>{formatMessage('timetable.candidatesFound')}</span>
              <strong>{draftResult.candidates.length}</strong>
            </div>
          </div>

          <div className={styles.candidatesList}>
            {draftResult.candidates.map((cand, idx) => (
              <div
                key={idx}
                className={`${styles.candidateCard} ${
                  selectedCandidateIndex === idx ? styles.selectedCandidate : ''
                }`}
                onClick={() => setSelectedCandidateIndex(idx)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setSelectedCandidateIndex(idx);
                  }
                }}
              >
                <div className={styles.candidateHeader}>
                  <span>{formatMessage('timetable.candidateNumbered', { number: idx + 1 })}</span>
                  <Tag tone={cand.penaltyScore === 0 ? 'success' : 'warning'}>
                    {formatMessage('timetable.penaltyScoreVal', { score: cand.penaltyScore })}
                  </Tag>
                </div>
                <div className={styles.penaltyDetails}>
                  {cand.penaltyScore === 0 ? (
                    <span>
                      <Check size={14} /> {formatMessage('timetable.noPenalties')}
                    </span>
                  ) : (
                    <span>
                      {formatMessage('timetable.softPenaltiesVal', { score: cand.penaltyScore })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Weekly Schedule Preview of Selected Candidate */}
          <div className={styles.previewSection}>
            <h4>{formatMessage('timetable.previewTitle')}</h4>
            {selectedCandidate?.events && selectedCandidate.events.length > 0 ? (
              <div className={styles.previewGrid}>
                <table>
                  <thead className={styles.gridHeader}>
                    <tr>
                      <th>{formatMessage('timetable.pairHeader')}</th>
                      <th>{formatMessage('timetable.dayMon')}</th>
                      <th>{formatMessage('timetable.dayTue')}</th>
                      <th>{formatMessage('timetable.dayWed')}</th>
                      <th>{formatMessage('timetable.dayThu')}</th>
                      <th>{formatMessage('timetable.dayFri')}</th>
                      <th>{formatMessage('timetable.daySat')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PREVIEW_PAIRS.map((pair) => {
                      const schedule = PAIR_SCHEDULE[pair];

                      return (
                        <tr key={pair} className={styles.pairRow}>
                          <td className={styles.pairTimeCell}>
                            <strong>#{pair}</strong>
                            <span>
                              {schedule.start}–{schedule.end}
                            </span>
                          </td>
                          {PREVIEW_DAYS.map((day) => {
                            const slotEvents = previewSlots.get(`${day}-${pair}`) ?? [];

                            return (
                              <td key={day} className={styles.gridCell}>
                                {slotEvents.length === 0 ? (
                                  <div className={styles.emptyCell}>
                                    {formatMessage('timetable.emptySlot')}
                                  </div>
                                ) : (
                                  <div className={styles.slotStack}>
                                    {slotEvents.map((event) => {
                                      const typeInfo = getTeachingTypeBadge(
                                        event.teachingType,
                                        formatMessage,
                                      );
                                      const targetBadges = getTargetBadges(
                                        event,
                                        academicGroups,
                                        formatMessage,
                                      );

                                      return (
                                        <div
                                          key={event.id}
                                          className={`${styles.eventCard} ${typeInfo.cardClass}`}
                                        >
                                          <div className={styles.eventTitle}>
                                            {event.disciplineTitle}
                                          </div>
                                          {!isPublished && (
                                            <Button
                                              type="button"
                                              variant="secondary"
                                              size="small"
                                              onClick={() => {
                                                setAdjustingEvent(event);
                                                setTargetWeekday(String(day));
                                                setTargetPair(String(event.pair));
                                                setAdjustmentError(null);
                                              }}
                                            >
                                              {formatMessage('timetable.adjustSlot')}
                                            </Button>
                                          )}
                                          <div className={styles.eventBadges}>
                                            <Tag size="small" tone={typeInfo.tone}>
                                              {typeInfo.label}
                                            </Tag>
                                            {targetBadges.map((badge) => (
                                              <Tag key={badge} size="small" tone="neutral">
                                                {badge}
                                              </Tag>
                                            ))}
                                            {event.isSaturdayOnly && (
                                              <Tag size="small" tone="warning">
                                                {formatMessage('timetable.saturdayOnly')}
                                              </Tag>
                                            )}
                                          </div>
                                          <div className={styles.eventMeta}>
                                            {event.teacherName || event.teacherId}
                                          </div>
                                          {event.meetingUrl && (
                                            <a
                                              href={event.meetingUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className={styles.onlineLink}
                                            >
                                              <ExternalLink size={12} />{' '}
                                              {formatMessage('timetable.onlineLink')}
                                            </a>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.emptyPreview}>
                {formatMessage('timetable.scheduledEventsCount', {
                  count: scheduledEventsCount,
                })}
              </div>
            )}
          </div>

          {/* Publication Action */}
          <div className={styles.publishRow}>
            {isPublished ? (
              <div className={styles.publishedBanner}>
                <CheckCircle2 size={18} /> {formatMessage('timetable.publishedSuccess')}
              </div>
            ) : (
              <Button
                type="button"
                variant="primary"
                onClick={handlePublish}
                disabled={isPublishing}
              >
                {isPublishing ? (
                  <>
                    <span className={styles.inlineSpinner} aria-hidden="true" />{' '}
                    {formatMessage('timetable.publishing')}
                  </>
                ) : (
                  <>
                    <Check size={16} /> {formatMessage('timetable.publishVersion')}
                  </>
                )}
              </Button>
            )}
          </div>
        </section>
      )}
      <Modal
        open={Boolean(adjustingEvent)}
        onClose={() => {
          if (!isAdjusting) setAdjustingEvent(null);
        }}
        title={formatMessage('timetable.adjustSlot')}
        closeLabel={formatMessage('common.close')}
      >
        {adjustingEvent && (
          <form
            onSubmit={(submitEvent) => {
              submitEvent.preventDefault();
              void handleAdjustSlot();
            }}
          >
            <p>{adjustingEvent.disciplineTitle}</p>
            <p>{getTeachingTypeBadge(adjustingEvent.teachingType, formatMessage).label}</p>
            <p>
              {formatMessage('timetable.currentSlot', {
                day:
                  weekdayOptions.find(
                    (option) => option.value === String(getEventWeekday(adjustingEvent)),
                  )?.label ?? '',
                pair: adjustingEvent.pair,
              })}
            </p>
            {adjustmentError && <p role="alert">{adjustmentError}</p>}
            {adjustmentConflict && <p role="alert">{formatMessage('timetable.adjustConflict')}</p>}
            <Select
              aria-label={formatMessage('timetable.targetWeekday')}
              value={targetWeekday}
              onChange={setTargetWeekday}
              options={weekdayOptions}
              disabled={isAdjusting}
            />
            <Select
              aria-label={formatMessage('timetable.targetPair')}
              value={targetPair}
              onChange={setTargetPair}
              options={PREVIEW_PAIRS.map((pair) => ({ value: String(pair), label: String(pair) }))}
              disabled={isAdjusting}
            />
            <Button type="submit" disabled={isAdjusting || adjustmentConflict}>
              {formatMessage('schedule.save')}
            </Button>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default TimetableManagement;
