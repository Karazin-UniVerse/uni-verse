import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import type { Opportunity } from '@core/types/opportunities';
import {
  invalidateOpportunities,
  removeFromModerationQueue,
  restoreModerationQueue,
} from './cache';
import { opportunityKeys } from './queryKeys';
import { buildOpportunity } from './test-utils';

describe('opportunities cache', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('invalidateOpportunities', () => {
    it('marks every opportunity query stale and leaves other queries alone', async () => {
      queryClient.setQueryData(opportunityKeys.catalog(), []);
      queryClient.setQueryData(opportunityKeys.mine(), []);
      queryClient.setQueryData(opportunityKeys.applications(), []);
      queryClient.setQueryData(opportunityKeys.moderation(), []);
      queryClient.setQueryData(opportunityKeys.applicants('opp-1'), []);
      queryClient.setQueryData(['courses'], []);

      await invalidateOpportunities(queryClient);

      expect(queryClient.getQueryState(opportunityKeys.catalog())?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(opportunityKeys.mine())?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(opportunityKeys.applications())?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(opportunityKeys.moderation())?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(opportunityKeys.applicants('opp-1'))?.isInvalidated).toBe(
        true,
      );
      expect(queryClient.getQueryState(['courses'])?.isInvalidated).toBe(false);
    });
  });

  describe('removeFromModerationQueue', () => {
    it('removes the opportunity from the cached queue and returns the previous queue', async () => {
      const first = buildOpportunity('opp-1');
      const second = buildOpportunity('opp-2');

      queryClient.setQueryData<Opportunity[]>(opportunityKeys.moderation(), [first, second]);

      const previousQueue = await removeFromModerationQueue(queryClient, 'opp-1');

      expect(previousQueue).toEqual([first, second]);
      expect(queryClient.getQueryData(opportunityKeys.moderation())).toEqual([second]);
    });

    it('returns undefined and caches nothing when the queue was never loaded', async () => {
      const previousQueue = await removeFromModerationQueue(queryClient, 'opp-1');

      expect(previousQueue).toBeUndefined();
      expect(queryClient.getQueryData(opportunityKeys.moderation())).toBeUndefined();
    });
  });

  describe('restoreModerationQueue', () => {
    it('puts the previous queue back after a failed moderation', async () => {
      const first = buildOpportunity('opp-1');

      queryClient.setQueryData<Opportunity[]>(opportunityKeys.moderation(), [first]);

      const previousQueue = await removeFromModerationQueue(queryClient, 'opp-1');

      restoreModerationQueue(queryClient, previousQueue);

      expect(queryClient.getQueryData(opportunityKeys.moderation())).toEqual([first]);
    });

    it('does nothing without a snapshot', () => {
      restoreModerationQueue(queryClient, undefined);

      expect(queryClient.getQueryData(opportunityKeys.moderation())).toBeUndefined();
    });
  });
});
