import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BREAKPOINTS } from '@core/constants/breakpoints';
import { withLanguage, withToast } from '@uni-hub/utils/test-utils';
import { timetableApi } from '@uni-hub/services/api.timetable';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { DUMMY_EVENTS, exportToICS } from './helpers';
import { ScheduleView } from './ScheduleView';
import type { ScheduleEvent, ScheduleViewProps } from './ScheduleView.types';

vi.mock('../../hooks/useMediaQuery', () => ({
  useMediaQuery: vi.fn(),
}));

vi.mock('./helpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./helpers')>();

  return {
    ...actual,
    exportToICS: vi.fn(),
  };
});

describe('ScheduleView component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMediaQuery).mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderScheduleView = (props?: Partial<ScheduleViewProps>) =>
    render(withToast(withLanguage(<ScheduleView {...props} />)));

  it('should render schedule view in default month mode on desktop', () => {
    vi.mocked(useMediaQuery).mockReturnValue(false);

    renderScheduleView();

    const monthRadio = screen.getByRole('radio', { name: /^(місяць|month)$/i });
    const weekRadio = screen.getByRole('radio', { name: /^(тиждень|week)$/i });
    const dayRadio = screen.getByRole('radio', { name: /^(день|day)$/i });

    expect(useMediaQuery).toHaveBeenCalledWith('less', BREAKPOINTS.md);
    expect(monthRadio).toBeChecked();
    expect(weekRadio).not.toBeChecked();
    expect(dayRadio).not.toBeChecked();
    expect(
      screen.getByRole('button', { name: /попередній місяць|previous month/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /наступний місяць|next month/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /попередній день|previous day/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /попередній тиждень|previous week/i }),
    ).not.toBeInTheDocument();
  });

  it('should switch to week view when week mode is selected in toolbar', async () => {
    const user = userEvent.setup();

    renderScheduleView();

    const weekRadio = screen.getByRole('radio', { name: /^(тиждень|week)$/i });

    await user.click(weekRadio);

    expect(weekRadio).toBeChecked();
    expect(screen.getByRole('radio', { name: /^(місяць|month)$/i })).not.toBeChecked();
    expect(
      screen.getByRole('button', { name: /попередній тиждень|previous week/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /наступний тиждень|next week/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /попередній місяць|previous month/i }),
    ).not.toBeInTheDocument();
  });

  it('should switch to day view when day mode is selected in toolbar', async () => {
    const user = userEvent.setup();

    renderScheduleView();

    const dayRadio = screen.getByRole('radio', { name: /^(день|day)$/i });

    await user.click(dayRadio);

    expect(dayRadio).toBeChecked();
    expect(screen.getByRole('radio', { name: /^(місяць|month)$/i })).not.toBeChecked();
    expect(
      screen.getByRole('button', { name: /попередній день|previous day/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /наступний день|next day/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /попередній місяць|previous month/i }),
    ).not.toBeInTheDocument();
  });

  it('should default to day view when viewport is mobile (breakpoint md)', () => {
    vi.mocked(useMediaQuery).mockReturnValue(true);

    renderScheduleView();

    const dayRadio = screen.getByRole('radio', { name: /^(день|day)$/i });
    const monthRadio = screen.getByRole('radio', { name: /^(місяць|month)$/i });

    expect(useMediaQuery).toHaveBeenCalledWith('less', BREAKPOINTS.md);
    expect(dayRadio).toBeChecked();
    expect(monthRadio).not.toBeChecked();
    expect(
      screen.getByRole('button', { name: /попередній день|previous day/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /наступний день|next day/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /попередній місяць|previous month/i }),
    ).not.toBeInTheDocument();
  });

  it('should trigger exportToICS when export button is clicked', async () => {
    const user = userEvent.setup();

    renderScheduleView();

    const exportButton = screen.getByRole('button', { name: /експорт|export/i });

    await user.click(exportButton);

    expect(exportToICS).toHaveBeenCalledTimes(1);
    expect(exportToICS).toHaveBeenCalledWith(DUMMY_EVENTS);
  });

  it('should switch to day view when a day cell is clicked in month view', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 4, 10));

    const user = userEvent.setup();

    renderScheduleView();

    const dayCells = screen.getAllByRole('button', { name: /15/ });

    await user.click(dayCells[0]);

    expect(screen.getByRole('radio', { name: /^(день|day)$/i })).toBeChecked();
    expect(
      screen.getByRole('button', { name: /попередній день|previous day/i }),
    ).toBeInTheDocument();
  });

  it('should open subscription modal when subscribe button is clicked', async () => {
    vi.spyOn(timetableApi, 'createSubscriptionToken').mockResolvedValue({
      data: { id: 'tok-1', userId: 'user-1', token: 'mock-token-abc' },
    });
    const user = userEvent.setup();

    renderScheduleView();

    const subscribeButton = screen.getByRole('button', { name: /підписка на календар/i });

    await user.click(subscribeButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /копіювати/i })).toBeInTheDocument();
  });

  it('should render meeting URL link for online events', async () => {
    const testDate = new Date(new Date().setHours(10, 10, 0, 0));
    const customEvents: ScheduleEvent[] = [
      {
        id: 'evt-online-1',
        title: 'Теорія алгоритмів',
        start: testDate,
        end: new Date(testDate.getTime() + 80 * 60 * 1000),
        type: 'lecture',
        location: 'Дистанційно',
        meetingUrl: 'https://meet.google.com/test-meet',
        teachingAssignmentId: 'assign-1',
      },
    ];
    const user = userEvent.setup();

    renderScheduleView({ events: customEvents, isTeacher: false });

    const dayRadio = screen.getByRole('radio', { name: /^(день|day)$/i });

    await user.click(dayRadio);

    const meetingLink = screen.getByRole('link', { name: /приєднатися до заняття/i });

    expect(meetingLink).toHaveAttribute('href', 'https://meet.google.com/test-meet');
  });

  it('should allow teacher to edit meeting URL via modal', async () => {
    const updateSpy = vi.spyOn(timetableApi, 'updateMeetingUrl').mockResolvedValue({
      data: {
        id: 'assign-1',
        curriculumPlanId: 'plan-1',
        disciplineTitle: 'Теорія алгоритмів',
        teachingType: 'LECTURE',
        academicHours: 32,
        teacherId: 'teacher-1',
        isSaturdayOnly: false,
        hasLateSlotAuthorization: false,
        meetingUrl: 'https://zoom.us/j/999999',
      },
    });

    const testDate = new Date(new Date().setHours(10, 10, 0, 0));
    const customEvents: ScheduleEvent[] = [
      {
        id: 'evt-editable-1',
        title: 'Теорія алгоритмів',
        start: testDate,
        end: new Date(testDate.getTime() + 80 * 60 * 1000),
        type: 'lecture',
        location: 'Дистанційно',
        teachingAssignmentId: 'assign-1',
      },
    ];
    const user = userEvent.setup();

    renderScheduleView({ events: customEvents, isTeacher: true });

    const dayRadio = screen.getByRole('radio', { name: /^(день|day)$/i });

    await user.click(dayRadio);

    const editBtn = screen.getByRole('button', { name: /змінити посилання/i });

    await user.click(editBtn);

    const input = screen.getByPlaceholderText(/https:\/\/meet\.google\.com/i);

    await user.clear(input);
    await user.type(input, 'https://zoom.us/j/999999');

    const saveBtn = screen.getByRole('button', { name: /зберегти/i });

    await user.click(saveBtn);

    expect(updateSpy).toHaveBeenCalledWith('assign-1', 'https://zoom.us/j/999999');
  });

  it('should show error message and not set fallback URL when createSubscriptionToken fails', async () => {
    vi.spyOn(timetableApi, 'createSubscriptionToken').mockRejectedValue(new Error('Network error'));
    const user = userEvent.setup();

    renderScheduleView();

    const subscribeButton = screen.getByRole('button', { name: /підписка на календар/i });

    await user.click(subscribeButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getAllByText(/не вдалося створити посилання для підписки/i).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByDisplayValue(/feed\/personal/i)).not.toBeInTheDocument();
  });

  it('should not update event and show error when updateMeetingUrl fails', async () => {
    vi.spyOn(timetableApi, 'updateMeetingUrl').mockRejectedValue(new Error('Update failed'));

    const testDate = new Date(new Date().setHours(10, 10, 0, 0));
    const customEvents: ScheduleEvent[] = [
      {
        id: 'evt-fail-1',
        title: 'Теорія алгоритмів',
        start: testDate,
        end: new Date(testDate.getTime() + 80 * 60 * 1000),
        type: 'lecture',
        location: 'Дистанційно',
        teachingAssignmentId: 'assign-fail',
      },
    ];
    const user = userEvent.setup();

    renderScheduleView({ events: customEvents, isTeacher: true });

    const dayRadio = screen.getByRole('radio', { name: /^(день|day)$/i });

    await user.click(dayRadio);

    const editBtn = screen.getByRole('button', { name: /змінити посилання/i });

    await user.click(editBtn);

    const input = screen.getByPlaceholderText(/https:\/\/meet\.google\.com/i);

    await user.clear(input);
    await user.type(input, 'https://zoom.us/j/123456');

    const saveBtn = screen.getByRole('button', { name: /зберегти/i });

    await user.click(saveBtn);

    expect(screen.getAllByText(/не вдалося оновити посилання на заняття/i).length).toBeGreaterThan(
      0,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should have closeLabel on subscription modal', async () => {
    vi.spyOn(timetableApi, 'createSubscriptionToken').mockResolvedValue({
      data: { id: 'tok-1', userId: 'user-1', token: 'mock-token' },
    });
    const user = userEvent.setup();

    renderScheduleView();

    const subscribeButton = screen.getByRole('button', { name: /підписка на календар/i });

    await user.click(subscribeButton);

    const closeButtons = screen.getAllByRole('button', { name: /закрити/i });

    expect(closeButtons.length).toBeGreaterThan(0);
  });
});
