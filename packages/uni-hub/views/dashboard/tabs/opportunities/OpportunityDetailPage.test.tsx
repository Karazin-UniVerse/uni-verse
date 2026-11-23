import { OPPORTUNITY_AVAILABILITY } from '@core/constants/opportunity-availability';
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { notifyManager } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OpportunityListItem } from '@core/types/opportunities';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { createTestQueryClient, withAppProviders } from '@uni-hub/utils/test-utils';
import { OpportunityDetailPage } from './OpportunityDetailPage';
import { opportunityKeys } from './queryKeys';
import { buildOpportunity } from './test-utils';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@uni-hub/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ userId: 'viewer', roles: [], name: 'Viewer' }),
}));

const opportunity = { ...buildOpportunity('loaded'), status: 'PUBLISHED' as const };
const unavailable = {
  id: opportunity.id,
  title: '',
  availability: OPPORTUNITY_AVAILABILITY.TEMPORARY,
};

describe('OpportunityDetailPage background refresh', () => {
  beforeEach(() => {
    vi.spyOn(opportunitiesApi, 'getFavorites').mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each<{ initial: OpportunityListItem; label: string }>([
    { initial: opportunity, label: opportunity.title },
    { initial: unavailable, label: 'Тимчасово недоступна' },
  ])(
    'should preserve cached $label after a failed background refresh',
    async ({ initial, label }) => {
      const client = createTestQueryClient();
      const request = vi
        .spyOn(opportunitiesApi, 'getOpportunity')
        .mockResolvedValueOnce({ data: initial });

      render(withAppProviders(<OpportunityDetailPage opportunityId={opportunity.id} />, client));
      expect(await screen.findByText(label)).toBeInTheDocument();
      request.mockRejectedValue(new Error('Refresh unavailable'));
      await act(async () => {
        await client.invalidateQueries({ queryKey: opportunityKeys.detail(opportunity.id) });
        await new Promise<void>((resolve) => notifyManager.schedule(resolve));
      });

      expect(client.getQueryState(opportunityKeys.detail(opportunity.id))?.status).toBe('error');
      expect(screen.getByText(label)).toBeInTheDocument();
    },
  );

  it('should replace loaded details with an unavailable notice after a successful refresh', async () => {
    const client = createTestQueryClient();
    const request = vi
      .spyOn(opportunitiesApi, 'getOpportunity')
      .mockResolvedValueOnce({ data: opportunity });

    render(withAppProviders(<OpportunityDetailPage opportunityId={opportunity.id} />, client));
    expect(await screen.findByRole('heading', { name: opportunity.title })).toBeInTheDocument();
    request.mockResolvedValue({ data: unavailable });
    await act(async () => {
      await client.invalidateQueries({ queryKey: opportunityKeys.detail(opportunity.id) });
    });

    expect(await screen.findByText('Тимчасово недоступна')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: opportunity.title })).not.toBeInTheDocument();
  });

  it('allows removing a saved unavailable opportunity from its detail page', async () => {
    const savedUnavailable = {
      id: opportunity.id,
      title: 'Previous Title',
      availability: OPPORTUNITY_AVAILABILITY.PERMANENT,
    };

    vi.spyOn(opportunitiesApi, 'getFavorites').mockResolvedValue({ data: [savedUnavailable] });

    let resolveToggle!: (value: { data: { saved: boolean } }) => void;
    const setFavorite = vi.spyOn(opportunitiesApi, 'setFavorite').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveToggle = resolve;
        }),
    );

    vi.spyOn(opportunitiesApi, 'getOpportunity').mockResolvedValue({ data: savedUnavailable });

    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();

    render(withAppProviders(<OpportunityDetailPage opportunityId={opportunity.id} />));

    expect(
      await screen.findByRole('heading', { level: 3, name: 'Previous Title' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Більше недоступна');

    await user.click(await screen.findByRole('button', { name: 'Видалити з обраного' }));

    expect(setFavorite).toHaveBeenCalledWith(opportunity.id, false);
    expect(screen.getByRole('button', { name: 'Додати до обраного' })).toBeDisabled();

    await act(async () => {
      resolveToggle({ data: { saved: false } });
    });
  });

  it('allows toggling favorite on a published opportunity detail page', async () => {
    vi.spyOn(opportunitiesApi, 'getFavorites').mockResolvedValue({ data: [] });

    const setFavorite = vi
      .spyOn(opportunitiesApi, 'setFavorite')
      .mockResolvedValue({ data: { saved: true } });

    vi.spyOn(opportunitiesApi, 'getOpportunity').mockResolvedValue({ data: opportunity });

    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();

    render(withAppProviders(<OpportunityDetailPage opportunityId={opportunity.id} />));

    const favButton = await screen.findByRole('button', { name: 'Додати до обраного' });

    await user.click(favButton);

    expect(setFavorite).toHaveBeenCalledWith(opportunity.id, true);
  });

  it('should show the error screen when the first request fails without cached data', async () => {
    vi.spyOn(opportunitiesApi, 'getOpportunity').mockRejectedValue(new Error('Load unavailable'));
    render(withAppProviders(<OpportunityDetailPage opportunityId={opportunity.id} />));

    expect(await screen.findByRole('button', { name: /спробувати знову/i })).toBeInTheDocument();
  });
});
