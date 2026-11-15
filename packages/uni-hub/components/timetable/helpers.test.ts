import { describe, expect, it } from 'vitest';
import {
  buildPreviewSlots,
  countDayEvents,
  getEventWeekday,
  getTeachingTypeKey,
  getSourceWeekParity,
} from './helpers';
import type { PreviewEvent } from './SchedulePreview.types';

const createEvent = (overrides: Partial<PreviewEvent>): PreviewEvent => ({
  id: 'event-1',
  teachingAssignmentId: 'assignment-1',
  disciplineTitle: 'Algorithms',
  teachingType: 'LECTURE',
  groupIds: ['group-1'],
  date: '2026-11-09',
  pair: 1,
  ...overrides,
});

describe('timetable preview helpers', () => {
  it('derives the weekday from the event date', () => {
    expect(getEventWeekday(createEvent({ date: '2026-11-09' }))).toBe(1);
    expect(getEventWeekday(createEvent({ date: '2026-11-14' }))).toBe(6);
    expect(getEventWeekday(createEvent({ date: '2026-11-15' }))).toBeNull();
  });

  it('places a multi-pair event into every pair it spans', () => {
    const slots = buildPreviewSlots([createEvent({ pairSpan: 2 })]);

    expect(slots.get('1-1')).toHaveLength(1);
    expect(slots.get('1-2')).toHaveLength(1);
    expect(countDayEvents(slots, 1)).toBe(2);
    expect(countDayEvents(slots, 2)).toBe(0);
  });

  it('maps API and UI teaching types to one key', () => {
    expect(getTeachingTypeKey('PRACTICAL')).toBe('practice');
    expect(getTeachingTypeKey('LABORATORY')).toBe('lab');
    expect(getTeachingTypeKey('SEMINAR')).toBe('seminar');
    expect(getTeachingTypeKey('LECTURE')).toBe('lecture');
  });
});

describe('source teaching-week parity', () => {
  it('derives parity from a missing day rather than its replacement Saturday', () => {
    expect(getSourceWeekParity('2026-12-21', '2026-09-07')).toBe('DENOMINATOR');
    expect(getSourceWeekParity('2026-12-14', '2026-09-07')).toBe('NUMERATOR');
    expect(getSourceWeekParity('2026-12-21', '2026-09-09')).toBe('NUMERATOR');
  });
});
