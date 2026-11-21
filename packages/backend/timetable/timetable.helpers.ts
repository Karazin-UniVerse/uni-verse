import { ConflictException } from '@nestjs/common';
import {
  ISO_DATE_LENGTH,
  TIMETABLE_WEEKDAY,
} from '@universe/core/constants/timetable';
import {
  type Prisma,
  type AcademicGroup,
  type AcademicStream,
  type AcademicSubgroup,
  type SemesterCalendar,
  type TeachingAssignment,
  type TimetableEvent,
} from '@universe/database';
import type {
  AutomaticMakeupDay,
  ScheduledEvent,
} from '@universe/core/types/timetable';

type AssignmentWithRelations = TeachingAssignment & {
  group?: AcademicGroup | null;
  subgroup?: AcademicSubgroup | null;
  stream?: (AcademicStream & { groups?: AcademicGroup[] }) | null;
  curriculumPlan?: { studySemester: number | null } | null;
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

/** Everything `toScheduledEvent` needs from an assignment: participants and the study semester. */
export const EVENT_ASSIGNMENT_INCLUDE = {
  teachingAssignment: {
    include: {
      curriculumPlan: { select: { studySemester: true } },
      group: true,
      subgroup: true,
      stream: { include: { groups: true } },
    },
  },
} as const;

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
    teacherId: event.teacherIdSnapshot ?? undefined,
    groupIds: buildGroupIds(assignment),
    date,
    pair: event.pair,
    pairSpan: event.pairSpan,
    subgroupId: assignment?.subgroupId ?? undefined,
    streamId: assignment?.streamId ?? undefined,
    hasLateSlotAuthorization: assignment?.hasLateSlotAuthorization,
    isSaturdayOnly: assignment?.isSaturdayOnly,
    isMakeupSaturday: makeupDates.has(date),
    studySemester: assignment?.curriculumPlan?.studySemester ?? undefined,
  };
}

export function parseAutomaticMakeupDays(
  value?: Prisma.JsonValue,
): AutomaticMakeupDay[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new ConflictException('Invalid source-day compensation metadata');
  }

  const mappings: AutomaticMakeupDay[] = [];
  const targets = new Set<string>();
  const sources = new Set<string>();

  for (const entry of value) {
    if (
      typeof entry !== 'object' ||
      entry === null ||
      Array.isArray(entry) ||
      typeof entry.date !== 'string' ||
      typeof entry.sourceDate !== 'string'
    ) {
      throw new ConflictException('Invalid source-day compensation metadata');
    }

    const date = new Date(entry.date);
    const source = new Date(entry.sourceDate);

    if (
      !Number.isFinite(date.getTime()) ||
      !Number.isFinite(source.getTime()) ||
      date.toISOString().slice(0, ISO_DATE_LENGTH) !== entry.date ||
      source.toISOString().slice(0, ISO_DATE_LENGTH) !== entry.sourceDate ||
      date.getUTCDay() !== TIMETABLE_WEEKDAY.SATURDAY ||
      source.getUTCDay() < TIMETABLE_WEEKDAY.MONDAY ||
      source.getUTCDay() > TIMETABLE_WEEKDAY.FRIDAY ||
      targets.has(entry.date) ||
      sources.has(entry.sourceDate)
    ) {
      throw new ConflictException('Invalid source-day compensation metadata');
    }

    targets.add(entry.date);
    sources.add(entry.sourceDate);
    mappings.push({ date: entry.date, sourceDate: entry.sourceDate });
  }

  return mappings;
}
