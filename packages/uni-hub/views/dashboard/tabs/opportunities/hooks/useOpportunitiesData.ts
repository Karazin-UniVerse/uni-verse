import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { Opportunity, OpportunityApplication } from '@core/types/opportunities';
import type { OpportunityPaymentType } from '@core/constants/opportunities';
import { hasLoadFailed } from '@uni-hub/queries/load-state';
import { useOpportunitiesStore } from '@uni-hub/store/useOpportunitiesStore';
import { OPPORTUNITY_SUB_TAB, type OpportunitySubTab } from '../constants';
import {
  catalogQueryOptions,
  moderationQueueQueryOptions,
  myApplicationsQueryOptions,
  myOpportunitiesQueryOptions,
} from '../queries';

interface ListState<T> {
  items: T[];
  loading: boolean;
  isError: boolean;
  refetch: () => void;
}

interface UseOpportunitiesDataResult {
  activeSubTab: OpportunitySubTab;
  setActiveSubTab: (subTab: OpportunitySubTab) => void;
  search: string;
  setSearch: (search: string) => void;
  paymentFilter: OpportunityPaymentType | '';
  setPaymentFilter: (paymentType: OpportunityPaymentType | '') => void;
  catalog: ListState<Opportunity>;
  myOpportunities: ListState<Opportunity>;
  myApplications: ListState<OpportunityApplication>;
  moderationQueue: ListState<Opportunity>;
}

function toListState<T>(query: UseQueryResult<T[]>): ListState<T> {
  return {
    items: query.data ?? [],
    loading: query.isLoading,
    isError: hasLoadFailed(query),
    refetch: () => {
      void query.refetch();
    },
  };
}

export function useOpportunitiesData(isModerator: boolean): UseOpportunitiesDataResult {
  const activeSubTab = useOpportunitiesStore((state) => state.activeSubTab);
  const setActiveSubTab = useOpportunitiesStore((state) => state.setActiveSubTab);
  const search = useOpportunitiesStore((state) => state.search);
  const setSearch = useOpportunitiesStore((state) => state.setSearch);
  const paymentFilter = useOpportunitiesStore((state) => state.paymentFilter);
  const setPaymentFilter = useOpportunitiesStore((state) => state.setPaymentFilter);

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
