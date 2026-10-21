import type { QueryClient } from '@tanstack/react-query';
import type { Opportunity } from '@core/types/opportunities';
import { moderateMutationKey, opportunityKeys } from './queryKeys';

export function invalidateOpportunities(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: opportunityKeys.all });
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
