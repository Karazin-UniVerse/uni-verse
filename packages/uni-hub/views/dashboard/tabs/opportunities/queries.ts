import { queryOptions } from '@tanstack/react-query';
import type { Opportunity, OpportunityApplication } from '@core/types/opportunities';
import { OPPORTUNITY_STATUS } from '@core/constants/opportunities';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { asList } from '@uni-hub/utils/arrays';
import { opportunityKeys } from './queryKeys';

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

export const catalogQueryOptions = queryOptions({
  queryKey: opportunityKeys.catalog(),
  queryFn: loadCatalog,
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
