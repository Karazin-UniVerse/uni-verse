import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@una';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import type { OpportunityApplication } from '@core/types/opportunities';
import { OpportunityDetailContent } from './OpportunityDetailContent';
import { buildOpportunity } from './test-utils';

let query = new URLSearchParams('view=applicants');
let userId = 'owner-1';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
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
    query = new URLSearchParams('view=applicants');
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
    query = new URLSearchParams('view=applicants');
    rerender(<OpportunityDetailContent opportunity={buildOpportunity('opportunity-1')} />);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('loads applicants for a different opportunity without remounting', async () => {
    const user = userEvent.setup();
    const { rerender } = renderDetail();

    expect(await screen.findByText('Candidate One')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'opportunities.applicantsModal.close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
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
  });

  it('handles a changed query on the same opportunity', async () => {
    const user = userEvent.setup();
    const { rerender } = renderDetail();

    expect(await screen.findByText('Candidate One')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'opportunities.applicantsModal.close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    query = new URLSearchParams('view=applicants&source=notification');
    rerender(<OpportunityDetailContent opportunity={buildOpportunity('opportunity-1')} />);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
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
