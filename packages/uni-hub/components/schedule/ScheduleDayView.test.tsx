import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withLanguage } from '@uni-hub/utils/test-utils';
import { ScheduleDayView } from './ScheduleDayView';
import type { ScheduleDayViewProps, ScheduleEvent } from './ScheduleView.types';

describe('ScheduleDayView', () => {
  const selectedDate = new Date(2026, 4, 15, 10, 0); // Friday, May 15, 2026

  const sampleEvents: ScheduleEvent[] = [
    {
      id: 'event-1',
      title: 'Паралельні обчислення',
      start: new Date(2026, 4, 15, 8, 30),
      end: new Date(2026, 4, 15, 9, 50),
      type: 'lecture',
      location: 'Ауд. 6-45',
    },
    {
      id: 'event-2',
      title: 'Бази даних',
      start: new Date(2026, 4, 15, 10, 10),
      end: new Date(2026, 4, 15, 11, 30),
      type: 'lab',
      location: 'Лаб. 3-12',
    },
  ];

  const getTypeNameMock = (type: string): string => {
    switch (type) {
      case 'lecture':
        return 'Лекція';
      case 'lab':
        return 'Лабораторна робота';
      case 'practice':
        return 'Практичне заняття';
      case 'exam':
        return 'Іспит';
      default:
        return 'Інше';
    }
  };

  const renderComponent = (props: Partial<ScheduleDayViewProps> = {}) => {
    const defaultProps: ScheduleDayViewProps = {
      selectedDate,
      onSelectDate: vi.fn(),
      getEventsForDate: () => sampleEvents,
      locale: 'uk-UA',
      weekdays: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
      getTypeName: getTypeNameMock,
      ...props,
    };

    return render(withLanguage(<ScheduleDayView {...defaultProps} />));
  };

  it('should render day schedule title and navigation buttons', () => {
    renderComponent();

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(/Розклад на/i);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('2026');
    expect(screen.getByRole('button', { name: /попередній день/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /наступний день/i })).toBeInTheDocument();
  });

  it('should call onSelectDate with previous day when prev button is clicked', async () => {
    const user = userEvent.setup();
    const onSelectDate = vi.fn();

    renderComponent({ onSelectDate });

    const prevButton = screen.getByRole('button', { name: /попередній день/i });

    await user.click(prevButton);

    expect(onSelectDate).toHaveBeenCalledTimes(1);
    expect(onSelectDate).toHaveBeenCalledWith(new Date(2026, 4, 14, 10, 0));
  });

  it('should call onSelectDate with next day when next button is clicked', async () => {
    const user = userEvent.setup();
    const onSelectDate = vi.fn();

    renderComponent({ onSelectDate });

    const nextButton = screen.getByRole('button', { name: /наступний день/i });

    await user.click(nextButton);

    expect(onSelectDate).toHaveBeenCalledTimes(1);
    expect(onSelectDate).toHaveBeenCalledWith(new Date(2026, 4, 16, 10, 0));
  });

  it('should render list of schedule events with time, title, and type tag', () => {
    renderComponent({ getEventsForDate: () => sampleEvents });

    expect(screen.getByText('Паралельні обчислення')).toBeInTheDocument();
    expect(screen.getByText('Бази даних')).toBeInTheDocument();
    expect(screen.getByText('Ауд. 6-45')).toBeInTheDocument();
    expect(screen.getByText('Лаб. 3-12')).toBeInTheDocument();
    expect(screen.getByText('Лекція')).toBeInTheDocument();
    expect(screen.getByText('Лабораторна робота')).toBeInTheDocument();
    const timeline = within(screen.getByRole('list'));

    expect(timeline.getByText(/08:30/)).toBeInTheDocument();
    expect(timeline.getByText(/09:50/)).toBeInTheDocument();
    expect(timeline.getByText(/10:10/)).toBeInTheDocument();
    expect(timeline.getByText(/11:30/)).toBeInTheDocument();
  });

  it('should render empty state when events list is empty', () => {
    renderComponent({ getEventsForDate: () => [] });

    expect(screen.getByText(/на цей день занять немає/i)).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('should not render clickable link when meetingUrl has unsafe protocol', () => {
    const eventsWithUnsafeUrl: ScheduleEvent[] = [
      {
        id: 'event-unsafe',
        title: 'XSS attempt',
        start: new Date(2026, 4, 15, 8, 30),
        end: new Date(2026, 4, 15, 9, 50),
        type: 'lecture',
        location: 'Дистанційно',
        meetingUrl: "javascript:alert('pwned')",
      },
    ];

    renderComponent({ getEventsForDate: () => eventsWithUnsafeUrl });

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText(/приєднатися до заняття/i)).toBeInTheDocument();
  });

  it('should render clickable link when meetingUrl is safe https', () => {
    const eventsWithSafeUrl: ScheduleEvent[] = [
      {
        id: 'event-safe',
        title: 'Safe meet',
        start: new Date(2026, 4, 15, 8, 30),
        end: new Date(2026, 4, 15, 9, 50),
        type: 'lecture',
        location: 'Дистанційно',
        meetingUrl: 'https://meet.google.com/abc-defg-hij',
      },
    ];

    renderComponent({ getEventsForDate: () => eventsWithSafeUrl });

    const link = screen.getByRole('link', { name: /приєднатися до заняття/i });

    expect(link).toHaveAttribute('href', 'https://meet.google.com/abc-defg-hij');
  });

  it('summarises the number of pairs and the span of the day', () => {
    renderComponent();

    const summary = screen.getByText('Пар за день').closest('dl');

    expect(summary).toHaveTextContent('2');
    expect(summary).toHaveTextContent('08:30–11:30');
  });
});
