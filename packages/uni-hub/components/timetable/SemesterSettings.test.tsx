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
  await user.clear(input);
  await user.type(input, '18');
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
