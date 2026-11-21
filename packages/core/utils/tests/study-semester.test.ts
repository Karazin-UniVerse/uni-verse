import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  MAX_PAIRS_PER_SATURDAY,
  TIMETABLE_CONFLICT_CODE,
  TIMETABLE_TEACHING_TYPE,
  TIMETABLE_WEEKDAY,
} from '../../constants/timetable.ts';
import type {
  ScheduledEvent,
  SemesterCalendarConfig,
  TeachingDemand,
} from '../../types/timetable.ts';
import { getSemesterOfYear, isReservedSlot } from '../study-semester.ts';
import { generateCompactTimetableCandidates } from '../timetable-compaction.ts';
import { checkTimetableConflicts, generateTimetableCandidates } from '../timetable.ts';

const WEDNESDAY_PAIR_THREE = {
  weekday: TIMETABLE_WEEKDAY.WEDNESDAY,
  firstPair: 3,
  lastPair: 3,
};

describe('study semester rules', () => {
  test('reserves Wednesday pair 3 only in semesters 4 to 6', () => {
    for (const studySemester of [4, 5, 6]) {
      assert.equal(isReservedSlot({ studySemester, ...WEDNESDAY_PAIR_THREE }), true);
    }

    for (const studySemester of [undefined, 1, 3, 7, 8]) {
      assert.equal(isReservedSlot({ studySemester, ...WEDNESDAY_PAIR_THREE }), false);
    }
  });

  test('reserves only that weekday and pair, including a span that covers it', () => {
    const base = { studySemester: 4, ...WEDNESDAY_PAIR_THREE };

    assert.equal(isReservedSlot({ ...base, weekday: TIMETABLE_WEEKDAY.THURSDAY }), false);
    assert.equal(isReservedSlot({ ...base, firstPair: 4, lastPair: 4 }), false);
    assert.equal(isReservedSlot({ ...base, firstPair: 2, lastPair: 3 }), true);
  });

  test('derives the semester of the year from the study semester', () => {
    assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8].map(getSemesterOfYear), [1, 2, 1, 2, 1, 2, 1, 2]);
  });
});

const calendar: SemesterCalendarConfig = {
  startDate: '2026-09-07',
  teachingWeeks: 16,
  excludedDates: [],
  makeupSaturdays: [],
};

const lecture = (index: number, studySemester?: number): TeachingDemand => ({
  id: `row-${index}`,
  disciplineTitle: `Course ${index}`,
  teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
  teacherId: `teacher-${index}`,
  groupIds: ['group'],
  academicHours: 32,
  studySemester,
});

describe('reserved elective slot', () => {
  const demands = (studySemester?: number): TeachingDemand[] =>
    Array.from({ length: 22 }, (_, index) => lecture(index, studySemester));
  const usesReservedSlot = (events: ScheduledEvent[]): boolean =>
    events.some(
      (event) => new Date(`${event.date}T00:00:00Z`).getUTCDay() === 3 && event.pair === 3,
    );

  test('is used by a crowded semester that has no reservation', () => {
    const result = generateTimetableCandidates({ calendar, demands: demands() });

    assert.ok(result.ok);
    assert.equal(usesReservedSlot(result.candidates[0].events), true);
  });

  test('stays free of classes in semesters 4 to 6', () => {
    const result = generateTimetableCandidates({ calendar, demands: demands(5) });

    assert.ok(result.ok);
    assert.equal(usesReservedSlot(result.candidates[0].events), false);
  });

  test('is a hard conflict for a class placed there afterwards', () => {
    const event: ScheduledEvent = {
      id: 'moved',
      teachingAssignmentId: 'row',
      disciplineTitle: 'Course',
      teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
      groupIds: ['group'],
      date: '2026-09-09',
      pair: 3,
      studySemester: 4,
    };

    assert.deepEqual(
      checkTimetableConflicts({ events: [event] }).hardConflicts.map(({ code }) => code),
      [TIMETABLE_CONFLICT_CODE.RESERVED_SLOT_OCCUPIED],
    );
    assert.equal(
      checkTimetableConflicts({ events: [{ ...event, studySemester: 3 }] }).isValid,
      true,
    );
  });
});

describe('compact Saturdays', () => {
  const shortCalendar = { ...calendar, teachingWeeks: 14 };
  const demands = Array.from({ length: 5 }, (_, index) => lecture(index));

  test('uses fewer Saturdays than one per missing day and keeps every hour and rule', () => {
    const rotation = generateTimetableCandidates({ calendar: shortCalendar, demands });
    const compact = generateCompactTimetableCandidates({ calendar: shortCalendar, demands });

    assert.ok(rotation.ok && compact.ok);

    const candidate = compact.candidates[0];
    const saturdays = candidate.automaticMakeupDates ?? [];
    const perSaturday = new Map<string, number>();

    for (const event of candidate.events.filter(({ isMakeupSaturday }) => isMakeupSaturday)) {
      perSaturday.set(event.date, (perSaturday.get(event.date) ?? 0) + 1);
    }

    assert.ok(saturdays.length < (rotation.candidates[0].automaticMakeupDates?.length ?? 0));
    assert.equal(candidate.events.length, rotation.candidates[0].events.length);
    assert.deepEqual([...perSaturday.keys()].sort(), saturdays);
    assert.ok(Math.max(...perSaturday.values()) <= MAX_PAIRS_PER_SATURDAY);
    assert.deepEqual(candidate.automaticMakeupDays, []);
    assert.equal(checkTimetableConflicts({ events: candidate.events }).isValid, true);
  });

  test('keeps the rotation result when nothing can be merged', () => {
    const single = [lecture(0)];
    const rotation = generateTimetableCandidates({ calendar: shortCalendar, demands: single });
    const compact = generateCompactTimetableCandidates({
      calendar: shortCalendar,
      demands: single,
    });

    assert.ok(rotation.ok && compact.ok);
    assert.ok(
      (compact.candidates[0].automaticMakeupDates?.length ?? 0) <=
        (rotation.candidates[0].automaticMakeupDates?.length ?? 0),
    );
  });
});
