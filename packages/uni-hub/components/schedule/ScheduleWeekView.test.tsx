import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useToday } from '@uni-hub/hooks/useToday';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import { ScheduleWeekView } from './ScheduleWeekView';
import type { ScheduleEvent, ScheduleWeekViewProps } from './ScheduleView.types';

vi.mock('@uni-hub/hooks/useToday', () => ({
  useToday: vi.fn(),
}));

describe('ScheduleWeekView', () => {
  beforeEach(() => {
    localStorage.setItem('universe-lang', 'en');
    vi.mocked(useToday).mockReturnValue(new Date(2026, 4, 13));
  });

  const getTypeNameMock = (type: string): string => {
    switch (type) {
      case 'lecture':
        return 'Lecture';
      case 'lab':
        return 'Laboratory';
      case 'practice':
        return 'Practical class';
      case 'exam':
        return 'Exam';
      default:
        return 'Other';
    }
  };

  const createDefaultProps = (
    overrides?: Partial<ScheduleWeekViewProps>,
  ): ScheduleWeekViewProps => {
    const selectedDate = new Date(2026, 4, 15);

    return {
      selectedDate,
      onSelectDate: vi.fn(),
      getEventsForDate: () => [],
      locale: 'en-US',
      getTypeName: getTypeNameMock,
      ...overrides,
    };
  };

  const renderComponent = (props: ScheduleWeekViewProps) => {
    return render(
      <LanguageProvider>
        <ScheduleWeekView {...props} />
      </LanguageProvider>,
    );
  };

  it('should render week date range heading and previous/next week navigation buttons', () => {
    const props = createDefaultProps();

    renderComponent(props);

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('May 11 – May 17, 2026');
    expect(screen.getByRole('button', { name: /previous week/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next week/i })).toBeInTheDocument();
  });

  it('should call onSelectDate with -7 days when previous week button is clicked', async () => {
    const user = userEvent.setup();
    const onSelectDate = vi.fn();
    const props = createDefaultProps({ onSelectDate });

    renderComponent(props);

    const prevButton = screen.getByRole('button', { name: /previous week/i });

    await user.click(prevButton);

    expect(onSelectDate).toHaveBeenCalledTimes(1);
    expect(onSelectDate).toHaveBeenCalledWith(new Date(2026, 4, 8));
  });

  it('should call onSelectDate with +7 days when next week button is clicked', async () => {
    const user = userEvent.setup();
    const onSelectDate = vi.fn();
    const props = createDefaultProps({ onSelectDate });

    renderComponent(props);

    const nextButton = screen.getByRole('button', { name: /next week/i });

    await user.click(nextButton);

    expect(onSelectDate).toHaveBeenCalledTimes(1);
    expect(onSelectDate).toHaveBeenCalledWith(new Date(2026, 4, 22));
  });

  it('should render 7 week day cards for each day of the week', () => {
    const getEventsForDate = vi.fn(() => []);
    const props = createDefaultProps({ getEventsForDate });

    const { container } = renderComponent(props);

    const weekGrid = container.querySelector('[class*="weekGrid"]');
    const dayCards = weekGrid ? Array.from(weekGrid.children) : [];

    expect(weekGrid).toBeInTheDocument();
    expect(dayCards).toHaveLength(7);
    expect(getEventsForDate).toHaveBeenCalledTimes(7);

    const expectedWeekdays = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];

    expectedWeekdays.forEach((weekday) => {
      expect(screen.getByText(weekday)).toBeInTheDocument();
    });
  });

  it('should pass events and today indicator correctly to cards', () => {
    vi.mocked(useToday).mockReturnValue(new Date(2026, 4, 13));

    const lectureEvent: ScheduleEvent = {
      id: 'evt-1',
      title: 'Operating Systems',
      start: new Date(2026, 4, 11, 8, 30),
      end: new Date(2026, 4, 11, 9, 50),
      type: 'lecture',
      location: 'Aud. 204',
    };
    const getEventsForDate = vi.fn((date: Date) => {
      if (date.getDate() === 11 && date.getMonth() === 4) {
        return [lectureEvent];
      }

      return [];
    });
    const props = createDefaultProps({ getEventsForDate });

    const { container } = renderComponent(props);

    expect(screen.getByText(/Operating Systems/i)).toBeInTheDocument();
    expect(screen.getByText(/Lecture/i)).toBeInTheDocument();
    expect(screen.getByText(/Aud\. 204/i)).toBeInTheDocument();
    expect(screen.getByText(/08:30|8:30/)).toBeInTheDocument();

    const freeDayPlaceholders = screen.getAllByText('Free day');

    expect(freeDayPlaceholders).toHaveLength(6);

    const weekGrid = container.querySelector('[class*="weekGrid"]');
    const dayCards = weekGrid ? Array.from(weekGrid.children) : [];

    expect(dayCards).toHaveLength(7);
    expect(dayCards[2]?.className).toContain('today');
    expect(dayCards[0]?.className).not.toContain('today');
    expect(dayCards[1]?.className).not.toContain('today');
    expect(dayCards[3]?.className).not.toContain('today');
    expect(dayCards[4]?.className).not.toContain('today');
    expect(dayCards[5]?.className).not.toContain('today');
    expect(dayCards[6]?.className).not.toContain('today');
  });
});
