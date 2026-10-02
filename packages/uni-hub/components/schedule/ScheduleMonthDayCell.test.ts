import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ScheduleMonthDayCell } from './ScheduleMonthDayCell';

import type { ScheduleEvent } from './ScheduleView.types';

describe('ScheduleMonthDayCell', () => {
  const dummyDate = new Date(2026, 4, 15); // May 15, 2026

  const createEvents = (count: number): ScheduleEvent[] =>
    Array.from({ length: count }, (_, idx) => ({
      id: `evt-${idx}`,
      title: `Class ${idx + 1}`,
      start: new Date(2026, 4, 15, 8 + idx, 30),
      end: new Date(2026, 4, 15, 9 + idx, 50),
      type: 'lecture',
      location: `Aud. ${idx + 1}`,
    }));

  it('renders day number and up to 3 event titles', () => {
    const events = createEvents(3);
    const html = renderToString(
      React.createElement(ScheduleMonthDayCell, {
        day: dummyDate,
        events,
        inMonth: true,
        isToday: false,
        onSelect: () => {},
      }),
    );

    expect(html).toContain('15');
    expect(html).toContain('Class 1');
    expect(html).toContain('Class 2');
    expect(html).toContain('Class 3');
    expect(html).not.toContain('+');
  });

  it('renders +N badge when more than 3 events exist', () => {
    const events = createEvents(5);
    const html = renderToString(
      React.createElement(ScheduleMonthDayCell, {
        day: dummyDate,
        events,
        inMonth: true,
        isToday: false,
        onSelect: () => {},
      }),
    );

    expect(html).toContain('Class 1');
    expect(html).toContain('Class 2');
    expect(html).toContain('Class 3');
    expect(html).toContain('+2');
  });

  it('applies outMonth class when inMonth is false', () => {
    const html = renderToString(
      React.createElement(ScheduleMonthDayCell, {
        day: dummyDate,
        events: [],
        inMonth: false,
        isToday: false,
        onSelect: () => {},
      }),
    );

    expect(html).toContain('outMonth');
  });

  it('applies today class when isToday is true', () => {
    const html = renderToString(
      React.createElement(ScheduleMonthDayCell, {
        day: dummyDate,
        events: [],
        inMonth: true,
        isToday: true,
        onSelect: () => {},
      }),
    );

    expect(html).toContain('today');
  });
});
