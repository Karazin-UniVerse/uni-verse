import { useCallback, useEffect, useState } from 'react';
import type { AcademicGroupResponse, AcademicStreamResponse } from '@core/types/timetable';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { timetableApi } from '@uni-hub/services/api.timetable';
import {
  DEFAULT_GROUPS,
  toAssignmentPayload,
  toUiTeachingType,
  withGroupOrStream,
  withSubgroup,
  type WorkloadRow,
} from './workload';

type UseWorkloadEditorParams = {
  planId: string;
  streams: AcademicStreamResponse[];
  onError: (message: string | null) => void;
  initialWorkload?: WorkloadRow[];
};

const withId = (ids: ReadonlySet<string>, id: string): Set<string> => new Set(ids).add(id);

const withoutId = (ids: ReadonlySet<string>, id: string): Set<string> => {
  const next = new Set(ids);

  next.delete(id);

  return next;
};

/** The editable workload table of one plan: loading, row edits and saving what changed. */
export function useWorkloadEditor({
  planId,
  streams,
  onError,
  initialWorkload,
}: UseWorkloadEditorParams) {
  const { formatMessage } = useLanguage();
  const [academicGroups, setAcademicGroups] = useState<AcademicGroupResponse[]>(
    () => DEFAULT_GROUPS,
  );
  const [workload, setWorkload] = useState<WorkloadRow[]>(() => initialWorkload ?? []);
  const [dirtyRowIds, setDirtyRowIds] = useState<Set<string>>(() => new Set());
  const [deletedRowIds, setDeletedRowIds] = useState<Set<string>>(() => new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [failedLoadPlanId, setFailedLoadPlanId] = useState<string | null>(null);

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
        if (isActive && Array.isArray(response?.data)) {
          setFailedLoadPlanId(null);
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
        if (isActive) {
          setFailedLoadPlanId(planId);
        }
      });

    return () => {
      isActive = false;
    };
  }, [initialWorkload, planId]);

  const editRow = useCallback((id: string, change: (row: WorkloadRow) => WorkloadRow) => {
    setWorkload((rows) => rows.map((row) => (row.id === id ? change(row) : row)));
    setDirtyRowIds((ids) => withId(ids, id));
  }, []);

  const updateRow = useCallback(
    <K extends keyof WorkloadRow>(id: string, key: K, value: WorkloadRow[K]) =>
      editRow(id, (row) => ({ ...row, [key]: value })),
    [editRow],
  );

  const renameDiscipline = useCallback((ids: readonly string[], title: string) => {
    setWorkload((rows) =>
      rows.map((row) => (ids.includes(row.id) ? { ...row, disciplineTitle: title } : row)),
    );
    setDirtyRowIds((previous) => new Set([...previous, ...ids]));
  }, []);

  const changeGroupOrStream = useCallback(
    (id: string, value: string) =>
      editRow(id, (row) => withGroupOrStream({ row, value, groups: academicGroups, streams })),
    [academicGroups, editRow, streams],
  );

  const changeSubgroup = useCallback(
    (id: string, value: string) => editRow(id, (row) => withSubgroup(row, value, academicGroups)),
    [academicGroups, editRow],
  );

  const addRow = useCallback(
    (disciplineTitle = '') => {
      const id = `row-${Date.now()}`;

      setWorkload((rows) => [
        ...rows,
        {
          id,
          disciplineTitle,
          teachingType: 'LECTURE',
          academicHours: 32,
          teacherId: undefined,
          groupId: academicGroups[0]?.id ?? 'group-1',
          subgroupId: undefined,
          streamId: undefined,
          isSaturdayOnly: false,
          hasLateSlotAuthorization: false,
        },
      ]);
      setDirtyRowIds((ids) => withId(ids, id));
    },
    [academicGroups],
  );

  const removeRow = useCallback((id: string) => {
    if (!id.startsWith('row-')) {
      setDeletedRowIds((ids) => withId(ids, id));
    }

    setWorkload((rows) => rows.filter((row) => row.id !== id));
    setDirtyRowIds((ids) => withoutId(ids, id));
  }, []);

  const persist = useCallback(async () => {
    for (const id of deletedRowIds) {
      await timetableApi.deleteTeachingAssignment(id);
      setDeletedRowIds((ids) => withoutId(ids, id));
    }

    const rowsToPersist = workload.filter(
      (row) => dirtyRowIds.has(row.id) && row.disciplineTitle.trim(),
    );

    if (rowsToPersist.length === 0) {
      return;
    }

    for (const row of rowsToPersist) {
      const payload = toAssignmentPayload(row, planId);

      if (row.id.startsWith('row-')) {
        const created = await timetableApi.createTeachingAssignment(payload);

        if (created?.data?.id) {
          setWorkload((rows) =>
            rows.map((existing) =>
              existing.id === row.id ? { ...existing, id: created.data.id } : existing,
            ),
          );
        }
      } else {
        await timetableApi.updateTeachingAssignment(row.id, payload);
      }

      setDirtyRowIds((ids) => withoutId(ids, row.id));
    }
  }, [deletedRowIds, dirtyRowIds, planId, workload]);

  const save = useCallback(async () => {
    setIsSaving(true);
    onError(null);

    try {
      await persist();
    } catch (failure) {
      onError(
        failure instanceof Error && failure.message
          ? `${formatMessage('timetable.generateError')} (${failure.message})`
          : formatMessage('timetable.generateError'),
      );
    } finally {
      setIsSaving(false);
    }
  }, [formatMessage, onError, persist]);

  const clear = useCallback(() => setWorkload([]), []);

  return {
    workload,
    academicGroups,
    isSaving,
    isLoadFailed: failedLoadPlanId === planId,
    hasUnsavedChanges: deletedRowIds.size > 0 || dirtyRowIds.size > 0,
    addRow,
    removeRow,
    updateRow,
    renameDiscipline,
    changeGroupOrStream,
    changeSubgroup,
    persist,
    save,
    clear,
  };
}

export type WorkloadEditor = ReturnType<typeof useWorkloadEditor>;
