import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { withLanguage, withQueryClient } from '@uni-hub/utils/test-utils';
import { SemesterSettings } from './SemesterSettings';

const api = vi.hoisted(() => ({
  getSemesterCalendar: vi.fn(),
  configureSemesterCalendar: vi.fn(),
}));

vi.mock('@uni-hub/services/api.timetable', () => ({ timetableApi: api }));

beforeEach(() => {
  localStorage.setItem('universe-lang', 'en');
  api.getSemesterCalendar.mockResolvedValue({
    data: {
      id: 'calendar',
      academicYear: '2026/2027',
      semester: 1,
      startDate: '2026-09-07',
      teachingWeeks: 14,
      excludedDates: ['2026-10-14'],
      makeupSaturdays: [],
    },
  });
  api.configureSemesterCalendar.mockResolvedValue({ data: {} });
});

it('loads a non-default duration and preserves calendar exceptions when saving', async () => {
  const user = userEvent.setup();

  render(
    withQueryClient(
      withLanguage(
        <SemesterSettings academicYear="2026/2027" semester={1} onReadyChange={vi.fn()} />,
      ),
    ),
  );

  const input = await screen.findByLabelText('Teaching weeks');

  await waitFor(() => expect(input).toHaveValue(14));
  expect(
    screen.getByText(
      'If needed, the generator will use the minimum number of Saturdays to preserve all teaching hours.',
    ),
  ).toBeInTheDocument();
  await user.clear(input);
  expect(screen.queryByText(/minimum number of Saturdays/)).not.toBeInTheDocument();
  await user.type(input, '16');
  expect(screen.queryByText(/minimum number of Saturdays/)).not.toBeInTheDocument();
  await user.clear(input);
  await user.type(input, '18');
  expect(screen.queryByText(/minimum number of Saturdays/)).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Save semester settings' }));

  await waitFor(() =>
    expect(api.configureSemesterCalendar).toHaveBeenCalledWith({
      academicYear: '2026/2027',
      semester: 1,
      startDate: '2026-09-07',
      teachingWeeks: 18,
      excludedDates: ['2026-10-14'],
      makeupSaturdays: [],
    }),
  );
});

it('creates a missing semester calendar from the start date and weeks', async () => {
  const user = userEvent.setup();
  const onReadyChange = vi.fn();

  api.getSemesterCalendar.mockRejectedValue(new Error('Semester calendar not found'));
  api.configureSemesterCalendar.mockResolvedValue({
    data: {
      id: 'calendar-2',
      academicYear: '2026/2027',
      semester: 2,
      startDate: '2027-02-01',
      teachingWeeks: 16,
      excludedDates: [],
      makeupSaturdays: [],
    },
  });

  render(
    withQueryClient(
      withLanguage(
        <SemesterSettings academicYear="2026/2027" semester={2} onReadyChange={onReadyChange} />,
      ),
    ),
  );

  expect(await screen.findByText('The semester calendar is not set up yet')).toBeInTheDocument();
  expect(screen.getByLabelText('Teaching weeks')).toHaveValue(16);

  await user.type(screen.getByLabelText('Semester start'), '2027-02-01');
  await user.click(screen.getByRole('button', { name: 'Save semester settings' }));

  await waitFor(() =>
    expect(api.configureSemesterCalendar).toHaveBeenCalledWith({
      academicYear: '2026/2027',
      semester: 2,
      startDate: '2027-02-01',
      teachingWeeks: 16,
      excludedDates: [],
      makeupSaturdays: [],
    }),
  );
});

it('explains that published classes block a change of semester dates', async () => {
  const user = userEvent.setup();

  api.configureSemesterCalendar.mockRejectedValue(
    new Error('Calendar change would exclude published classes (HTTP 409)'),
  );

  render(
    withQueryClient(
      withLanguage(
        <SemesterSettings academicYear="2026/2027" semester={1} onReadyChange={vi.fn()} />,
      ),
    ),
  );

  const input = await screen.findByLabelText('Teaching weeks');

  await waitFor(() => expect(input).toHaveValue(14));
  await user.clear(input);
  await user.type(input, '12');
  await user.click(screen.getByRole('button', { name: 'Save semester settings' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'This semester already has a published timetable with classes outside the new dates.',
  );
});

it('counts the last class day from a midweek start', async () => {
  api.getSemesterCalendar.mockResolvedValue({
    data: {
      id: 'calendar',
      academicYear: '2026/2027',
      semester: 1,
      startDate: '2026-09-01',
      teachingWeeks: 16,
      excludedDates: [],
      makeupSaturdays: [],
    },
  });

  render(
    withQueryClient(
      withLanguage(
        <SemesterSettings academicYear="2026/2027" semester={1} onReadyChange={vi.fn()} />,
      ),
    ),
  );

  expect(await screen.findByText(/December 21/)).toBeInTheDocument();
});
