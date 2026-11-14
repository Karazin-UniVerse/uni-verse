import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import { useCurrentUser } from '@uni-hub/hooks/useCurrentUser';
import userEvent from '@testing-library/user-event';
import { BREAKPOINTS } from '@core/constants/breakpoints';
import { withLanguage, withQueryClient, withToast } from '@uni-hub/utils/test-utils';
import { timetableApi } from '@uni-hub/services/api.timetable';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { exportToICS } from './helpers';
import { ScheduleView } from './ScheduleView';
import type { ScheduleEvent, ScheduleViewProps } from './ScheduleView.types';

vi.mock('../../hooks/useMediaQuery', () => ({
  useMediaQuery: vi.fn(),
}));

vi.mock('@uni-hub/hooks/useCurrentUser', () => ({
  useCurrentUser: vi.fn(() => ({ userId: null, roles: [] })),
}));

vi.mock('./helpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./helpers')>();

  return {
    ...actual,
    exportToICS: vi.fn(),
  };
});

// The view shows the local day, so "today" must be the local date, not the UTC one.
const toLocalIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

describe('ScheduleView component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMediaQuery).mockReturnValue(false);
    vi.mocked(useCurrentUser).mockReturnValue({ userId: null, roles: [] });
    vi.spyOn(timetableApi, 'getMyScheduleEvents').mockResolvedValue({ data: [] });
    vi.spyOn(timetableApi, 'listRescheduleRequests').mockResolvedValue({
      data: { items: [], total: 0, page: 1, pageSize: 20 },
    });
    vi.spyOn(timetableApi, 'listPreferenceSemesters').mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderScheduleView = (props?: Partial<ScheduleViewProps>) =>
    render(withQueryClient(withToast(withLanguage(<ScheduleView {...props} />))));

  it('hides teacher slot preferences for non-instructor roles', () => {
    vi.mocked(useCurrentUser).mockReturnValue({ userId: 'admin', roles: ['ADMIN'] });

    renderScheduleView();

    expect(screen.queryByText(/Побажання щодо розкладу/i)).not.toBeInTheDocument();
  });

  it.each([
    { fails: false, week: false },
    { fails: true, week: false },
    { fails: false, week: true },
  ])('reschedules an admin event and reports conflicts (%o)', async ({ fails, week }) => {
    vi.mocked(useCurrentUser).mockReturnValue({ userId: 'admin', roles: ['ADMIN'] });
    vi.mocked(useMediaQuery).mockReturnValue(true);
    const todayIso = toLocalIsoDate(new Date());
    const initialEvent = {
      id: 'event-1',
      disciplineTitle: 'Algorithms',
      teachingType: 'LECTURE',
      date: todayIso,
      pair: 1,
      pairSpan: 1,
      groupCodes: ['Online'],
    };

    vi.spyOn(timetableApi, 'listRescheduleRequests').mockResolvedValue({
      data: { items: [], total: 0, page: 1, pageSize: 20 },
    });
    const getMyEvents = vi
      .spyOn(timetableApi, 'getMyScheduleEvents')
      .mockResolvedValueOnce({ data: [initialEvent] })
      .mockResolvedValue({
        data: [{ ...initialEvent, date: '2026-11-13', pair: 3 }],
      });
    const reschedule = vi.spyOn(timetableApi, 'rescheduleEvent');

    vi.spyOn(timetableApi, 'previewReschedule').mockResolvedValue({
      data: {
        changes: [
          {
            eventId: 'event-1',
            oldDate: todayIso,
            oldPair: 1,
            newDate: '2026-11-13',
            newPair: 3,
          },
        ],
      },
    });

    if (fails) {
      reschedule.mockRejectedValue(new Error('Teacher conflict (HTTP 409)'));
    } else {
      reschedule.mockResolvedValue({
        data: {
          changes: [
            {
              eventId: 'event-1',
              oldDate: todayIso,
              oldPair: 1,
              newDate: '2026-11-13',
              newPair: 3,
            },
          ],
        },
      });
    }

    const user = userEvent.setup();

    renderScheduleView();

    if (week) {
      await user.click(screen.getByRole('radio', { name: 'Тиждень' }));
    }

    await user.click(await screen.findByRole('button', { name: /Змінити посилання/i }));
    await user.click(screen.getByRole('button', { name: 'Перенести заняття' }));

    const dialog = screen.getByRole('dialog');

    await user.clear(within(dialog).getByLabelText('Нова дата'));
    await user.type(within(dialog).getByLabelText('Нова дата'), '2026-11-13');
    await user.selectOptions(within(dialog).getByLabelText('Пара'), '3');
    await user.type(within(dialog).getByLabelText('Причина'), 'Makeup');
    await user.click(within(dialog).getByRole('button', { name: 'Переглянути зміни' }));
    await user.click(
      await within(dialog).findByRole('button', { name: 'Підтвердити перенесення' }),
    );

    expect(reschedule).toHaveBeenCalledWith('event-1', {
      scope: 'ONCE',
      newDate: '2026-11-13',
      newPair: 3,
      reason: 'Makeup',
    });

    if (fails) {
      const alert = await within(dialog).findByRole('alert');

      expect(alert).toHaveTextContent('Перенесення створює конфлікт у розкладі');
      expect(alert).not.toHaveTextContent('Teacher conflict');
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    } else {
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      await waitFor(() => expect(getMyEvents).toHaveBeenCalledTimes(2));
      expect(await screen.findAllByText(/12:00/)).not.toHaveLength(0);
    }
  });

  it('allows an instructor to preview and submit a series reschedule request while keeping input on conflict', async () => {
    vi.mocked(useCurrentUser).mockReturnValue({ userId: 'teacher-1', roles: ['INSTRUCTOR'] });
    vi.mocked(useMediaQuery).mockReturnValue(true);
    const todayIso = toLocalIsoDate(new Date());

    vi.spyOn(timetableApi, 'listPreferenceSemesters').mockResolvedValue({ data: [] });
    vi.spyOn(timetableApi, 'listRescheduleRequests').mockResolvedValue({
      data: { items: [], total: 0, page: 1, pageSize: 20 },
    });
    vi.spyOn(timetableApi, 'getMyScheduleEvents').mockResolvedValue({
      data: [
        {
          id: 'event-1',
          disciplineTitle: 'Calculus',
          teachingType: 'LECTURE',
          date: todayIso,
          pair: 1,
          pairSpan: 1,
          groupCodes: ['KS11'],
        },
      ],
    });
    const preview = vi.spyOn(timetableApi, 'previewReschedule').mockResolvedValue({
      data: {
        changes: [
          {
            eventId: 'event-1',
            oldDate: todayIso,
            oldPair: 1,
            newDate: '2026-11-13',
            newPair: 3,
          },
          {
            eventId: 'event-2',
            oldDate: '2026-11-19',
            oldPair: 1,
            newDate: '2026-11-20',
            newPair: 3,
          },
        ],
      },
    });
    const createRequest = vi
      .spyOn(timetableApi, 'createRescheduleRequest')
      .mockRejectedValueOnce(new Error('Target occupied (HTTP 409)'))
      .mockResolvedValueOnce({
        data: {
          id: 'req-1',
          eventId: 'event-1',
          newDate: '2026-11-13',
          newPair: 3,
          scope: 'SERIES',
          reason: 'Conference travel',
          requesterName: 'Teacher',
          disciplineTitle: 'Calculus',
          status: 'PENDING',
          changes: [],
          createdAt: '2026-11-12T10:00:00Z',
          decidedAt: null,
          decisionExplanation: null,
        },
      });

    const user = userEvent.setup();

    renderScheduleView();

    await user.click(await screen.findByRole('button', { name: /Змінити посилання/i }));
    await user.click(screen.getByRole('button', { name: 'Перенести заняття' }));

    const dialog = screen.getByRole('dialog');

    await user.clear(within(dialog).getByLabelText('Нова дата'));
    await user.type(within(dialog).getByLabelText('Нова дата'), '2026-11-13');
    await user.selectOptions(within(dialog).getByLabelText('Пара'), '3');
    await user.click(within(dialog).getByRole('radio', { name: 'Це та наступні заняття' }));
    await user.type(within(dialog).getByLabelText('Причина'), 'Conference travel');
    await user.click(within(dialog).getByRole('button', { name: 'Переглянути зміни' }));

    expect(preview).toHaveBeenCalledTimes(1);
    expect(await within(dialog).findByText(/2026-11-20, пара 3/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Підтвердити перенесення' }));
    const alert = await within(dialog).findByRole('alert');

    expect(alert).toHaveTextContent('Перенесення створює конфлікт у розкладі');
    expect(alert).not.toHaveTextContent('Target occupied');
    expect(within(dialog).getByLabelText('Причина')).toHaveValue('Conference travel');

    await user.click(within(dialog).getByRole('button', { name: 'Підтвердити перенесення' }));
    expect(createRequest).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  }, 15_000);

  it.each([
    {
      failure: 'Invalid rescheduling proposal (HTTP 400)',
      text: 'Неможливо перенести заняття на цю дату чи пару',
    },
    { failure: 'STARTED_EVENT', text: 'Неможливо перенести заняття на цю дату чи пару' },
    { failure: 'Internal server error (HTTP 500)', text: 'Не вдалося перенести заняття' },
  ])('shows localized text for server failure "$failure"', async ({ failure, text }) => {
    vi.mocked(useCurrentUser).mockReturnValue({ userId: 'admin', roles: ['ADMIN'] });
    vi.mocked(useMediaQuery).mockReturnValue(true);
    const todayIso = toLocalIsoDate(new Date());

    vi.spyOn(timetableApi, 'getMyScheduleEvents').mockResolvedValue({
      data: [
        {
          id: 'event-1',
          disciplineTitle: 'Algorithms',
          teachingType: 'LECTURE',
          date: todayIso,
          pair: 1,
          pairSpan: 1,
          groupCodes: ['Online'],
        },
      ],
    });
    vi.spyOn(timetableApi, 'previewReschedule').mockRejectedValue(new Error(failure));

    const user = userEvent.setup();

    renderScheduleView();

    await user.click(await screen.findByRole('button', { name: /Змінити посилання/i }));
    await user.click(screen.getByRole('button', { name: 'Перенести заняття' }));

    const dialog = screen.getByRole('dialog');

    await user.type(within(dialog).getByLabelText('Причина'), 'Makeup');
    await user.click(within(dialog).getByRole('button', { name: 'Переглянути зміни' }));

    const alert = await within(dialog).findByRole('alert');

    expect(alert).toHaveTextContent(text);
    expect(alert).not.toHaveTextContent(failure);
    expect(within(dialog).getByLabelText('Причина')).toHaveValue('Makeup');
  });

  it('places the reschedule button in the modal actions, not between label and input', async () => {
    vi.mocked(useCurrentUser).mockReturnValue({ userId: 'admin', roles: ['ADMIN'] });
    vi.mocked(useMediaQuery).mockReturnValue(true);
    const start = new Date();
    const user = userEvent.setup();

    renderScheduleView({
      events: [
        {
          id: 'event-1',
          title: 'Algorithms',
          start,
          end: start,
          type: 'lecture',
          location: 'Online',
        },
      ],
    });
    await user.click(screen.getByRole('button', { name: /Змінити посилання/i }));

    const input = screen.getByPlaceholderText(/https:\/\/meet\.google\.com/i);
    const button = screen.getByRole('button', { name: 'Перенести заняття' });

    expect(input.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('does not offer rescheduling to teachers without admin role', async () => {
    vi.mocked(useMediaQuery).mockReturnValue(true);
    const start = new Date();
    const user = userEvent.setup();

    renderScheduleView({
      isTeacher: true,
      events: [
        {
          id: 'event-1',
          title: 'Algorithms',
          start,
          end: start,
          type: 'lecture',
          location: 'Online',
        },
      ],
    });
    await user.click(screen.getByRole('button', { name: /Змінити посилання/i }));
    expect(screen.queryByRole('button', { name: 'Перенести заняття' })).not.toBeInTheDocument();
  });

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
    expect(exportToICS).toHaveBeenCalledWith([]);
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

  it('should pass undefined to updateMeetingUrl when clearing meeting URL', async () => {
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
        meetingUrl: null,
      },
    });

    const testDate = new Date(new Date().setHours(10, 10, 0, 0));
    const customEvents: ScheduleEvent[] = [
      {
        id: 'evt-editable-clear',
        title: 'Теорія алгоритмів',
        start: testDate,
        end: new Date(testDate.getTime() + 80 * 60 * 1000),
        type: 'lecture',
        location: 'Дистанційно',
        meetingUrl: 'https://zoom.us/j/999999',
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

    const saveBtn = screen.getByRole('button', { name: /зберегти/i });

    await user.click(saveBtn);

    expect(updateSpy).toHaveBeenCalledWith('assign-1', undefined);
  });

  it('should validate meeting URL on client side and prevent API call for invalid URL', async () => {
    const updateSpy = vi.spyOn(timetableApi, 'updateMeetingUrl');

    const testDate = new Date(new Date().setHours(10, 10, 0, 0));
    const customEvents: ScheduleEvent[] = [
      {
        id: 'evt-editable-2',
        title: 'Теорія алгоритмів',
        start: testDate,
        end: new Date(testDate.getTime() + 80 * 60 * 1000),
        type: 'lecture',
        location: 'Дистанційно',
        teachingAssignmentId: 'assign-2',
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
    await user.type(input, 'javascript:alert(1)');

    const saveBtn = screen.getByRole('button', { name: /зберегти/i });

    await user.click(saveBtn);

    expect(updateSpy).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      /посилання має починатися з http:\/\/ або https:\/\//i,
    );
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
