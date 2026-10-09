import { useState, useEffect, useCallback, useRef } from 'react';
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

  const activeSubTabRef = useRef(activeSubTab);
  const catalogRequestId = useRef(0);
  const myOpportunitiesRequestId = useRef(0);
  const myApplicationsRequestId = useRef(0);
  const moderationQueueRequestId = useRef(0);

  useEffect(() => {
    activeSubTabRef.current = activeSubTab;
  }, [activeSubTab]);

  const fetchCatalog = useCallback(async () => {
    const requestId = ++catalogRequestId.current;

    if (activeSubTabRef.current === OPPORTUNITY_SUB_TAB.Catalog) {
      setLoading(true);
    }

    try {
      const res = await opportunitiesApi.getOpportunities();

      if (
        requestId === catalogRequestId.current &&
        activeSubTabRef.current === OPPORTUNITY_SUB_TAB.Catalog
      ) {
        setOpportunities(Array.isArray(res.data) ? res.data : []);
      }
    } catch {
      if (
        requestId === catalogRequestId.current &&
        activeSubTabRef.current === OPPORTUNITY_SUB_TAB.Catalog
      ) {
        setOpportunities([]);
      }
    } finally {
      if (
        requestId === catalogRequestId.current &&
        activeSubTabRef.current === OPPORTUNITY_SUB_TAB.Catalog
      ) {
        setLoading(false);
      }
    }
  }, []);

  const fetchMyOpportunities = useCallback(async () => {
    const requestId = ++myOpportunitiesRequestId.current;

    if (activeSubTabRef.current === OPPORTUNITY_SUB_TAB.MyOpportunities) {
      setLoading(true);
    }

    try {
      const res = await opportunitiesApi.getMyOpportunities();

      if (
        requestId === myOpportunitiesRequestId.current &&
        activeSubTabRef.current === OPPORTUNITY_SUB_TAB.MyOpportunities
      ) {
        setMyOpportunities(Array.isArray(res.data) ? res.data : []);
      }
    } catch {
      if (
        requestId === myOpportunitiesRequestId.current &&
        activeSubTabRef.current === OPPORTUNITY_SUB_TAB.MyOpportunities
      ) {
        setMyOpportunities([]);
      }
    } finally {
      if (
        requestId === myOpportunitiesRequestId.current &&
        activeSubTabRef.current === OPPORTUNITY_SUB_TAB.MyOpportunities
      ) {
        setLoading(false);
      }
    }
  }, []);

  const fetchMyApplications = useCallback(async () => {
    const requestId = ++myApplicationsRequestId.current;

    if (activeSubTabRef.current === OPPORTUNITY_SUB_TAB.MyApplications) {
      setLoading(true);
    }

    try {
      const res = await opportunitiesApi.getMyApplications();

      if (
        requestId === myApplicationsRequestId.current &&
        activeSubTabRef.current === OPPORTUNITY_SUB_TAB.MyApplications
      ) {
        setMyApplications(Array.isArray(res.data) ? res.data : []);
      }
    } catch {
      if (
        requestId === myApplicationsRequestId.current &&
        activeSubTabRef.current === OPPORTUNITY_SUB_TAB.MyApplications
      ) {
        setMyApplications([]);
      }
    } finally {
      if (
        requestId === myApplicationsRequestId.current &&
        activeSubTabRef.current === OPPORTUNITY_SUB_TAB.MyApplications
      ) {
        setLoading(false);
      }
    }
  }, []);

  const fetchModerationQueue = useCallback(async () => {
    const requestId = ++moderationQueueRequestId.current;

    if (activeSubTabRef.current === OPPORTUNITY_SUB_TAB.Moderation) {
      setLoading(true);
    }

    try {
      const res = await opportunitiesApi.getOpportunities({ status: 'READY_FOR_REVIEW' });

      if (
        requestId === moderationQueueRequestId.current &&
        activeSubTabRef.current === OPPORTUNITY_SUB_TAB.Moderation
      ) {
        setModerationQueue(Array.isArray(res.data) ? res.data : []);
      }
    } catch {
      if (
        requestId === moderationQueueRequestId.current &&
        activeSubTabRef.current === OPPORTUNITY_SUB_TAB.Moderation
      ) {
        setModerationQueue([]);
      }
    } finally {
      if (
        requestId === moderationQueueRequestId.current &&
        activeSubTabRef.current === OPPORTUNITY_SUB_TAB.Moderation
      ) {
        setLoading(false);
      }
    }
  }, []);

  /* oxlint-disable react/set-state-in-effect */
  useEffect(() => {
    if (activeSubTab === OPPORTUNITY_SUB_TAB.Catalog) {
      void fetchCatalog();
    } else if (activeSubTab === OPPORTUNITY_SUB_TAB.MyOpportunities) {
      void fetchMyOpportunities();
    } else if (activeSubTab === OPPORTUNITY_SUB_TAB.MyApplications) {
      void fetchMyApplications();
    } else if (activeSubTab === OPPORTUNITY_SUB_TAB.Moderation) {
      void fetchModerationQueue();
    }
  }, [activeSubTab, fetchCatalog, fetchMyOpportunities, fetchMyApplications, fetchModerationQueue]);
  /* oxlint-enable react/set-state-in-effect */

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
