import { queryOptions, type QueryClient } from '@tanstack/react-query';
import type { Opportunity, OpportunityApplication } from '@core/types/opportunities';
import { OPPORTUNITY_STATUS } from '@core/constants/opportunities';
import { normalizeTag } from '@core/utils/tags';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { asList } from '@uni-hub/utils/arrays';
import { opportunityKeys } from './queryKeys';
import { CATALOG_POLL_INTERVAL_MS } from './constants';

async function loadCatalog(): Promise<Opportunity[]> {
  const response = await opportunitiesApi.getOpportunities();

  return asList(response.data);
}

async function loadMyOpportunities(): Promise<Opportunity[]> {
  const response = await opportunitiesApi.getMyOpportunities();

  return asList(response.data);
}

async function loadMyApplications(): Promise<OpportunityApplication[]> {
  const response = await opportunitiesApi.getMyApplications();

  return asList(response.data);
}

async function loadModerationQueue(): Promise<Opportunity[]> {
  const response = await opportunitiesApi.getOpportunities({
    status: OPPORTUNITY_STATUS.READY_FOR_REVIEW,
  });

  return asList(response.data);
}

export async function loadApplicants(opportunityId: string): Promise<OpportunityApplication[]> {
  const response = await opportunitiesApi.getOpportunityApplications(opportunityId);

  return asList(response.data);
}

export function loadTagSuggestions(queryClient: QueryClient, query: string): Promise<string[]> {
  const normalizedQuery = normalizeTag(query);

  return queryClient.fetchQuery(
    queryOptions({
      queryKey: opportunityKeys.tagSuggestions(normalizedQuery),
      queryFn: async (): Promise<string[]> => {
        const response = await opportunitiesApi.getTagSuggestions(normalizedQuery);

        return response.data.map((tag) => tag.name);
      },
    }),
  );
}

export const catalogQueryOptions = queryOptions({
  queryKey: opportunityKeys.catalog(),
  queryFn: loadCatalog,
  staleTime: 0,
  refetchInterval: CATALOG_POLL_INTERVAL_MS,
});

export const myOpportunitiesQueryOptions = queryOptions({
  queryKey: opportunityKeys.mine(),
  queryFn: loadMyOpportunities,
});

export const myApplicationsQueryOptions = queryOptions({
  queryKey: opportunityKeys.applications(),
  queryFn: loadMyApplications,
});

export const moderationQueueQueryOptions = queryOptions({
  queryKey: opportunityKeys.moderation(),
  queryFn: loadModerationQueue,
});

export const opportunityDetailQueryOptions = (
  opportunityId: string,
): ReturnType<
  typeof queryOptions<Opportunity, Error, Opportunity, ReturnType<typeof opportunityKeys.detail>>
> =>
  queryOptions({
    queryKey: opportunityKeys.detail(opportunityId),
    queryFn: async () => (await opportunitiesApi.getOpportunity(opportunityId)).data,
  });
