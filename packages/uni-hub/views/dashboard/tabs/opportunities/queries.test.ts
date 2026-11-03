import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { QUERY_STALE_TIME_MS } from '@uni-hub/constants/query';
import {
  catalogQueryOptions,
  loadApplicants,
  loadTagSuggestions,
  moderationQueueQueryOptions,
  myOpportunitiesQueryOptions,
  opportunityDetailQueryOptions,
} from './queries';
import { buildOpportunity } from './test-utils';

describe('opportunities queries', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { staleTime: QUERY_STALE_TIME_MS, retry: false } },
    });
  });

  afterEach(() => {
    queryClient.clear();
    vi.restoreAllMocks();
  });

  it('loads the catalog as a list', async () => {
    const opportunity = buildOpportunity('opp-1');

    vi.spyOn(opportunitiesApi, 'getOpportunities').mockResolvedValue({ data: [opportunity] });

    await expect(queryClient.fetchQuery(catalogQueryOptions)).resolves.toEqual([opportunity]);
  });

  it('should reuse cached suggestions for the same normalized query', async () => {
    const getTagSuggestions = vi.spyOn(opportunitiesApi, 'getTagSuggestions').mockResolvedValue({
      data: [{ id: 'react', name: 'react' }],
    });

    await expect(loadTagSuggestions(queryClient, '  REA  ')).resolves.toEqual(['react']);
    await expect(loadTagSuggestions(queryClient, 'rea')).resolves.toEqual(['react']);
    expect(getTagSuggestions).toHaveBeenCalledExactlyOnceWith('rea');
  });

  it('should cache different search terms separately', async () => {
    vi.spyOn(opportunitiesApi, 'getTagSuggestions')
      .mockResolvedValueOnce({ data: [{ id: 'react', name: 'react' }] })
      .mockResolvedValueOnce({ data: [{ id: 'design', name: 'design' }] });

    await expect(loadTagSuggestions(queryClient, 'rea')).resolves.toEqual(['react']);
    await expect(loadTagSuggestions(queryClient, 'des')).resolves.toEqual(['design']);
    await expect(loadTagSuggestions(queryClient, 'rea')).resolves.toEqual(['react']);
  });

  it('should propagate suggestion failures without caching an empty list', async () => {
    const getTagSuggestions = vi
      .spyOn(opportunitiesApi, 'getTagSuggestions')
      .mockRejectedValueOnce(new Error('Suggestions unavailable'))
      .mockResolvedValueOnce({ data: [{ id: 'react', name: 'react' }] });

    await expect(loadTagSuggestions(queryClient, 'rea')).rejects.toThrow('Suggestions unavailable');
    await expect(loadTagSuggestions(queryClient, 'rea')).resolves.toEqual(['react']);
    expect(getTagSuggestions).toHaveBeenCalledTimes(2);
  });

  it('requests only opportunities that wait for review for the moderation queue', async () => {
    const getOpportunities = vi
      .spyOn(opportunitiesApi, 'getOpportunities')
      .mockResolvedValue({ data: [] });

    await queryClient.fetchQuery(moderationQueueQueryOptions);

    expect(getOpportunities).toHaveBeenCalledWith({ status: 'READY_FOR_REVIEW' });
  });

  it('rejects instead of returning an empty list when the request fails', async () => {
    vi.spyOn(opportunitiesApi, 'getMyOpportunities').mockRejectedValue(new Error('HTTP error 500'));

    await expect(queryClient.fetchQuery(myOpportunitiesQueryOptions)).rejects.toThrow(
      'HTTP error 500',
    );
  });

  it('loads the applications of one opportunity', async () => {
    const getApplications = vi
      .spyOn(opportunitiesApi, 'getOpportunityApplications')
      .mockResolvedValue({ data: [] });

    await expect(loadApplicants('opp-7')).resolves.toEqual([]);
    expect(getApplications).toHaveBeenCalledWith('opp-7');
  });

  it('loads one opportunity by id under its own query key', async () => {
    const opportunity = buildOpportunity('opp-9');
    const getOpportunity = vi
      .spyOn(opportunitiesApi, 'getOpportunity')
      .mockResolvedValue({ data: opportunity });
    const options = opportunityDetailQueryOptions('opp-9');

    expect(options.queryKey).toEqual(['opportunities', 'detail', 'opp-9']);
    await expect(queryClient.fetchQuery(options)).resolves.toEqual(opportunity);
    expect(getOpportunity).toHaveBeenCalledWith('opp-9');
  });
});
