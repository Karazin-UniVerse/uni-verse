import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Role } from '@universe/database';
import type { SemesterCalendar } from '@universe/database';
import {
  assertAdmin,
  parseAutomaticMakeupDays,
  parseMakeupSaturdayDates,
  parseMakeupSaturdays,
} from './timetable.helpers';

describe('assertAdmin', () => {
  it('passes for admins', () => {
    expect(() => assertAdmin([Role.ADMIN])).not.toThrow();
  });

  it.each([undefined, [], [Role.INSTRUCTOR]])(
    'rejects non-admin roles %p',
    (roles) => {
      expect(() => assertAdmin(roles)).toThrow(ForbiddenException);
    },
  );
});

describe('parseMakeupSaturdays', () => {
  it('combines manual and version-specific automatic dates without changing the calendar', () => {
    expect(parseMakeupSaturdayDates(null, ['2026-09-12'])).toEqual(
      new Set(['2026-09-12']),
    );
    expect(parseMakeupSaturdayDates(null)).toEqual(new Set());
  });
  const calendar = {
    makeupSaturdays: [
      { date: '2027-10-09', followsWeekday: 3 },
      { date: '2027-10-16' },
      { followsWeekday: 2 },
    ],
  } as unknown as SemesterCalendar;

  it('keeps the real followsWeekday and defaults to Monday', () => {
    expect(parseMakeupSaturdays(calendar)).toEqual([
      { date: '2027-10-09', followsWeekday: 3 },
      { date: '2027-10-16', followsWeekday: 1 },
    ]);
    expect(parseMakeupSaturdayDates(calendar)).toEqual(
      new Set(['2027-10-09', '2027-10-16']),
    );
  });

  it('returns nothing without a calendar', () => {
    expect(parseMakeupSaturdays(null)).toEqual([]);
  });
});

describe('parseAutomaticMakeupDays', () => {
  it('reloads valid source dates without taking the target week parity', () => {
    const entries = [{ date: '2026-09-12', sourceDate: '2026-12-21' }];

    expect(parseAutomaticMakeupDays(entries)).toEqual(entries);
    expect(parseAutomaticMakeupDays([])).toEqual([]);
    expect(parseAutomaticMakeupDays()).toEqual([]);
  });

  it.each([
    null,
    { date: '2026-09-12' },
    [{ date: '2026-09-12', sourceDate: '2026-12-27' }],
    [{ date: '2026-09-14', sourceDate: '2026-12-21' }],
    [{ date: '2026-02-30', sourceDate: '2026-12-21' }],
    [
      { date: '2026-09-12', sourceDate: '2026-12-21' },
      { date: '2026-09-12', sourceDate: '2026-12-22' },
    ],
  ])('rejects malformed or duplicate saved templates %p', (value) => {
    expect(() => parseAutomaticMakeupDays(value)).toThrow(ConflictException);
  });
});
