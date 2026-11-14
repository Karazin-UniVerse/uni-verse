import { ForbiddenException } from '@nestjs/common';
import {
  Role,
  type AcademicGroup,
  type AcademicStream,
  type AcademicSubgroup,
  type SemesterCalendar,
  type TeachingAssignment,
  type TimetableEvent,
} from '@universe/database';
import type { ScheduledEvent } from '@universe/core/types/timetable';

export function assertAdmin(roles?: string[]): void {
  if (!roles?.includes(Role.ADMIN) && !roles?.includes('ADMIN')) {
    throw new ForbiddenException('Administrative privileges required');
  }
}

type AssignmentWithRelations = TeachingAssignment & {
  group?: AcademicGroup | null;
  subgroup?: AcademicSubgroup | null;
  stream?: (AcademicStream & { groups?: AcademicGroup[] }) | null;
};

export function toIsoDateString(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
}

export function buildGroupIds(
  assignment?: AssignmentWithRelations | null,
): string[] {
  return [
    ...new Set([
      ...(assignment?.groupId ? [assignment.groupId] : []),
      ...(assignment?.subgroup?.academicGroupId
        ? [assignment.subgroup.academicGroupId]
        : []),
      ...(assignment?.stream?.groups?.map((group) => group.id) ?? []),
    ]),
  ];
}

export function parseMakeupSaturdays(
  calendar?: SemesterCalendar | null,
): Array<{ date: string; followsWeekday: number }> {
  const entries: Array<{ date: string; followsWeekday: number }> = [];

  if (Array.isArray(calendar?.makeupSaturdays)) {
    for (const item of calendar.makeupSaturdays) {
      if (
        typeof item === 'object' &&
        item !== null &&
        'date' in item &&
        typeof item.date === 'string'
      ) {
        const followsWeekday =
          'followsWeekday' in item && typeof item.followsWeekday === 'number'
            ? item.followsWeekday
            : 1;

        entries.push({ date: item.date, followsWeekday });
      }
    }
  }

  return entries;
}

export function parseMakeupSaturdayDates(
  calendar?: SemesterCalendar | null,
  automaticMakeupDates: readonly string[] = [],
): Set<string> {
  return new Set([
    ...parseMakeupSaturdays(calendar).map((entry) => entry.date),
    ...automaticMakeupDates,
  ]);
}

export function toScheduledEvent(
  event: TimetableEvent & {
    teachingAssignment?: AssignmentWithRelations | null;
  },
  makeupDates: Set<string>,
): ScheduledEvent {
  const assignment = event.teachingAssignment;
  const date = toIsoDateString(event.date);

  return {
    id: event.id,
    teachingAssignmentId: event.teachingAssignmentId,
    disciplineTitle:
      event.disciplineTitleSnapshot ?? assignment?.disciplineTitle ?? '',
    teachingType: (event.teachingTypeSnapshot ??
      assignment?.teachingType) as ScheduledEvent['teachingType'],
    teacherId: event.teacherIdSnapshot ?? assignment?.teacherId ?? undefined,
    groupIds: buildGroupIds(assignment),
    date,
    pair: event.pair,
    pairSpan: event.pairSpan,
    subgroupId: assignment?.subgroupId ?? undefined,
    streamId: assignment?.streamId ?? undefined,
    hasLateSlotAuthorization: assignment?.hasLateSlotAuthorization,
    isSaturdayOnly: assignment?.isSaturdayOnly,
    isMakeupSaturday: makeupDates.has(date),
  };
}
