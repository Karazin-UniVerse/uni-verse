import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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

  it('should render day number and up to 3 event titles', () => {
    const events = createEvents(3);

    render(
      <ScheduleMonthDayCell
        day={dummyDate}
        events={events}
        inMonth={true}
        isToday={false}
        onSelect={() => {}}
      />,
    );

    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('Class 1')).toBeInTheDocument();
    expect(screen.getByText('Class 2')).toBeInTheDocument();
    expect(screen.getByText('Class 3')).toBeInTheDocument();
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it('should render +N badge when more than 3 events exist', () => {
    const events = createEvents(5);

    render(
      <ScheduleMonthDayCell
        day={dummyDate}
        events={events}
        inMonth={true}
        isToday={false}
        onSelect={() => {}}
      />,
    );

    expect(screen.getByText('Class 1')).toBeInTheDocument();
    expect(screen.getByText('Class 2')).toBeInTheDocument();
    expect(screen.getByText('Class 3')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('should apply outMonth class when inMonth is false', () => {
    const { container } = render(
      <ScheduleMonthDayCell
        day={dummyDate}
        events={[]}
        inMonth={false}
        isToday={false}
        onSelect={() => {}}
      />,
    );

    expect((container.firstChild as HTMLElement).className).toContain('outMonth');
  });

  it('should apply today class when isToday is true', () => {
    const { container } = render(
      <ScheduleMonthDayCell
        day={dummyDate}
        events={[]}
        inMonth={true}
        isToday={true}
        onSelect={() => {}}
      />,
    );

    expect((container.firstChild as HTMLElement).className).toContain('today');
  });
});
