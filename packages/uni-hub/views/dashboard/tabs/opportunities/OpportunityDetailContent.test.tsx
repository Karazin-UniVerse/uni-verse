import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@una';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { OPPORTUNITY_VIEW, OPPORTUNITY_VIEW_PARAM } from '@core/constants/opportunities';
import type { OpportunityApplication } from '@core/types/opportunities';
import { OpportunityDetailContent } from './OpportunityDetailContent';
import { buildOpportunity } from './test-utils';

let query = new URLSearchParams(`${OPPORTUNITY_VIEW_PARAM}=${OPPORTUNITY_VIEW.APPLICANTS}`);
let userId: string | null = 'owner-1';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => query,
}));

vi.mock('@uni-hub/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ userId, roles: [], name: 'Owner' }),
}));

vi.mock('@uni-hub/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    formatMessage: (key: string) => key,
    language: 'en',
    localeTag: 'en-US',
  }),
}));

const application: OpportunityApplication = {
  id: 'application-1',
  applicantId: 'candidate-1',
  opportunityId: 'opportunity-1',
  applicantName: 'Candidate One',
  contactInfo: '@candidate_one',
  motivation: 'Research experience',
  status: 'SUBMITTED',
  createdAt: '2026-10-01T10:00:00Z',
  updatedAt: '2026-10-01T10:00:00Z',
};

function renderDetail(): ReturnType<typeof render> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(<OpportunityDetailContent opportunity={buildOpportunity('opportunity-1')} />, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    ),
  });
}

