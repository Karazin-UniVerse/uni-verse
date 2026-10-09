import React, { useState } from 'react';
import { useToast } from '@una';
import { safeStorage } from '@uni-hub/services/api.storage';
import { parseJwt } from '@uni-hub/utils/jwt';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type {
  Opportunity,
  OpportunityApplication,
  OpportunityLifecycle,
  OpportunityAppStatus,
} from '@uni-hub/types';
import type { CreateOpportunityFormData, RejectModalState } from './types';
import { OPPORTUNITY_SUB_TAB, type OpportunitySubTab } from './constants';

export interface UseOpportunityModalsProps {
  activeSubTab: OpportunitySubTab;
  setActiveSubTab: (tab: OpportunitySubTab) => void;
  fetchMyOpportunities: () => Promise<void>;
  fetchMyApplications: () => Promise<void>;
  setMyApplications: React.Dispatch<React.SetStateAction<OpportunityApplication[]>>;
  setModerationQueue: React.Dispatch<React.SetStateAction<Opportunity[]>>;
}

export function useOpportunityModals({
  activeSubTab,
  setActiveSubTab,
  fetchMyOpportunities,
  fetchMyApplications,
  setMyApplications,
  setModerationQueue,
}: UseOpportunityModalsProps) {
  const toast = useToast();
  const { formatMessage } = useLanguage();

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

  const handleCreateSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
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
      setActiveSubTab(OPPORTUNITY_SUB_TAB.MyOpportunities);
    } catch (err: unknown) {
      toast.error((err as Error).message || formatMessage('opportunities.toast.createError'));
    } finally {
      setCreating(false);
    }
  };

  const handleApplySubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedOpportunity) return;

    setApplying(true);

    try {
      const token = safeStorage.getItem('accessToken');
      const jwt = token ? parseJwt(token) : null;
      const defaultApplicantName = formatMessage('opportunities.applyModal.defaultApplicantName');
      const applicantName = jwt?.name || jwt?.email || defaultApplicantName;
      const contactInfo = applyContactInfo.trim() || jwt?.email || '';

      await opportunitiesApi.apply(selectedOpportunity.id, {
        applicantName,
        contactInfo,
        motivation: applyMotivation.trim(),
      });

      setIsApplyModalOpen(false);
      setApplyMotivation('');
      setApplyContactInfo('');
      toast.success(formatMessage('opportunities.toast.applySuccess'));

      if (activeSubTab === OPPORTUNITY_SUB_TAB.MyApplications) {
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

      if (selectedOpportunity?.id === id) {
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

      if (selectedOpportunity?.id === id) {
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
  ): Promise<boolean> => {
    try {
      await opportunitiesApi.moderate(id, action, comment);
      setModerationQueue((prev) => prev.filter((item) => item.id !== id));
      const toastMap = {
        APPROVE: 'opportunities.toast.approved',
        REJECT: 'opportunities.toast.rejected',
        REQUIRE_CHANGES: 'opportunities.toast.requiresChanges',
      } as const;

      toast.success(formatMessage(toastMap[action]));

      return true;
    } catch (err: unknown) {
      toast.error((err as Error).message || formatMessage('opportunities.toast.moderateError'));

      return false;
    }
  };

  return {
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
