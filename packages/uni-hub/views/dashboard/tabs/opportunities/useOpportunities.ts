import { useState, useEffect, useCallback } from 'react';
import { safeStorage } from '@uni-hub/services/api.storage';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { parseJwt } from '@uni-hub/utils/jwt';
import { useToast } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type {
  Opportunity,
  OpportunityApplication,
  OpportunityPaymentType,
  OpportunityLifecycle,
  OpportunityAppStatus,
} from '@uni-hub/types';
import type { SubTabKey, CreateOpportunityFormData, RejectModalState } from './types';

export function useOpportunities() {
  const toast = useToast();
  const { formatMessage } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<SubTabKey>('catalog');
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

  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState<CreateOpportunityFormData>({
    title: '',
    description: '',
    ownerContactInfo: '',
    paymentType: 'UNPAID',
    paymentDetails: '',
  });
  const [creating, setCreating] = useState(false);

  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applyMotivation, setApplyMotivation] = useState('');
  const [applyContactInfo, setApplyContactInfo] = useState('');
  const [applying, setApplying] = useState(false);

  const [isApplicantsModalOpen, setIsApplicantsModalOpen] = useState(false);
  const [activeOpportunityApplications, setActiveOpportunityApplications] = useState<
    OpportunityApplication[]
  >([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  const [rejectModal, setRejectModal] = useState<RejectModalState>({
    open: false,
    id: null,
    comment: '',
  });

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
      if (activeSubTab === 'catalog') {
        void fetchCatalog();
      } else if (activeSubTab === 'my-opportunities') {
        void fetchMyOpportunities();
      } else if (activeSubTab === 'my-applications') {
        void fetchMyApplications();
      } else if (activeSubTab === 'moderation') {
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

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      await opportunitiesApi.createOpportunity({
        title: createFormData.title.trim(),
        description: createFormData.description.trim(),
        ownerContactInfo: createFormData.ownerContactInfo.trim(),
        paymentType: createFormData.paymentType,
        paymentDetails: createFormData.paymentDetails.trim() || undefined,
      });

      setIsCreateModalOpen(false);
      setCreateFormData({
        title: '',
        description: '',
        ownerContactInfo: '',
        paymentType: 'UNPAID',
        paymentDetails: '',
      });

      toast.success(formatMessage('opportunities.toast.createdDraft'));
      setActiveSubTab('my-opportunities');
    } catch (err: unknown) {
      toast.error((err as Error).message || formatMessage('opportunities.toast.createError'));
    } finally {
      setCreating(false);
    }
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOpportunity) return;

    setApplying(true);

    try {
      await opportunitiesApi.apply(selectedOpportunity.id, {
        applicantName: 'Студент', // Could also be translated or drawn from profile
        contactInfo: applyContactInfo.trim() || 'Вказано в профілі',
        motivation: applyMotivation.trim(),
      });

      setIsApplyModalOpen(false);
      setApplyMotivation('');
      setApplyContactInfo('');
      toast.success(formatMessage('opportunities.toast.applySuccess'));

      if (activeSubTab === 'my-applications') {
        void fetchMyApplications();
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || formatMessage('opportunities.toast.applyError'));
    } finally {
      setApplying(false);
    }
  };

  const handleSendToReview = async (id: string) => {
    try {
      await opportunitiesApi.changeStatus(id, 'READY_FOR_REVIEW');
      toast.success(formatMessage('opportunities.toast.sentToReview'));
      void fetchMyOpportunities();

      if (selectedOpportunity && selectedOpportunity.id === id) {
        setSelectedOpportunity({ ...selectedOpportunity, status: 'READY_FOR_REVIEW' });
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || formatMessage('opportunities.toast.genericError'));
    }
  };

  const handleLifecycleChange = async (id: string, state: OpportunityLifecycle) => {
    try {
      await opportunitiesApi.changeLifecycle(id, state);
      toast.success(formatMessage('opportunities.toast.stateUpdated'));
      void fetchMyOpportunities();

      if (selectedOpportunity && selectedOpportunity.id === id) {
        setSelectedOpportunity({ ...selectedOpportunity, lifecycleState: state });
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || formatMessage('opportunities.toast.genericError'));
    }
  };

  const handleOpenApplicants = async (opp: Opportunity) => {
    setSelectedOpportunity(opp);
    setIsApplicantsModalOpen(true);
    setLoadingApplicants(true);

    try {
      const res = await opportunitiesApi.getOpportunityApplications(opp.id);

      setActiveOpportunityApplications(Array.isArray(res.data) ? res.data : []);
    } catch {
      setActiveOpportunityApplications([]);
    } finally {
      setLoadingApplicants(false);
    }
  };

  const handleUpdateAppStatus = async (appId: string, status: OpportunityAppStatus) => {
    try {
      await opportunitiesApi.updateApplicationStatus(appId, status);
      setActiveOpportunityApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status } : a)),
      );
    } catch (err: unknown) {
      toast.error((err as Error).message || formatMessage('opportunities.toast.statusUpdateError'));
    }
  };

  const handleWithdrawApplication = async (appId: string) => {
    if (!window.confirm(formatMessage('opportunities.confirm.withdraw'))) return;

    try {
      await opportunitiesApi.withdrawApplication(appId);
      setMyApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: 'WITHDRAWN' } : a)),
      );
      toast.success(formatMessage('opportunities.toast.withdrawn'));
    } catch (err: unknown) {
      toast.error((err as Error).message || formatMessage('opportunities.toast.genericError'));
    }
  };

  const handleModerate = async (
    id: string,
    action: 'APPROVE' | 'REJECT' | 'REQUIRE_CHANGES',
    comment?: string,
  ) => {
    try {
      await opportunitiesApi.moderate(id, action, comment);
      setModerationQueue((prev) => prev.filter((item) => item.id !== id));
      const toastMap = {
        APPROVE: 'opportunities.toast.approved',
        REJECT: 'opportunities.toast.rejected',
        REQUIRE_CHANGES: 'opportunities.toast.requiresChanges',
      } as const;

      toast.success(formatMessage(toastMap[action]));
    } catch (err: unknown) {
      toast.error((err as Error).message || formatMessage('opportunities.toast.moderateError'));
    }
  };

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
    myApplications,
    moderationQueue,
    selectedOpportunity,
    setSelectedOpportunity,
    isDetailModalOpen,
    setIsDetailModalOpen,
    isCreateModalOpen,
    setIsCreateModalOpen,
    createFormData,
    setCreateFormData,
    creating,
    isApplyModalOpen,
    setIsApplyModalOpen,
    applyMotivation,
    setApplyMotivation,
    applyContactInfo,
    setApplyContactInfo,
    applying,
    isApplicantsModalOpen,
    setIsApplicantsModalOpen,
    activeOpportunityApplications,
    loadingApplicants,
    rejectModal,
    setRejectModal,
    isModeratorOrAdmin,
    handleCreateSubmit,
    handleApplySubmit,
    handleSendToReview,
    handleLifecycleChange,
    handleOpenApplicants,
    handleUpdateAppStatus,
    handleWithdrawApplication,
    handleModerate,
  };
}
