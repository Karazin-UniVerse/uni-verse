import type { QueryClient } from '@tanstack/react-query';
import type { Opportunity } from '@core/types/opportunities';
import { moderateMutationKey, opportunityKeys, toggleAcceptanceMutationKey } from './queryKeys';

export function invalidateOpportunities(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: opportunityKeys.all });
}

export function isLastPendingModeration(queryClient: QueryClient): boolean {
  return queryClient.isMutating({ mutationKey: moderateMutationKey }) <= 1;
}

export function isLastPendingAcceptanceToggle(queryClient: QueryClient): boolean {
  return queryClient.isMutating({ mutationKey: toggleAcceptanceMutationKey }) <= 1;
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

export interface PreviousOpportunityAcceptanceState {
  detail?: Opportunity;
  mine?: Opportunity[];
  catalog?: Opportunity[];
}

export async function updateOpportunityAcceptance(
  queryClient: QueryClient,
  opportunityId: string,
  acceptsApplications: boolean,
): Promise<PreviousOpportunityAcceptanceState> {
  await queryClient.cancelQueries({ queryKey: opportunityKeys.detail(opportunityId) });
  await queryClient.cancelQueries({ queryKey: opportunityKeys.mine() });
  await queryClient.cancelQueries({ queryKey: opportunityKeys.catalog() });

  const previousState: PreviousOpportunityAcceptanceState = {
    detail: queryClient.getQueryData<Opportunity>(opportunityKeys.detail(opportunityId)),
    mine: queryClient.getQueryData<Opportunity[]>(opportunityKeys.mine()),
    catalog: queryClient.getQueryData<Opportunity[]>(opportunityKeys.catalog()),
  };

  queryClient.setQueryData<Opportunity>(opportunityKeys.detail(opportunityId), (item) =>
    item ? { ...item, acceptsApplications } : item,
  );

  queryClient.setQueryData<Opportunity[]>(opportunityKeys.mine(), (list) =>
    list?.map((item) => (item.id === opportunityId ? { ...item, acceptsApplications } : item)),
  );

  queryClient.setQueryData<Opportunity[]>(opportunityKeys.catalog(), (list) =>
    list?.map((item) => (item.id === opportunityId ? { ...item, acceptsApplications } : item)),
  );

  return previousState;
}

export function restoreOpportunityAcceptance(
  queryClient: QueryClient,
  opportunityId: string,
  previousState: PreviousOpportunityAcceptanceState | undefined,
): void {
  if (!previousState) {
    return;
  }

  if (previousState.detail) {
    queryClient.setQueryData(opportunityKeys.detail(opportunityId), previousState.detail);
  }

  if (previousState.mine) {
    queryClient.setQueryData(opportunityKeys.mine(), previousState.mine);
  }

  if (previousState.catalog) {
    queryClient.setQueryData(opportunityKeys.catalog(), previousState.catalog);
  }
}
