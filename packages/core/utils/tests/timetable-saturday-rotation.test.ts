import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  TIMETABLE_PHASE_ORDER,
  TIMETABLE_TEACHING_TYPE,
  TIMETABLE_WEEK_PARITY,
} from '../../constants/timetable.ts';
import type { TeachingDemand } from '../../types/timetable.ts';
import { generateTimetableCandidates } from '../timetable.ts';
import { denseTimetable } from './fixtures/dense-timetable.ts';

const demand: TeachingDemand = {
  id: 'lecture',
  disciplineTitle: 'Mathematics',
  teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
  teacherId: 'teacher',
  groupIds: ['group'],
  academicHours: 32,
};

describe('Saturday source-day rotation', () => {
  for (const participant of [{ studentIds: ['student'] }, { streamId: 'stream' }]) {
    test(`keeps the Saturday limit for ${'studentIds' in participant ? 'individual students' : 'stream-only participants'}`, () => {
      const demands = Array.from({ length: 6 }, (_, index) => ({
        ...demand,
        ...participant,
        id: `row-${index}`,
        groupIds: [],
        teacherId: `teacher-${index}`,
        hasLateSlotAuthorization: true,
      }));
      const unavailability = demands
        .flatMap((row) =>
          Array.from({ length: 4 }, (_, day) =>
            Array.from({ length: 7 }, (_, pair) => ({
              teacherId: row.teacherId,
              date: new Date(Date.parse('2026-09-08') + day * 86400000).toISOString().slice(0, 10),
              pair: pair + 1,
              isConfirmed: true,
            })),
          ),
        )
        .flat();
      const result = generateTimetableCandidates({
        calendar: {
          startDate: '2026-09-07',
          teachingWeeks: 14,
          excludedDates: [],
          makeupSaturdays: [],
        },
        demands,
        unavailability,
        options: { timeoutMs: 1000 },
      });

      assert.ok(!result.ok, 'Six pairs for the same participants must never be accepted');
    });
  }

  test('counts parallel group lessons separately from a shared stream lecture', () => {
    const groupIds = ['group-1', 'group-2', 'group-3'];
    const demands: TeachingDemand[] = [{ ...demand, groupIds, streamId: 'stream' }];

    for (const [index, groupId] of groupIds.entries()) {
      for (const teachingType of [
        TIMETABLE_TEACHING_TYPE.PRACTICAL,
        TIMETABLE_TEACHING_TYPE.LABORATORY,
      ]) {
        demands.push({
          ...demand,
          id: `${groupId}-${teachingType}`,
          teachingType,
          groupIds: [groupId],
          teacherId: `group-teacher-${index}`,
        });
      }
    }

    const fixedEvents = Array.from({ length: 5 }, (_, day) =>
      Array.from({ length: 5 }, (_, pair) => ({
        ...demand,
        groupIds,
        id: `fixed-${day}-${pair}`,
        teachingAssignmentId: 'fixed',
        disciplineTitle: 'Other teaching',
        teacherId: 'outside-teacher',
        date: new Date(Date.parse('2026-09-07') + day * 86400000).toISOString().slice(0, 10),
        pair: pair + 1,
      })),
    )
      .flat()
      .filter((event) => event.date !== '2026-09-07' || event.pair > 3);
    const result = generateTimetableCandidates({
      calendar: {
        startDate: '2026-09-07',
        teachingWeeks: 14,
        excludedDates: [],
        makeupSaturdays: [],
      },
      demands,
      fixedEvents,
    });

    assert.ok(result.ok, JSON.stringify(result.diagnostics));
    assert.equal(result.candidates[0].events.length, 112);

    for (const date of result.candidates[0].automaticMakeupDates ?? []) {
      const events = result.candidates[0].events.filter((event) => event.date === date);

      assert.equal(events.length, 7);

      for (const groupId of groupIds) {
        assert.equal(events.filter((event) => event.groupIds.includes(groupId)).length, 3);
      }
    }
  });

  test('generates the dense three-group workload within the portal budget', () => {
    const result = generateTimetableCandidates({
      ...denseTimetable,
      options: { maxCandidates: 3, timeoutMs: 5000 },
    });

    assert.ok(result.ok, JSON.stringify(result.diagnostics));
    assert.equal(result.candidates[0].events.length, 430);

    for (const demand of denseTimetable.demands) {
      assert.equal(
        result.candidates[0].events.filter((event) => event.teachingAssignmentId === demand.id)
          .length,
        demand.academicHours / 2,
      );
    }
  });

  test('allows Saturday-only compensation on explicitly configured makeup Saturdays', () => {
    const result = generateTimetableCandidates({
      calendar: {
        startDate: '2026-09-07',
        teachingWeeks: 14,
        excludedDates: [],
        makeupSaturdays: Array.from({ length: 14 }, (_, week) => ({
          date: new Date(Date.parse('2026-09-12') + week * 7 * 86400000).toISOString().slice(0, 10),
          followsWeekday: 1,
        })),
      },
      demands: [{ ...demand, academicHours: 24, isSaturdayOnly: true }],
    });

    assert.ok(result.ok);
    assert.equal(result.candidates[0].events.length, 12);
    assert.deepEqual(result.candidates[0].automaticMakeupDays, []);
    assert.deepEqual(result.candidates[0].automaticMakeupDates, []);
    assert.ok(result.candidates[0].events.every((event) => new Date(event.date).getUTCDay() === 6));
  });

  for (const academicHours of [24, 32]) {
    test(`credits an explicit Saturday for a mixed-parity ${academicHours}h pattern`, () => {
      const result = generateTimetableCandidates({
        calendar: {
          startDate: '2026-09-07',
          teachingWeeks: 15,
          excludedDates: [],
          makeupSaturdays: [{ date: '2026-09-12', followsWeekday: 1 }],
        },
        demands: [{ ...demand, academicHours, order: TIMETABLE_PHASE_ORDER.ALTERNATING_FIRST }],
        preferences: [
          {
            teacherId: 'teacher',
            semesterCalendarId: 'semester',
            weekday: 1,
            pair: 1,
            preference: 'PREFERRED',
          },
        ],
      });

      assert.ok(result.ok);
      assert.equal(result.candidates[0].events.length, academicHours / 2);
      assert.deepEqual(result.candidates[0].automaticMakeupDays, []);
      assert.equal(
        result.candidates[0].events.filter((event) => event.date === '2026-09-12').length,
        1,
      );
    });
  }

  test('keeps a complete source day together and backtracks to later Saturdays', () => {
    const result = generateTimetableCandidates({
      calendar: {
        startDate: '2026-09-07',
        teachingWeeks: 14,
        excludedDates: [],
        makeupSaturdays: [],
      },
      demands: [
        demand,
        { ...demand, id: 'physics', disciplineTitle: 'Physics', teacherId: 'other' },
      ],
      preferences: [
        {
          teacherId: 'teacher',
          semesterCalendarId: 'semester',
          weekday: 1,
          pair: 1,
          preference: 'PREFERRED',
        },
        {
          teacherId: 'other',
          semesterCalendarId: 'semester',
          weekday: 1,
          pair: 2,
          preference: 'PREFERRED',
        },
      ],
      unavailability: [{ teacherId: 'teacher', date: '2026-09-12', pair: 1, isConfirmed: true }],
    });

    assert.ok(result.ok);
    const candidate = result.candidates[0];

    assert.equal(candidate.events.length, 32);
    assert.deepEqual(candidate.automaticMakeupDays, [
      { date: '2026-09-19', sourceDate: '2026-12-14' },
      { date: '2026-09-26', sourceDate: '2026-12-21' },
    ]);

    for (const { date } of candidate.automaticMakeupDays ?? []) {
      assert.deepEqual(
        candidate.events
          .filter((event) => event.date === date)
          .map((event) => event.pair)
          .sort(),
        [1, 2],
      );
    }
  });

  test('rejects too few Saturdays without splitting or dropping a source day', () => {
    const excludedDates = Array.from({ length: 13 }, (_, index) =>
      new Date(Date.parse('2026-09-19') + index * 7 * 86400000).toISOString().slice(0, 10),
    );
    const result = generateTimetableCandidates({
      calendar: { startDate: '2026-09-07', teachingWeeks: 14, excludedDates, makeupSaturdays: [] },
      demands: [demand],
    });

    assert.ok(!result.ok);
    assert.equal(result.error, 'NO_FEASIBLE_SOLUTION');
  });

  for (const teachingWeeks of [12, 13]) {
    test(`retains the existing compensation policy for ${teachingWeeks} weeks`, () => {
      const result = generateTimetableCandidates({
        calendar: {
          startDate: '2026-09-07',
          teachingWeeks,
          excludedDates: [],
          makeupSaturdays: [],
        },
        demands: [demand],
      });

      assert.ok(result.ok);
      assert.equal(result.candidates[0].events.length, 16);
      assert.equal(result.candidates[0].automaticMakeupDays, undefined);
    });
  }

  for (const teachingWeeks of [14, 15]) {
    test(`rotates all five weekdays in source-week order for ${teachingWeeks} weeks`, () => {
      const demands = Array.from({ length: 5 }, (_, index) => ({
        ...demand,
        id: `weekday-${index}`,
        teacherId: `teacher-${index}`,
        disciplineTitle: `Course ${index}`,
      }));
      const result = generateTimetableCandidates({
        calendar: {
          startDate: '2026-09-07',
          teachingWeeks,
          excludedDates: [],
          makeupSaturdays: [],
        },
        demands,
        preferences: demands.map((entry, index) => ({
          teacherId: entry.teacherId,
          semesterCalendarId: 'semester',
          weekday: index + 1,
          pair: 1,
          preference: 'PREFERRED' as const,
        })),
      });

      assert.ok(result.ok);
      const firstSource = teachingWeeks === 14 ? '2026-12-14' : '2026-12-21';
      const sourceDates = Array.from({ length: 16 - teachingWeeks }, (_, week) =>
        Array.from({ length: 5 }, (_, day) =>
          new Date(Date.parse(firstSource) + (week * 7 + day) * 86400000)
            .toISOString()
            .slice(0, 10),
        ),
      ).flat();

      assert.equal(result.candidates[0].events.length, 80);
      assert.deepEqual(
        result.candidates[0].automaticMakeupDays?.map((entry) => entry.sourceDate),
        sourceDates,
      );
    });

    test(`preserves pairs and source days over ${teachingWeeks} weeks`, () => {
      const result = generateTimetableCandidates({
        calendar: {
          startDate: '2026-09-07',
          teachingWeeks,
          excludedDates: [],
          makeupSaturdays: [],
        },
        demands: [demand],
      });

      assert.ok(result.ok);
      const candidate = result.candidates[0];

      assert.equal(candidate.events.length, 16);
      assert.equal(candidate.automaticMakeupDays?.length, 16 - teachingWeeks);
      assert.deepEqual(
        candidate.automaticMakeupDays?.map(({ sourceDate }) => sourceDate),
        teachingWeeks === 14 ? ['2026-12-14', '2026-12-21'] : ['2026-12-21'],
      );
      assert.ok(candidate.events.every((event) => event.pair === 1));
      assert.equal(new Set(candidate.events.map((event) => event.date)).size, 16);
    });
  }

  test('uses source denominator lessons on a numerator Saturday', () => {
    const result = generateTimetableCandidates({
      calendar: {
        startDate: '2026-09-07',
        teachingWeeks: 14,
        excludedDates: [],
        makeupSaturdays: [],
      },
      demands: [{ ...demand, academicHours: 16, parity: TIMETABLE_WEEK_PARITY.DENOMINATOR }],
    });

    assert.ok(result.ok);
    assert.equal(result.candidates[0].events.length, 8);
    assert.deepEqual(result.candidates[0].automaticMakeupDays, [
      { date: '2026-09-12', sourceDate: '2026-12-21' },
    ]);
  });

  test('skips excluded Saturdays without changing the source template', () => {
    const result = generateTimetableCandidates({
      calendar: {
        startDate: '2026-09-07',
        teachingWeeks: 15,
        excludedDates: ['2026-09-12'],
        makeupSaturdays: [],
      },
      demands: [demand],
    });

    assert.ok(result.ok);
    assert.deepEqual(result.candidates[0].automaticMakeupDays, [
      { date: '2026-09-19', sourceDate: '2026-12-21' },
    ]);
  });
});
