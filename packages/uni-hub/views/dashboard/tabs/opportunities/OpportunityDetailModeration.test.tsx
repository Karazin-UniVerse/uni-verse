import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ROLE } from '@core/constants/roles';
import { OPPORTUNITY_STATUS } from '@core/constants/opportunities';
import type { Opportunity } from '@core/types/opportunities';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { safeStorage } from '@uni-hub/services/api.storage';
import { createTestQueryClient, withAppProviders } from '@uni-hub/utils/test-utils';
import { OpportunityDetailContent } from './OpportunityDetailContent';
import { OpportunityDetailPage } from './OpportunityDetailPage';
import { opportunityKeys } from './queryKeys';
import { buildOpportunity } from './test-utils';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

function renderDetail(
  opportunity: Opportunity = buildOpportunity('opportunity-1'),
): ReturnType<typeof render> {
  return render(withAppProviders(<OpportunityDetailContent opportunity={opportunity} />));
}

describe('opportunity detail moderation', () => {
  beforeEach(() => {
    localStorage.setItem('universe-lang', 'uk');
    safeStorage.setItem(
      'accessToken',
      `header.${btoa(JSON.stringify({ sub: 'moderator-1', roles: [ROLE.OPPORTUNITIES_MODERATOR] }))}.signature`,
    );
    vi.spyOn(opportunitiesApi, 'moderate').mockResolvedValue({
      data: { ...buildOpportunity('opportunity-1'), status: OPPORTUNITY_STATUS.PUBLISHED },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    safeStorage.removeItem('accessToken');
  });

  it('should approve the notified opportunity directly from its details', async () => {
    const user = userEvent.setup();

    renderDetail();
    await user.click(screen.getByRole('button', { name: 'Схвалити' }));

    await waitFor(() =>
      expect(opportunitiesApi.moderate).toHaveBeenCalledWith('opportunity-1', 'APPROVE', undefined),
    );
    expect(
      await screen.findByText('Можливість схвалено та опубліковано в каталозі!'),
    ).toBeInTheDocument();
  });

  it.each([
    { button: 'На доопрацювання', confirm: 'На доопрацювання', action: 'REQUIRE_CHANGES' },
    { button: 'Відхилити', confirm: 'Відхилити', action: 'REJECT' },
  ])('should submit $action with the moderator comment', async ({ button, confirm, action }) => {
    const user = userEvent.setup();

    renderDetail();
    await user.click(screen.getByRole('button', { name: button }));
    await user.type(screen.getByRole('textbox'), 'Please clarify the requirements');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: confirm }));

    await waitFor(() =>
      expect(opportunitiesApi.moderate).toHaveBeenCalledWith(
        'opportunity-1',
        action,
        'Please clarify the requirements',
      ),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('should not expose moderation to a user without the moderator role', () => {
    safeStorage.setItem(
      'accessToken',
      `header.${btoa(JSON.stringify({ sub: 'student-1', roles: [ROLE.OPPORTUNITIES_USER] }))}.signature`,
    );
    renderDetail();

    expect(screen.queryByRole('button', { name: 'Схвалити' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Відхилити' })).not.toBeInTheDocument();
  });

  it('should prevent moderators from moderating their own opportunity', () => {
    renderDetail({ ...buildOpportunity('opportunity-1'), ownerId: 'moderator-1' });

    expect(screen.queryByRole('button', { name: 'Схвалити' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Відхилити' })).not.toBeInTheDocument();
  });

  it.each(
    Object.values(OPPORTUNITY_STATUS).filter(
      (status) => status !== OPPORTUNITY_STATUS.READY_FOR_REVIEW,
    ),
  )('should not show moderation for status %s', (status) => {
    renderDetail({ ...buildOpportunity('opportunity-1'), status });

    expect(screen.queryByRole('button', { name: 'Схвалити' })).not.toBeInTheDocument();
  });

  it('should retain available actions and show an error after a failed request', async () => {
    const user = userEvent.setup();

    vi.mocked(opportunitiesApi.moderate).mockRejectedValueOnce(new Error('Moderation failed'));
    renderDetail();
    await user.click(screen.getByRole('button', { name: 'Схвалити' }));

    expect(await screen.findByText('Moderation failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Схвалити' })).toBeEnabled();
  });

  it.each([
    {
      action: 'APPROVE',
      button: 'Схвалити',
      confirm: null,
      nextStatus: OPPORTUNITY_STATUS.PUBLISHED,
      expectedBadge: 'Опубліковано',
    },
    {
      action: 'REQUIRE_CHANGES',
      button: 'На доопрацювання',
      confirm: 'На доопрацювання',
      nextStatus: OPPORTUNITY_STATUS.REQUIRES_CHANGES,
      expectedBadge: 'Потребує правок',
    },
    {
      action: 'REJECT',
      button: 'Відхилити',
      confirm: 'Відхилити',
      nextStatus: OPPORTUNITY_STATUS.REJECTED,
      expectedBadge: 'Відхилено',
    },
  ])(
    'should refresh the detail status and remove moderation actions after $action',
    async ({ button, confirm, nextStatus, expectedBadge }) => {
      const user = userEvent.setup();
      const queryClient = createTestQueryClient();
      const opportunity = buildOpportunity('opportunity-1');

      queryClient.setQueryData(opportunityKeys.detail(opportunity.id), opportunity);
      vi.spyOn(opportunitiesApi, 'getOpportunity')
        .mockResolvedValueOnce({ data: opportunity })
        .mockResolvedValue({ data: { ...opportunity, status: nextStatus } });
      render(
        withAppProviders(<OpportunityDetailPage opportunityId={opportunity.id} />, queryClient),
      );
      await user.click(await screen.findByRole('button', { name: button }));

      if (confirm) {
        await user.type(screen.getByRole('textbox'), 'Reason');
        await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: confirm }));
      }

      expect(await screen.findByText(expectedBadge)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Схвалити' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'На доопрацювання' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Відхилити' })).not.toBeInTheDocument();
    },
  );

  it('should disable every moderation action while a request is pending', async () => {
    const user = userEvent.setup();
    let finishRequest: (() => void) | undefined;

    vi.mocked(opportunitiesApi.moderate).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishRequest = () =>
            resolve({
              data: { ...buildOpportunity('opportunity-1'), status: OPPORTUNITY_STATUS.PUBLISHED },
            });
        }),
    );
    renderDetail();
    await user.click(screen.getByRole('button', { name: 'Схвалити' }));

    expect(screen.getByRole('button', { name: 'Схвалити' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'На доопрацювання' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Відхилити' })).toBeDisabled();
    finishRequest?.();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Схвалити' })).toBeEnabled());
  });
});
