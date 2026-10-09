import { useState, useEffect, useCallback, useRef } from 'react';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { asList } from '@uni-hub/utils/arrays';
import type { Opportunity, OpportunityApplication, OpportunityPaymentType } from '@uni-hub/types';
import { OPPORTUNITY_SUB_TAB, type OpportunitySubTab } from './constants';

export interface AsyncList<T> {
  items: T[];
  loading: boolean;
  refetch: () => Promise<void>;
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
}

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
  const response = await opportunitiesApi.getOpportunities({ status: 'READY_FOR_REVIEW' });

  return asList(response.data);
}

function useAsyncList<T>(load: () => Promise<T[]>): AsyncList<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const latestRequestId = useRef(0);

  const refetch = useCallback(async (): Promise<void> => {
    const requestId = ++latestRequestId.current;

    setLoading(true);

    const loaded = await load().catch((): T[] => []);

    if (requestId !== latestRequestId.current) return;

    setItems(loaded);
    setLoading(false);
  }, [load]);

  return { items, loading, refetch, setItems };
}

export function useOpportunitiesData(isModerator: boolean) {
  const [activeSubTab, setActiveSubTab] = useState<OpportunitySubTab>(OPPORTUNITY_SUB_TAB.Catalog);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<OpportunityPaymentType | ''>('');

  const catalog = useAsyncList(loadCatalog);
  const myOpportunities = useAsyncList(loadMyOpportunities);
  const myApplications = useAsyncList(loadMyApplications);
  const moderationQueue = useAsyncList(loadModerationQueue);

  const listsBySubTab = {
    [OPPORTUNITY_SUB_TAB.Catalog]: catalog,
    [OPPORTUNITY_SUB_TAB.MyOpportunities]: myOpportunities,
    [OPPORTUNITY_SUB_TAB.MyApplications]: myApplications,
    [OPPORTUNITY_SUB_TAB.Moderation]: moderationQueue,
  };
  const { refetch: refetchActiveList } = listsBySubTab[activeSubTab];
  const { refetch: refetchModerationQueue } = moderationQueue;

  useEffect(() => {
    void refetchActiveList();
  }, [refetchActiveList]);

  useEffect(() => {
    if (isModerator) {
      void refetchModerationQueue();
    }
  }, [isModerator, refetchModerationQueue]);

  return {
    activeSubTab,
    setActiveSubTab,
    search,
    setSearch,
    paymentFilter,
    setPaymentFilter,
    catalog,
    myOpportunities,
    myApplications,
    moderationQueue,
  };
}
