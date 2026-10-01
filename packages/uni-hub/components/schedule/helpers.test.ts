import { describe, it, expect, vi } from 'vitest';
import {
  addDays,
  startOfWeek,
  isSameDay,
  getTypeTone,
  formatScheduleDate,
  formatScheduleTime,
  generateDummyEvents,
  generateICSContent,
  exportToICS,
} from './helpers';

import type { ScheduleEvent } from './ScheduleView.types';

describe('schedule helpers', () => {
  describe('addDays', () => {
    it('adds positive days correctly', () => {
      const baseDate = new Date(2026, 0, 15);
      const result = addDays(baseDate, 5);

      expect(result.getDate()).toBe(20);
      expect(result.getMonth()).toBe(0);
    });

    it('subtracts days when given a negative number', () => {
      const baseDate = new Date(2026, 0, 15);
      const result = addDays(baseDate, -5);

      expect(result.getDate()).toBe(10);
      expect(result.getMonth()).toBe(0);
    });

    it('crosses month and year boundaries properly', () => {
      const baseDate = new Date(2025, 11, 31);
      const result = addDays(baseDate, 1);

      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(1);
    });
  });

  describe('startOfWeek', () => {
    it('returns the preceding Monday for a midweek date', () => {
      // 2026-01-14 is a Wednesday
      const wednesday = new Date(2026, 0, 14, 14, 30);
      const monday = startOfWeek(wednesday);

      expect(monday.getDay()).toBe(1); // Monday
      expect(monday.getDate()).toBe(12);
      expect(monday.getHours()).toBe(0);
      expect(monday.getMinutes()).toBe(0);
      expect(monday.getSeconds()).toBe(0);
    });

    it('returns the same day at midnight when given a Monday', () => {
      // 2026-01-12 is a Monday
      const mondayInput = new Date(2026, 0, 12, 10, 0);
      const monday = startOfWeek(mondayInput);

      expect(monday.getDay()).toBe(1);
      expect(monday.getDate()).toBe(12);
      expect(monday.getHours()).toBe(0);
    });

    it('returns the Monday 6 days prior when given a Sunday', () => {
      // 2026-01-18 is a Sunday
      const sunday = new Date(2026, 0, 18, 12, 0);
      const monday = startOfWeek(sunday);

      expect(monday.getDay()).toBe(1);
      expect(monday.getDate()).toBe(12);
    });
  });

  describe('isSameDay', () => {
    it('returns true for dates with identical year, month, and day regardless of time', () => {
      const dateA = new Date(2026, 4, 10, 8, 30);
      const dateB = new Date(2026, 4, 10, 21, 45);

      expect(isSameDay(dateA, dateB)).toBe(true);
    });

    it('returns false for dates on different days', () => {
      const dateA = new Date(2026, 4, 10);
      const dateB = new Date(2026, 4, 11);

      expect(isSameDay(dateA, dateB)).toBe(false);
    });

    it('returns false for dates in different months or years', () => {
      const dateA = new Date(2025, 4, 10);
      const dateB = new Date(2026, 4, 10);

      expect(isSameDay(dateA, dateB)).toBe(false);
    });
  });

  describe('getTypeTone', () => {
    it('maps event types to corresponding tones', () => {
      expect(getTypeTone('lecture')).toBe('info');
      expect(getTypeTone('lab')).toBe('warning');
      expect(getTypeTone('practice')).toBe('success');
      expect(getTypeTone('exam')).toBe('danger');
      expect(getTypeTone('other')).toBe('default');
      expect(getTypeTone('unknown-type')).toBe('default');
    });
  });

  describe('formatScheduleDate and formatScheduleTime', () => {
    it('formats dates according to locale and format options', () => {
      const date = new Date(2026, 0, 15, 12, 0);
      const formatted = formatScheduleDate(date, { month: 'numeric', day: 'numeric' }, 'uk-UA');

      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
    });

    it('formats time to 2-digit hours and minutes', () => {
      const date = new Date(2026, 0, 15, 14, 5);
      const formatted = formatScheduleTime(date, 'en-US');

      expect(formatted).toMatch(/02:05|2:05|14:05/);
    });
  });

  describe('generateDummyEvents', () => {
    it('generates a populated list of schedule events including exams', () => {
      const events = generateDummyEvents();

      expect(events.length).toBeGreaterThan(0);

      const firstEvent = events[0];

      expect(firstEvent).toHaveProperty('id');
      expect(firstEvent).toHaveProperty('title');
      expect(firstEvent).toHaveProperty('start');
      expect(firstEvent).toHaveProperty('end');
      expect(firstEvent).toHaveProperty('type');
      expect(firstEvent).toHaveProperty('location');

      const examEvent = events.find((evt) => evt.type === 'exam');

      expect(examEvent).toBeDefined();
      expect(examEvent?.title).toContain('Іспит');
    });
  });

  describe('generateICSContent and exportToICS', () => {
    const sampleEvents: ScheduleEvent[] = [
      {
        id: 'test-event-1',
        title: 'Math Lecture',
        start: new Date('2026-02-01T08:30:00.000Z'),
        end: new Date('2026-02-01T10:05:00.000Z'),
        type: 'lecture',
        location: 'Room 101',
      },
    ];

    it('generates a valid iCalendar VCALENDAR string', () => {
      const ics = generateICSContent(sampleEvents);

      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('VERSION:2.0');
      expect(ics).toContain('BEGIN:VEVENT');
      expect(ics).toContain('UID:test-event-1@universemvp.tech');
      expect(ics).toContain('SUMMARY:Math Lecture');
      expect(ics).toContain('LOCATION:Room 101');
      expect(ics).toContain('END:VEVENT');
      expect(ics).toContain('END:VCALENDAR');
    });

    it('safely handles non-browser environment without throwing', () => {
      expect(() => exportToICS(sampleEvents)).not.toThrow();
    });

    it('triggers file download when window and document are defined', () => {
      const clickMock = vi.fn();
      const removeMock = vi.fn();
      const mockElement = {
        href: '',
        setAttribute: vi.fn(),
        click: clickMock,
        remove: removeMock,
      };

      const mockDocument = {
        body: {
          appendChild: vi.fn((node) => node),
        },
        createElement: vi.fn().mockReturnValue(mockElement),
      };

      const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
      const revokeObjectURLMock = vi.fn();

      vi.stubGlobal('document', mockDocument);
      vi.stubGlobal('window', {});
      vi.stubGlobal('URL', {
        createObjectURL: createObjectURLMock,
        revokeObjectURL: revokeObjectURLMock,
      });

      exportToICS(sampleEvents);

      expect(mockDocument.createElement).toHaveBeenCalledWith('a');
      expect(mockDocument.body.appendChild).toHaveBeenCalledWith(mockElement);
      expect(clickMock).toHaveBeenCalled();
      expect(removeMock).toHaveBeenCalled();
      expect(createObjectURLMock).toHaveBeenCalled();
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url');

      vi.unstubAllGlobals();
    });
  });
});
