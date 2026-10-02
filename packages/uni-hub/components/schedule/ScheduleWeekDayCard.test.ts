import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ScheduleWeekDayCard } from './ScheduleWeekDayCard';

import type { ScheduleEvent } from './ScheduleView.types';

describe('ScheduleWeekDayCard', () => {
  const dummyDate = new Date(2026, 0, 15, 12, 0); // Thursday, Jan 15, 2026

  const sampleEvents: ScheduleEvent[] = [
    {
      id: 'event-1',
      title: 'Higher Mathematics',
      start: new Date(2026, 0, 15, 8, 30),
      end: new Date(2026, 0, 15, 10, 5),
      type: 'lecture',
      location: 'Aud. 302',
    },
    {
      id: 'event-2',
      title: 'Computer Networks',
      start: new Date(2026, 0, 15, 10, 15),
      end: new Date(2026, 0, 15, 11, 50),
      type: 'lab',
      location: 'Lab 4',
    },
  ];

  it('renders events list with title, location, and type name', () => {
    const html = renderToString(
      React.createElement(ScheduleWeekDayCard, {
        day: dummyDate,
        events: sampleEvents,
        isToday: false,
        locale: 'uk-UA',
        getTypeName: (type) => (type === 'lecture' ? 'Лекція' : 'Лабораторна'),
      }),
    );

    expect(html).toContain('Higher Mathematics');
    expect(html).toContain('Aud. 302');
    expect(html).toContain('Лекція');
    expect(html).toContain('Computer Networks');
    expect(html).toContain('Lab 4');
    expect(html).toContain('Лабораторна');
  });

  it('renders free day placeholder when no events are scheduled', () => {
    const html = renderToString(
      React.createElement(ScheduleWeekDayCard, {
        day: dummyDate,
        events: [],
        isToday: false,
        locale: 'uk-UA',
        getTypeName: () => '',
      }),
    );

    expect(html).toContain('Вільний день');
  });

  it('adds today highlighting class when isToday is true', () => {
    const html = renderToString(
      React.createElement(ScheduleWeekDayCard, {
        day: dummyDate,
        events: [],
        isToday: true,
        locale: 'uk-UA',
        getTypeName: () => '',
      }),
    );

    expect(html).toContain('today');
  });
});
