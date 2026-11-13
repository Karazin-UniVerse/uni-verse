import assert from 'node:assert/strict';
import test from 'node:test';
import { RESCHEDULE_SCOPE, TIMETABLE_TEACHING_TYPE } from '../../constants/timetable.ts';
import type { ScheduledEvent } from '../../types/timetable.ts';
import { buildRescheduleChanges } from '../timetable-rescheduling.ts';

const event: ScheduledEvent = {
  id: 'selected',
  teachingAssignmentId: 'assignment',
  disciplineTitle: 'Calculus',
  teachingType: TIMETABLE_TEACHING_TYPE.LECTURE,
  teacherId: 'teacher',
  groupIds: ['group'],
  date: '2026-10-19',
  pair: 1,
  pairSpan: 1,
};

const calendar = {
  startDate: '2026-09-07',
  teachingWeeks: 16,
  excludedDates: [],
  makeupSaturdays: [],
};

test('series preserves alternating intervals across DST and excludes other weekly slots', () => {
  const result = buildRescheduleChanges({
    eventId: event.id,
    events: [
      { ...event, id: 'earlier', date: '2026-10-05' },
      event,
      { ...event, id: 'next', date: '2026-11-02' },
      { ...event, id: 'other-slot', date: '2026-10-20' },
      { ...event, id: 'other-pair', pair: 2 },
    ],
    newDate: '2026-10-20',
    newPair: 3,
    scope: RESCHEDULE_SCOPE.SERIES,
    calendar,
    now: new Date('2026-10-01T00:00:00Z'),
  });

  assert.deepEqual(result, {
    ok: true,
    changes: [
      { eventId: 'selected', oldDate: '2026-10-19', oldPair: 1, newDate: '2026-10-20', newPair: 3 },
      { eventId: 'next', oldDate: '2026-11-02', oldPair: 1, newDate: '2026-11-03', newPair: 3 },
    ],
  });
});

test('single move affects only the selected occurrence', () => {
  const result = buildRescheduleChanges({
    eventId: event.id,
    events: [event, { ...event, id: 'next', date: '2026-11-02' }],
    newDate: '2026-10-20',
    newPair: 3,
    scope: RESCHEDULE_SCOPE.ONCE,
    calendar,
    now: new Date('2026-10-01T00:00:00Z'),
  });

  assert.ok(result.ok);
  assert.equal(result.changes.length, 1);
});

test('rejects the complete series when the last target exceeds the semester', () => {
  const result = buildRescheduleChanges({
    eventId: event.id,
    events: [event, { ...event, id: 'last', date: '2026-12-21' }],
    newDate: '2026-10-26',
    newPair: 2,
    scope: RESCHEDULE_SCOPE.SERIES,
    calendar,
    now: new Date('2026-10-01T00:00:00Z'),
  });

  assert.deepEqual(result, { ok: false, error: 'OUTSIDE_CALENDAR' });
});

test('rejects moving an occurrence that has started in Kyiv', () => {
  const result = buildRescheduleChanges({
    eventId: event.id,
    events: [event],
    newDate: '2026-10-20',
    newPair: 2,
    scope: RESCHEDULE_SCOPE.ONCE,
    calendar,
    now: new Date('2026-10-19T05:30:00Z'),
  });

  assert.deepEqual(result, { ok: false, error: 'STARTED_EVENT' });
});

test('rejects no-op, excluded dates, Sundays and overflowing pair spans', () => {
  const params = {
    eventId: event.id,
    events: [event],
    newDate: '2026-10-20',
    newPair: 2,
    scope: RESCHEDULE_SCOPE.ONCE,
    calendar,
    now: new Date('2026-10-01T00:00:00Z'),
  };

  assert.deepEqual(
    buildRescheduleChanges({ ...params, newDate: event.date, newPair: event.pair }),
    {
      ok: false,
      error: 'NO_CHANGE',
    },
  );
  assert.deepEqual(buildRescheduleChanges({ ...params, newDate: '2026-10-25' }), {
    ok: false,
    error: 'OUTSIDE_CALENDAR',
  });
  assert.deepEqual(
    buildRescheduleChanges({
      ...params,
      calendar: { ...calendar, excludedDates: [params.newDate] },
    }),
    {
      ok: false,
      error: 'OUTSIDE_CALENDAR',
    },
  );
  assert.deepEqual(
    buildRescheduleChanges({ ...params, events: [{ ...event, pairSpan: 2 }], newPair: 7 }),
    {
      ok: false,
      error: 'INVALID_TARGET',
    },
  );
  assert.deepEqual(
    buildRescheduleChanges({
      ...params,
      newDate: '2027-01-02',
      calendar: { ...calendar, makeupSaturdays: [{ date: '2027-01-02', followsWeekday: 1 }] },
    }),
    {
      ok: false,
      error: 'OUTSIDE_CALENDAR',
    },
  );
});
