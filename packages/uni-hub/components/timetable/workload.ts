import type {
  AcademicGroupResponse,
  AcademicStreamResponse,
  CreateTeachingAssignmentRequest,
} from '@core/types/timetable';

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

export const DEFAULT_GROUPS: AcademicGroupResponse[] = [
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

export const toUiTeachingType = (type: string): WorkloadRow['teachingType'] => {
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

/** Rows of one discipline sit together; the first row's id keys the group. */
export const groupWorkloadByTitle = (
  rows: WorkloadRow[],
): Array<{ key: string; title: string; rows: WorkloadRow[] }> => {
  const byTitle = new Map<string, WorkloadRow[]>();

  for (const row of rows) {
    const title = row.disciplineTitle.trim();

    byTitle.set(title, [...(byTitle.get(title) ?? []), row]);
  }

  return [...byTitle.entries()].map(([title, group]) => ({ key: group[0].id, title, rows: group }));
};

const findGroup = (
  groups: AcademicGroupResponse[],
  groupIdOrCode?: string,
): AcademicGroupResponse | undefined =>
  groups.find((group) => group.id === groupIdOrCode || group.code === groupIdOrCode);

type GroupOrStreamChange = {
  row: WorkloadRow;
  value: string;
  groups: AcademicGroupResponse[];
  streams: AcademicStreamResponse[];
};

/** The row after picking a group or a lecture stream in the shared selector. */
export const withGroupOrStream = ({
  row,
  value,
  groups,
  streams,
}: GroupOrStreamChange): WorkloadRow => {
  if (streams.some((stream) => stream.id === value)) {
    return { ...row, streamId: value, groupId: undefined, subgroupId: undefined };
  }

  const matchedGroup = findGroup(groups, value);
  let subgroupId: string | undefined;

  if (row.subgroupId) {
    const subgroupIndex =
      findGroup(groups, row.groupId)?.subgroups?.findIndex(
        (subgroup) => subgroup.id === row.subgroupId,
      ) ?? -1;

    subgroupId = subgroupIndex >= 0 ? matchedGroup?.subgroups?.[subgroupIndex]?.id : undefined;
  }

  return { ...row, groupId: matchedGroup?.id ?? value, streamId: undefined, subgroupId };
};

/** The row after picking "all", "1" or "2" in the subgroup selector. */
export const withSubgroup = (
  row: WorkloadRow,
  value: string,
  groups: AcademicGroupResponse[],
): WorkloadRow => {
  if (!value) {
    return { ...row, subgroupId: undefined };
  }

  const currentGroup = findGroup(groups, row.groupId);

  return {
    ...row,
    subgroupId: value === '2' ? currentGroup?.subgroups?.[1]?.id : currentGroup?.subgroups?.[0]?.id,
  };
};

export const getSelectedGroupOrStream = (
  row: WorkloadRow,
  groups: AcademicGroupResponse[],
): string => {
  if (row.streamId) {
    return row.streamId;
  }

  if (row.groupId) {
    return findGroup(groups, row.groupId)?.id ?? row.groupId;
  }

  return groups[0]?.id ?? '';
};

export const getSubgroupValue = (row: WorkloadRow, groups: AcademicGroupResponse[]): string => {
  if (!row.subgroupId || row.streamId) {
    return '';
  }

  const subgroups = findGroup(groups, row.groupId)?.subgroups;

  if (subgroups && subgroups.length > 0) {
    if (row.subgroupId === subgroups[0]?.id) {
      return '1';
    }

    if (row.subgroupId === subgroups[1]?.id) {
      return '2';
    }
  }

  return '';
};

export const toAssignmentPayload = (
  row: WorkloadRow,
  curriculumPlanId: string,
): CreateTeachingAssignmentRequest => ({
  curriculumPlanId,
  disciplineTitle: row.disciplineTitle.trim(),
  teachingType: toApiTeachingType(row.teachingType),
  academicHours: row.academicHours,
  teacherId: row.teacherId || null,
  groupId: row.groupId?.trim() || undefined,
  subgroupId: row.subgroupId?.trim() || null,
  streamId: row.streamId?.trim() || undefined,
  isSaturdayOnly: row.isSaturdayOnly,
  hasLateSlotAuthorization: row.hasLateSlotAuthorization,
});
