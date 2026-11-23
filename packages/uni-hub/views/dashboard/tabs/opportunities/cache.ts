import type { QueryClient } from '@tanstack/react-query';
import type { Opportunity, OpportunityListItem } from '@core/types/opportunities';
import { favoriteMutationKey, moderateMutationKey, opportunityKeys } from './queryKeys';

export function invalidateOpportunities(
  queryClient: QueryClient,
  options?: { throwOnError?: boolean },
): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: opportunityKeys.all }, options);
}

export function invalidateFavorites(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: opportunityKeys.favorites(), exact: true });
}

export function isLastPendingFavorite(queryClient: QueryClient): boolean {
  return queryClient.isMutating({ mutationKey: favoriteMutationKey }) <= 1;
}

export function applyFavoriteChange(
  queryClient: QueryClient,
  opportunityId: string,
  isFavorite: boolean,
): void {
  queryClient.setQueryData<OpportunityListItem[]>(opportunityKeys.favorites(), (current) => {
    if (!current) {
      return current;
    }

    if (isFavorite) {
      return current.filter((item) => item.id !== opportunityId);
    }

    if (current.some((item) => item.id === opportunityId)) {
      return current;
    }

    const catalogItem = queryClient
      .getQueryData<OpportunityListItem[]>(opportunityKeys.catalog())
      ?.find((item) => item.id === opportunityId);
    const detailItem = queryClient.getQueryData<OpportunityListItem>(
      opportunityKeys.detail(opportunityId),
    );
    const itemToAdd = catalogItem ?? detailItem;

    return itemToAdd ? [itemToAdd, ...current] : current;
  });
}

export function isLastPendingModeration(queryClient: QueryClient): boolean {
  return queryClient.isMutating({ mutationKey: moderateMutationKey }) <= 1;
}

export async function removeFromModerationQueue(
  queryClient: QueryClient,
  opportunityId: string,
): Promise<Opportunity[] | undefined> {
  await queryClient.cancelQueries({ queryKey: opportunityKeys.moderation() });

  const previousQueue = queryClient.getQueryData<Opportunity[]>(opportunityKeys.moderation());

  queryClient.setQueryData<Opportunity[]>(opportunityKeys.moderation(), (queue) =>
    queue?.filter((item) => item.id !== opportunityId),
  );

  return previousQueue;
}

export function restoreModerationQueue(
  queryClient: QueryClient,
  previousQueue: Opportunity[] | undefined,
): void {
  if (!previousQueue) {
    return;
  }

  queryClient.setQueryData<Opportunity[]>(opportunityKeys.moderation(), previousQueue);
}
