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
  const previousSubgroup = findGroup(groups, row.groupId)?.subgroups?.find(
    ({ id }) => id === row.subgroupId,
  );
  const subgroupId = matchedGroup?.subgroups?.find(
    ({ name }) => name === previousSubgroup?.name,
  )?.id;

  return { ...row, groupId: matchedGroup?.id ?? value, streamId: undefined, subgroupId };
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
