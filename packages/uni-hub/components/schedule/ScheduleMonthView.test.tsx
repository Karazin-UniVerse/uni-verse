import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withLanguage } from '@uni-hub/utils/test-utils';
import { addDays, startOfWeek } from './helpers';
import { ScheduleMonthView } from './ScheduleMonthView';
import type { ScheduleEvent, ScheduleMonthViewProps } from './ScheduleView.types';

describe('ScheduleMonthView', () => {
  beforeEach(() => {
    localStorage.setItem('universe-lang', 'en');
  });

  const createDefaultProps = (
    overrides?: Partial<ScheduleMonthViewProps>,
  ): ScheduleMonthViewProps => {
    const selectedDate = new Date(2026, 4, 15);
    const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const gridStart = startOfWeek(monthStart);
    const monthDays: Date[] = [];

    for (let week = 0; week < 6; week += 1) {
      const weekMonday = addDays(gridStart, week * 7);

      for (let dayIndex = 0; dayIndex < 6; dayIndex += 1) {
        monthDays.push(addDays(weekMonday, dayIndex));
      }
    }

    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return {
      selectedDate,
      onSelectDate: vi.fn(),
      onSelectDayMode: vi.fn(),
      getEventsForDate: () => [],
      locale: 'en-US',
      weekdays,
      monthDays,
      getTypeName: (type: string) => type,
      ...overrides,
    };
  };

  const renderComponent = (props: ScheduleMonthViewProps) => {
    return render(withLanguage(<ScheduleMonthView {...props} />));
  };

  it('should render month title, navigation buttons, and weekdays header', () => {
    const props = createDefaultProps();

    renderComponent(props);

    expect(screen.getByRole('heading', { level: 3, name: 'May 2026' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeInTheDocument();

    props.weekdays.forEach((weekday) => {
      expect(screen.getByText(weekday)).toBeInTheDocument();
    });
  });

  it('should navigate to previous month when prev button is clicked', async () => {
    const user = userEvent.setup();
    const onSelectDate = vi.fn();
    const props = createDefaultProps({ onSelectDate });

    renderComponent(props);

    const prevButton = screen.getByRole('button', { name: 'Previous month' });

    await user.click(prevButton);

    expect(onSelectDate).toHaveBeenCalledTimes(1);
    expect(onSelectDate).toHaveBeenCalledWith(new Date(2026, 3, 1));
  });

  it('should navigate to next month when next button is clicked', async () => {
    const user = userEvent.setup();
    const onSelectDate = vi.fn();
    const props = createDefaultProps({ onSelectDate });

    renderComponent(props);

    const nextButton = screen.getByRole('button', { name: 'Next month' });

    await user.click(nextButton);

    expect(onSelectDate).toHaveBeenCalledTimes(1);
    expect(onSelectDate).toHaveBeenCalledWith(new Date(2026, 5, 1));
  });

  it('should render 36 day cells in month grid', () => {
    const mockEvents: ScheduleEvent[] = [
      {
        id: 'evt-1',
        title: 'Algorithms Lecture',
        start: new Date(2026, 4, 15, 8, 30),
        end: new Date(2026, 4, 15, 9, 50),
        type: 'lecture',
        location: 'Aud. 101',
      },
    ];
    const getEventsForDate = vi.fn((date: Date) =>
      date.getDate() === 15 && date.getMonth() === 4 ? mockEvents : [],
    );
    const props = createDefaultProps({ getEventsForDate });

    const { container } = renderComponent(props);

    const monthGrid = container.querySelector('[class*="monthGrid"]');

    expect(monthGrid).toBeInTheDocument();
    expect(monthGrid?.children).toHaveLength(36);
    expect(getEventsForDate).toHaveBeenCalledTimes(36);
    expect(screen.getByText('Algorithms Lecture')).toBeInTheDocument();
  });

  it('should handle clicking a day cell to select date and switch mode', async () => {
    const user = userEvent.setup();
    const onSelectDate = vi.fn();
    const onSelectDayMode = vi.fn();
    const props = createDefaultProps({ onSelectDate, onSelectDayMode });
    const targetDayIndex = 18;
    const targetDay = props.monthDays[targetDayIndex];

    const { container } = renderComponent(props);

    const monthGrid = container.querySelector('[class*="monthGrid"]');
    const dayButtons = monthGrid?.querySelectorAll('button') ?? [];

    expect(dayButtons).toHaveLength(36);

    await user.click(dayButtons[targetDayIndex]);

    expect(onSelectDate).toHaveBeenCalledTimes(1);
    expect(onSelectDate).toHaveBeenCalledWith(targetDay);
    expect(onSelectDayMode).toHaveBeenCalledTimes(1);
  });

  it('shows dots and the selected day list instead of titles on a phone', async () => {
    const user = userEvent.setup();
    const onSelectDate = vi.fn();
    const lecture: ScheduleEvent = {
      id: 'evt-3',
      title: 'Algorithms Lecture',
      start: new Date(2026, 4, 15, 8, 30),
      end: new Date(2026, 4, 15, 9, 50),
      type: 'lecture',
      location: 'Aud. 101',
    };
    const props = createDefaultProps({
      isCompact: true,
      onSelectDate,
      getEventsForDate: (date: Date) =>
        date.getDate() === 15 && date.getMonth() === 4 ? [lecture] : [],
    });

    renderComponent(props);

    const selectedDay = screen.getByRole('button', { name: 'May 15, classes: 1' });

    expect(selectedDay).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByText('Algorithms Lecture')).toHaveLength(1);
    expect(screen.getByText('Classes: 1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'May 16, classes: 0' }));

    expect(onSelectDate).toHaveBeenCalledWith(new Date(2026, 4, 16));
    expect(props.onSelectDayMode).not.toHaveBeenCalled();
  });
});
