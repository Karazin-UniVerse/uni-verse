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
    const monthDays = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return {
      selectedDate,
      onSelectDate: vi.fn(),
      onSelectDayMode: vi.fn(),
      getEventsForDate: () => [],
      locale: 'en-US',
      weekdays,
      monthDays,
      ...overrides,
    };
  };

  const renderComponent = (props: ScheduleMonthViewProps) => {
    return render(
      withLanguage(<ScheduleMonthView {...props} />),
    );
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

  it('should render 42 day cells in month grid', () => {
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
    expect(monthGrid?.children).toHaveLength(42);
    expect(getEventsForDate).toHaveBeenCalledTimes(42);
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

    expect(dayButtons).toHaveLength(42);

    await user.click(dayButtons[targetDayIndex]);

    expect(onSelectDate).toHaveBeenCalledTimes(1);
    expect(onSelectDate).toHaveBeenCalledWith(targetDay);
    expect(onSelectDayMode).toHaveBeenCalledTimes(1);
  });
});
