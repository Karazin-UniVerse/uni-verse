import { describe, expect, it } from 'vitest';
import type { AcademicGroupResponse } from '@core/types/timetable';
import {
  getSelectedGroupOrStream,
  getSubgroupValue,
  groupWorkloadByTitle,
  toAssignmentPayload,
  withGroupOrStream,
  withSubgroup,
  type WorkloadRow,
} from './workload';

const groups: AcademicGroupResponse[] = [
  {
    id: 'g-1',
    code: 'КС11',
    subgroups: [
      { id: 'sg-1', name: '1', academicGroupId: 'g-1' },
      { id: 'sg-2', name: '2', academicGroupId: 'g-1' },
    ],
  },
  {
    id: 'g-2',
    code: 'КС12',
    subgroups: [
      { id: 'sg-3', name: '1', academicGroupId: 'g-2' },
      { id: 'sg-4', name: '2', academicGroupId: 'g-2' },
    ],
  },
];
const row: WorkloadRow = {
  id: 'a',
  disciplineTitle: ' Algebra ',
  teachingType: 'PRACTICE',
  academicHours: 32,
  isSaturdayOnly: false,
  hasLateSlotAuthorization: false,
  groupId: 'g-1',
  subgroupId: 'sg-2',
};

describe('workload helpers', () => {
  it('should preserve a second subgroup with an opaque ID when changing groups', () => {
    const opaqueGroups = groups.map((group) => ({
      ...group,
      subgroups: group.subgroups?.map((subgroup) => ({
        ...subgroup,
        id: `opaque-${subgroup.name}-${group.id}-uuid`,
      })),
    }));
    const next = withGroupOrStream({
      row: { ...row, subgroupId: 'opaque-2-g-1-uuid' },
      value: 'g-2',
      groups: opaqueGroups,
      streams: [],
    });

    expect(next.subgroupId).toBe('opaque-2-g-2-uuid');
  });

  it('should serialize explicit clearing of the teacher and subgroup', () => {
    const payload = JSON.parse(
      JSON.stringify(
        toAssignmentPayload({ ...row, teacherId: undefined, subgroupId: undefined }, 'plan-1'),
      ),
    );

    expect(payload.teacherId).toBeNull();
    expect(payload.subgroupId).toBeNull();
  });
  it('groups rows of one discipline under the id of the first row', () => {
    const rows = [row, { ...row, id: 'b' }, { ...row, id: 'c', disciplineTitle: 'Physics' }];

    expect(groupWorkloadByTitle(rows).map(({ key, title }) => [key, title])).toEqual([
      ['a', 'Algebra'],
      ['c', 'Physics'],
    ]);
  });

  it('a stream replaces the group and the subgroup', () => {
    const next = withGroupOrStream({
      row,
      value: 'stream-1',
      groups,
      streams: [{ id: 'stream-1', name: 'S' }],
    });

    expect(next).toMatchObject({ streamId: 'stream-1', groupId: undefined, subgroupId: undefined });
  });

  it('moving to another group keeps the first or second subgroup', () => {
    const next = withGroupOrStream({ row, value: 'g-2', groups, streams: [] });

    expect(next).toMatchObject({ groupId: 'g-2', streamId: undefined, subgroupId: 'sg-4' });
  });

  it('maps the subgroup selector to the group subgroups and back', () => {
    expect(withSubgroup(row, '1', groups).subgroupId).toBe('sg-1');
    expect(withSubgroup(row, '', groups).subgroupId).toBeUndefined();
    expect(getSubgroupValue({ ...row, subgroupId: 'sg-1' }, groups)).toBe('1');
    expect(getSubgroupValue(row, groups)).toBe('2');
    expect(getSubgroupValue({ ...row, streamId: 's' }, groups)).toBe('');
  });

  it('shows the stream, then the group, then the first group', () => {
    expect(getSelectedGroupOrStream({ ...row, streamId: 's' }, groups)).toBe('s');
    expect(getSelectedGroupOrStream({ ...row, groupId: 'КС12' }, groups)).toBe('g-2');
    expect(getSelectedGroupOrStream({ ...row, groupId: undefined }, groups)).toBe('g-1');
  });

  it('builds the API payload with trimmed text and API teaching types', () => {
    expect(toAssignmentPayload(row, 'plan-1')).toEqual({
      curriculumPlanId: 'plan-1',
      disciplineTitle: 'Algebra',
      teachingType: 'PRACTICAL',
      academicHours: 32,
      teacherId: null,
      groupId: 'g-1',
      subgroupId: 'sg-2',
      streamId: undefined,
      isSaturdayOnly: false,
      hasLateSlotAuthorization: false,
    });
  });
});
