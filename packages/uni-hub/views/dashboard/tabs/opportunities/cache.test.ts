import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MutationObserver, QueryClient } from '@tanstack/react-query';
import type { Opportunity } from '@core/types/opportunities';
import {
  invalidateOpportunities,
  isLastPendingAcceptanceToggle,
  isLastPendingModeration,
  removeFromModerationQueue,
  restoreModerationQueue,
  restoreOpportunityAcceptance,
  updateOpportunityAcceptance,
} from './cache';
import { moderateMutationKey, opportunityKeys, toggleAcceptanceMutationKey } from './queryKeys';
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

  describe('isLastPendingModeration', () => {
    function startModeration(): { finish: () => Promise<void> } {
      let resolveRequest: () => void = () => {};
      const request = new Promise<void>((resolve) => {
        resolveRequest = resolve;
      });
      const observer = new MutationObserver(queryClient, {
        mutationKey: moderateMutationKey,
        mutationFn: () => request,
      });
      const settled = observer.mutate();

      return {
        finish: async () => {
          resolveRequest();
          await settled;
        },
      };
    }

    function pendingModerations(): number {
      return queryClient.isMutating({ mutationKey: moderateMutationKey });
    }

    it('is true when no other moderation is in flight', async () => {
      const only = startModeration();

      await vi.waitFor(() => expect(pendingModerations()).toBe(1));

      expect(isLastPendingModeration(queryClient)).toBe(true);

      await only.finish();
    });

    it('is false while another moderation is still in flight', async () => {
      const first = startModeration();
      const second = startModeration();

      await vi.waitFor(() => expect(pendingModerations()).toBe(2));

      expect(isLastPendingModeration(queryClient)).toBe(false);

      await first.finish();

      expect(isLastPendingModeration(queryClient)).toBe(true);

      await second.finish();
    });
  });

  describe('updateOpportunityAcceptance', () => {
    it('optimistically updates detail, mine, and catalog queries and returns the previous state', async () => {
      const opp = { ...buildOpportunity('opp-1'), acceptsApplications: true };

      queryClient.setQueryData(opportunityKeys.detail('opp-1'), opp);
      queryClient.setQueryData(opportunityKeys.mine(), [opp]);
      queryClient.setQueryData(opportunityKeys.catalog(), [opp]);

      const previous = await updateOpportunityAcceptance(queryClient, 'opp-1', false);

      expect(previous.detail?.acceptsApplications).toBe(true);
      expect(previous.mine?.[0]?.acceptsApplications).toBe(true);
      expect(previous.catalog?.[0]?.acceptsApplications).toBe(true);

      expect(
        queryClient.getQueryData<Opportunity>(opportunityKeys.detail('opp-1'))?.acceptsApplications,
      ).toBe(false);
      expect(
        queryClient.getQueryData<Opportunity[]>(opportunityKeys.mine())?.[0]?.acceptsApplications,
      ).toBe(false);
      expect(
        queryClient.getQueryData<Opportunity[]>(opportunityKeys.catalog())?.[0]
          ?.acceptsApplications,
      ).toBe(false);
    });
  });

  describe('restoreOpportunityAcceptance', () => {
    it('restores previous opportunity states upon error', () => {
      const previous = {
        detail: { ...buildOpportunity('opp-1'), acceptsApplications: true },
        mine: [{ ...buildOpportunity('opp-1'), acceptsApplications: true }],
        catalog: [{ ...buildOpportunity('opp-1'), acceptsApplications: true }],
      };

      restoreOpportunityAcceptance(queryClient, 'opp-1', previous);

      expect(
        queryClient.getQueryData<Opportunity>(opportunityKeys.detail('opp-1'))?.acceptsApplications,
      ).toBe(true);
      expect(
        queryClient.getQueryData<Opportunity[]>(opportunityKeys.mine())?.[0]?.acceptsApplications,
      ).toBe(true);
      expect(
        queryClient.getQueryData<Opportunity[]>(opportunityKeys.catalog())?.[0]
          ?.acceptsApplications,
      ).toBe(true);
    });

    it('does nothing without previous state', () => {
      restoreOpportunityAcceptance(queryClient, 'opp-1', undefined);

      expect(queryClient.getQueryData(opportunityKeys.detail('opp-1'))).toBeUndefined();
    });
  });

  describe('isLastPendingAcceptanceToggle', () => {
    function startToggle(): { finish: () => Promise<void> } {
      let resolveRequest: () => void = () => {};
      const request = new Promise<void>((resolve) => {
        resolveRequest = resolve;
      });
      const observer = new MutationObserver(queryClient, {
        mutationKey: toggleAcceptanceMutationKey,
        mutationFn: () => request,
      });
      const settled = observer.mutate();

      return {
        finish: async () => {
          resolveRequest();
          await settled;
        },
      };
    }

    function pendingToggles(): number {
      return queryClient.isMutating({ mutationKey: toggleAcceptanceMutationKey });
    }

    it('is true when no other toggle is in flight', async () => {
      const only = startToggle();

      await vi.waitFor(() => expect(pendingToggles()).toBe(1));

      expect(isLastPendingAcceptanceToggle(queryClient)).toBe(true);

      await only.finish();
    });

    it('is false while another toggle is still in flight', async () => {
      const first = startToggle();
      const second = startToggle();

      await vi.waitFor(() => expect(pendingToggles()).toBe(2));

      expect(isLastPendingAcceptanceToggle(queryClient)).toBe(false);

      await first.finish();

      expect(isLastPendingAcceptanceToggle(queryClient)).toBe(true);

      await second.finish();
    });
  });
});