describe('OpportunityDetailContent applicants deep-link', () => {
  beforeEach(() => {
    query = new URLSearchParams(`${OPPORTUNITY_VIEW_PARAM}=${OPPORTUNITY_VIEW.APPLICANTS}`);
    userId = 'owner-1';
    vi.spyOn(opportunitiesApi, 'getOpportunityApplications').mockResolvedValue({
      data: [application],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens from the URL, stays closed after closing, and allows manual reopening', async () => {
    const user = userEvent.setup();
    const { rerender } = renderDetail();

    expect(await screen.findByText('Candidate One')).toBeInTheDocument();
    expect(opportunitiesApi.getOpportunityApplications).toHaveBeenCalledWith('opportunity-1');

    await user.click(screen.getByRole('button', { name: 'opportunities.applicantsModal.close' }));
    rerender(<OpportunityDetailContent opportunity={buildOpportunity('opportunity-1')} />);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'opportunities.card.applications' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('handles a new applicants URL after the query was removed', async () => {
    const user = userEvent.setup();
    const { rerender } = renderDetail();

    expect(await screen.findByText('Candidate One')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'opportunities.applicantsModal.close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    query = new URLSearchParams();
    rerender(<OpportunityDetailContent opportunity={buildOpportunity('opportunity-1')} />);
    query = new URLSearchParams(`${OPPORTUNITY_VIEW_PARAM}=${OPPORTUNITY_VIEW.APPLICANTS}`);
    rerender(<OpportunityDetailContent opportunity={buildOpportunity('opportunity-1')} />);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('loads applicants for a different opportunity without remounting', async () => {
    const { rerender } = renderDetail();

    expect(await screen.findByText('Candidate One')).toBeInTheDocument();
    vi.mocked(opportunitiesApi.getOpportunityApplications).mockResolvedValue({
      data: [
        {
          ...application,
          id: 'application-2',
          opportunityId: 'opportunity-2',
          applicantName: 'Candidate Two',
        },
      ],
    });

    rerender(<OpportunityDetailContent opportunity={buildOpportunity('opportunity-2')} />);

    expect(await screen.findByText('Candidate Two')).toBeInTheDocument();
    expect(opportunitiesApi.getOpportunityApplications).toHaveBeenCalledWith('opportunity-2');
    expect(screen.queryByText('Candidate One')).not.toBeInTheDocument();
  });

  it('handles a changed query on the same opportunity', async () => {
    const user = userEvent.setup();
    const { rerender } = renderDetail();

    expect(await screen.findByText('Candidate One')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'opportunities.applicantsModal.close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    query = new URLSearchParams(
      `${OPPORTUNITY_VIEW_PARAM}=${OPPORTUNITY_VIEW.APPLICANTS}&source=notification`,
    );
    rerender(<OpportunityDetailContent opportunity={buildOpportunity('opportunity-1')} />);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('closes applicants when navigating to another opportunity without a deep-link', async () => {
    const { rerender } = renderDetail();

    expect(await screen.findByText('Candidate One')).toBeInTheDocument();
    query = new URLSearchParams();
    rerender(<OpportunityDetailContent opportunity={buildOpportunity('opportunity-2')} />);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(opportunitiesApi.getOpportunityApplications).not.toHaveBeenCalledWith('opportunity-2');
  });

  it('closes applicants when the next deep-linked opportunity belongs to another owner', async () => {
    const { rerender } = renderDetail();

    expect(await screen.findByText('Candidate One')).toBeInTheDocument();
    rerender(
      <OpportunityDetailContent
        opportunity={{ ...buildOpportunity('opportunity-2'), ownerId: 'owner-2' }}
      />,
    );

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(opportunitiesApi.getOpportunityApplications).not.toHaveBeenCalledWith('opportunity-2');
  });

  it.each(['candidate-1', null])(
    'closes applicants when the user changes to %s',
    async (nextUserId) => {
      const { rerender } = renderDetail();

      expect(await screen.findByText('Candidate One')).toBeInTheDocument();
      userId = nextUserId;
      rerender(<OpportunityDetailContent opportunity={buildOpportunity('opportunity-1')} />);

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

      userId = 'owner-1';
      rerender(<OpportunityDetailContent opportunity={buildOpportunity('opportunity-1')} />);

      expect(await screen.findByText('Candidate One')).toBeInTheDocument();
    },
  );

  it('closes applicants when ownership changes on the displayed opportunity', async () => {
    const { rerender } = renderDetail();

    expect(await screen.findByText('Candidate One')).toBeInTheDocument();
    rerender(
      <OpportunityDetailContent
        opportunity={{ ...buildOpportunity('opportunity-1'), ownerId: 'owner-2' }}
      />,
    );

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('does not open or request applicants for a non-owner', () => {
    userId = 'candidate-1';
    renderDetail();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'opportunities.card.applications' }),
    ).not.toBeInTheDocument();
    expect(opportunitiesApi.getOpportunityApplications).not.toHaveBeenCalled();
  });
});

describe('OpportunityDetailContent delete', () => {
  beforeEach(() => {
    query = new URLSearchParams();
    userId = 'owner-1';
    pushMock.mockClear();
    vi.spyOn(opportunitiesApi, 'deleteOpportunity').mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows owner to delete a draft opportunity with confirmation', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <OpportunityDetailContent
        opportunity={{ ...buildOpportunity('opp-draft'), status: 'DRAFT' }}
      />,
      {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>
            <ToastProvider>{children}</ToastProvider>
          </QueryClientProvider>
        ),
      },
    );

    const deleteBtn = screen.getByRole('button', { name: 'opportunities.detailModal.delete' });

    expect(deleteBtn).toBeInTheDocument();

    await user.click(deleteBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('opportunities.confirm.deleteTitle')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', {
      name: 'opportunities.confirm.deleteConfirm',
    });

    await user.click(confirmBtn);

    expect(opportunitiesApi.deleteOpportunity).toHaveBeenCalledWith('opp-draft');
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/opportunities'));
  });

  it('does not display delete button for non-draft opportunities', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <OpportunityDetailContent
        opportunity={{ ...buildOpportunity('opp-published'), status: 'PUBLISHED' }}
      />,
      {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>
            <ToastProvider>{children}</ToastProvider>
          </QueryClientProvider>
        ),
      },
    );

    expect(
      screen.queryByRole('button', { name: 'opportunities.detailModal.delete' }),
    ).not.toBeInTheDocument();
  });

  it('does not navigate and shows error toast when delete fails', async () => {
    const user = userEvent.setup();

    vi.spyOn(opportunitiesApi, 'deleteOpportunity').mockRejectedValue(new Error('Deletion failed'));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <OpportunityDetailContent
        opportunity={{ ...buildOpportunity('opp-draft'), status: 'DRAFT' }}
      />,
      {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>
            <ToastProvider>{children}</ToastProvider>
          </QueryClientProvider>
        ),
      },
    );

    const deleteBtn = screen.getByRole('button', { name: 'opportunities.detailModal.delete' });

    await user.click(deleteBtn);

    const confirmBtn = screen.getByRole('button', {
      name: 'opportunities.confirm.deleteConfirm',
    });

    await user.click(confirmBtn);

    expect(opportunitiesApi.deleteOpportunity).toHaveBeenCalledWith('opp-draft');
    await waitFor(() => {
      expect(screen.getByText('Deletion failed')).toBeInTheDocument();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });
});

describe('OpportunityDetailContent published opportunity controls', () => {
  beforeEach(() => {
    query = new URLSearchParams();
    userId = 'owner-1';
    pushMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not render phase select or accepts applications checkbox directly on detail page', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <OpportunityDetailContent
        opportunity={{
          ...buildOpportunity('opp-published'),
          status: 'PUBLISHED',
          lifecycleState: 'ACTIVE',
          acceptsApplications: true,
        }}
      />,
      {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>
            <ToastProvider>{children}</ToastProvider>
          </QueryClientProvider>
        ),
      },
    );

    expect(
      screen.queryByRole('button', { name: 'opportunities.detailModal.edit' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'opportunities.detailModal.delete' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('combobox', {
        name: 'opportunities.detailModal.phaseLabel',
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', {
        name: 'opportunities.detailModal.acceptsApplications',
      }),
    ).not.toBeInTheDocument();
  });
});
