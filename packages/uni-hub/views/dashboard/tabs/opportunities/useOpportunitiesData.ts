import { useState } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { Opportunity, OpportunityApplication } from '@core/types/opportunities';
import type { OpportunityPaymentType } from '@core/constants/opportunities';
import { OPPORTUNITY_SUB_TAB, type OpportunitySubTab } from './constants';
import {
  catalogQueryOptions,
  moderationQueueQueryOptions,
  myApplicationsQueryOptions,
  myOpportunitiesQueryOptions,
} from './queries';

export interface ListState<T> {
  items: T[];
  loading: boolean;
  isError: boolean;
  refetch: () => void;
}

function toListState<T>(query: UseQueryResult<T[]>): ListState<T> {
  return {
    items: query.data ?? [],
    loading: query.isLoading,
    isError: query.isError && query.data === undefined,
    refetch: () => {
      void query.refetch();
    },
  };
}

export function useOpportunitiesData(isModerator: boolean) {
  const [activeSubTab, setActiveSubTab] = useState<OpportunitySubTab>(OPPORTUNITY_SUB_TAB.Catalog);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<OpportunityPaymentType | ''>('');

  const catalog = useQuery({
    ...catalogQueryOptions,
    enabled: activeSubTab === OPPORTUNITY_SUB_TAB.Catalog,
  });
  const myOpportunities = useQuery({
    ...myOpportunitiesQueryOptions,
    enabled: activeSubTab === OPPORTUNITY_SUB_TAB.MyOpportunities,
  });
  const myApplications = useQuery({
    ...myApplicationsQueryOptions,
    enabled: activeSubTab === OPPORTUNITY_SUB_TAB.MyApplications,
  });
  const moderationQueue = useQuery({ ...moderationQueueQueryOptions, enabled: isModerator });

  return {
    activeSubTab,
    setActiveSubTab,
    search,
    setSearch,
    paymentFilter,
    setPaymentFilter,
    catalog: toListState<Opportunity>(catalog),
    myOpportunities: toListState<Opportunity>(myOpportunities),
    myApplications: toListState<OpportunityApplication>(myApplications),
    moderationQueue: toListState<Opportunity>(moderationQueue),
  };
}
