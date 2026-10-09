import { useState, useEffect, useCallback } from 'react';
import { safeStorage } from '@uni-hub/services/api.storage';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { parseJwt } from '@uni-hub/utils/jwt';
import type { Opportunity, OpportunityApplication, OpportunityPaymentType } from '@uni-hub/types';
import { OPPORTUNITY_SUB_TAB, type OpportunitySubTab } from './constants';

export function useOpportunitiesData() {
  const [activeSubTab, setActiveSubTab] = useState<OpportunitySubTab>(OPPORTUNITY_SUB_TAB.Catalog);
  const [loading, setLoading] = useState(true);

  const [userId] = useState<string | null>(() => {
    const token = safeStorage.getItem('accessToken');

    if (!token) return null;

    return parseJwt(token)?.sub ?? null;
  });

  const [userRole] = useState<string | null>(() => {
    const token = safeStorage.getItem('accessToken');

    if (!token) return null;

    return (parseJwt(token)?.role as string) ?? null;
  });

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<OpportunityPaymentType | ''>('');

  const [myOpportunities, setMyOpportunities] = useState<Opportunity[]>([]);
  const [myApplications, setMyApplications] = useState<OpportunityApplication[]>([]);
  const [moderationQueue, setModerationQueue] = useState<Opportunity[]>([]);

  const isModeratorOrAdmin = userRole === 'OPPORTUNITIES_MODERATOR' || userRole === 'ADMIN';

  const fetchCatalog = useCallback(async () => {
    setLoading(true);

    try {
      const res = await opportunitiesApi.getOpportunities();

      setOpportunities(Array.isArray(res.data) ? res.data : []);
    } catch {
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyOpportunities = useCallback(async () => {
    setLoading(true);

    try {
      const res = await opportunitiesApi.getMyOpportunities();

      setMyOpportunities(Array.isArray(res.data) ? res.data : []);
    } catch {
      setMyOpportunities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyApplications = useCallback(async () => {
    setLoading(true);

    try {
      const res = await opportunitiesApi.getMyApplications();

      setMyApplications(Array.isArray(res.data) ? res.data : []);
    } catch {
      setMyApplications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchModerationQueue = useCallback(async () => {
    setLoading(true);

    try {
      const res = await opportunitiesApi.getOpportunities({ status: 'READY_FOR_REVIEW' });

      setModerationQueue(Array.isArray(res.data) ? res.data : []);
    } catch {
      setModerationQueue([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeSubTab === OPPORTUNITY_SUB_TAB.Catalog) {
        void fetchCatalog();
      } else if (activeSubTab === OPPORTUNITY_SUB_TAB.MyOpportunities) {
        void fetchMyOpportunities();
      } else if (activeSubTab === OPPORTUNITY_SUB_TAB.MyApplications) {
        void fetchMyApplications();
      } else if (activeSubTab === OPPORTUNITY_SUB_TAB.Moderation) {
        void fetchModerationQueue();
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [activeSubTab, fetchCatalog, fetchMyOpportunities, fetchMyApplications, fetchModerationQueue]);

  useEffect(() => {
    if (isModeratorOrAdmin) {
      opportunitiesApi
        .getOpportunities({ status: 'READY_FOR_REVIEW' })
        .then((res) => {
          if (Array.isArray(res.data)) {
            setModerationQueue(res.data);
          }
        })
        .catch(() => {});
    }
  }, [isModeratorOrAdmin]);

  return {
    activeSubTab,
    setActiveSubTab,
    loading,
    userId,
    userRole,
    opportunities,
    search,
    setSearch,
    paymentFilter,
    setPaymentFilter,
    myOpportunities,
    setMyOpportunities,
    myApplications,
    setMyApplications,
    moderationQueue,
    setModerationQueue,
    isModeratorOrAdmin,
    fetchCatalog,
    fetchMyOpportunities,
    fetchMyApplications,
    fetchModerationQueue,
  };
}
