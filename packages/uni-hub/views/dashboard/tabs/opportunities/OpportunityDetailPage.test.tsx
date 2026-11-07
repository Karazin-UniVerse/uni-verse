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
const unavailable = { id: opportunity.id, title: '', availability: 'temporary' as const };

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

  it('should show the error screen when the first request fails without cached data', async () => {
    vi.spyOn(opportunitiesApi, 'getOpportunity').mockRejectedValue(new Error('Load unavailable'));
    render(withAppProviders(<OpportunityDetailPage opportunityId={opportunity.id} />));

    expect(await screen.findByRole('button', { name: /спробувати знову/i })).toBeInTheDocument();
  });
});
