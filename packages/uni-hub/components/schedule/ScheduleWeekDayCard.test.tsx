import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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

  it('should render events list with title, location, and type name', () => {
    render(
      <ScheduleWeekDayCard
        day={dummyDate}
        events={sampleEvents}
        isToday={false}
        locale="uk-UA"
        getTypeName={(type) => (type === 'lecture' ? 'Лекція' : 'Лабораторна')}
      />,
    );

    expect(screen.getByText(/Higher Mathematics/i)).toBeInTheDocument();
    expect(screen.getByText(/Aud\. 302/i)).toBeInTheDocument();
    expect(screen.getByText(/Лекція/i)).toBeInTheDocument();
    expect(screen.getByText(/Computer Networks/i)).toBeInTheDocument();
    expect(screen.getByText(/Lab 4/i)).toBeInTheDocument();
    expect(screen.getByText(/Лабораторна/i)).toBeInTheDocument();
  });

  it('should render free day placeholder when no events are scheduled', () => {
    render(
      <ScheduleWeekDayCard
        day={dummyDate}
        events={[]}
        isToday={false}
        locale="uk-UA"
        getTypeName={() => ''}
      />,
    );

    expect(screen.getByText('Вільний день')).toBeInTheDocument();
  });

  it('should add today highlighting class when isToday is true', () => {
    const { container } = render(
      <ScheduleWeekDayCard
        day={dummyDate}
        events={[]}
        isToday={true}
        locale="uk-UA"
        getTypeName={() => ''}
      />,
    );

    expect((container.firstChild as HTMLElement).className).toContain('today');
  });
});
