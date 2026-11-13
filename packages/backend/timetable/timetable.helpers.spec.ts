import { ForbiddenException } from '@nestjs/common';
import { Role } from '@universe/database';
import type { SemesterCalendar } from '@universe/database';
import {
  assertAdmin,
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
