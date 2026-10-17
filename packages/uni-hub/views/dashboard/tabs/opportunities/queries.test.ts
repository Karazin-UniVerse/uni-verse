import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import {
  catalogQueryOptions,
  hasLoadFailed,
  loadApplicants,
  moderationQueueQueryOptions,
  myOpportunitiesQueryOptions,
} from './queries';
import { buildOpportunity } from './test-utils';

describe('opportunities queries', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
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

  describe('hasLoadFailed', () => {
    it('is true when the load failed and nothing is cached', () => {
      expect(hasLoadFailed({ isError: true, data: undefined })).toBe(true);
    });

    it('is false when a refetch failed but cached data is still there', () => {
      expect(hasLoadFailed({ isError: true, data: [buildOpportunity('opp-1')] })).toBe(false);
    });

    it('is false when the load did not fail', () => {
      expect(hasLoadFailed({ isError: false, data: undefined })).toBe(false);
    });
  });
});
