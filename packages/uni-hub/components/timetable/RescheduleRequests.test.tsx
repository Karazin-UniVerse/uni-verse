import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { withLanguage, withQueryClient } from '@uni-hub/utils/test-utils';
import { RescheduleRequests } from './RescheduleRequests';

const api = vi.hoisted(() => ({
  listRescheduleRequests: vi.fn(),
  approveRescheduleRequest: vi.fn(),
  rejectRescheduleRequest: vi.fn(),
}));

vi.mock('@uni-hub/services/api.timetable', () => ({ timetableApi: api }));
vi.mock('@uni-hub/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ userId: 'admin-1', roles: ['ADMIN'] }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem('universe-lang', 'en');
  api.listRescheduleRequests.mockResolvedValue({
    data: {
      items: [
        {
          id: 'request-1',
          eventId: 'event-1',
          disciplineTitle: 'Calculus',
          requesterName: 'Teacher',
          scope: 'ONCE',
          status: 'PENDING',
          reason: 'Conference',
          changes: [
            {
              eventId: 'event-1',
              oldDate: '2027-10-04',
              oldPair: 1,
              newDate: '2027-10-05',
              newPair: 2,
            },
          ],
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    },
  });
  api.approveRescheduleRequest.mockResolvedValue({ data: {} });
  api.rejectRescheduleRequest.mockResolvedValue({ data: {} });
});

it('shows proposal and requires an explanation before rejection', async () => {
  const user = userEvent.setup();

  render(withQueryClient(withLanguage(<RescheduleRequests isAdmin />)));
  expect(await screen.findByText('Calculus')).toBeInTheDocument();
  expect(api.listRescheduleRequests).toHaveBeenCalledWith(
    { page: 1, pageSize: 20, status: 'PENDING' },
    false,
  );
  expect(screen.getByText(/2027-10-04, pair 1/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Reject request' })).toBeDisabled();
  await user.type(screen.getByLabelText('Rejection explanation'), 'Target unavailable');
  await user.click(screen.getByRole('button', { name: 'Reject request' }));
  expect(api.rejectRescheduleRequest).toHaveBeenCalledWith('request-1', 'Target unavailable');
});

it('does not expose decision controls in the instructor view', async () => {
  render(withQueryClient(withLanguage(<RescheduleRequests isAdmin={false} />)));
  expect(await screen.findByText('Calculus')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Approve transfer' })).not.toBeInTheDocument();
  expect(api.listRescheduleRequests).toHaveBeenCalledWith({ page: 1, pageSize: 20 }, true);
});
