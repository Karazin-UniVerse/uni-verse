'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Briefcase,
  ShieldCheck,
  Users,
  FileText,
  Check,
} from 'lucide-react';
import { Button } from '@una';
import { safeStorage } from '@uni-hub/services/api.storage';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { parseJwt } from '@uni-hub/utils/jwt';
import type {
  Opportunity,
  OpportunityApplication,
  OpportunityPaymentType,
  OpportunityLifecycle,
  OpportunityAppStatus,
} from '@uni-hub/types';
import styles from './OpportunitiesTab.module.scss';
import {
  type SubTabKey,
  type CreateOpportunityFormData,
  type RejectModalState,
  CatalogTab,
  MyOpportunitiesTab,
  MyApplicationsTab,
  ModerationQueueTab,
  OpportunityDetailModal,
  CreateOpportunityModal,
  ApplyOpportunityModal,
  ApplicantsModal,
  ModerationRejectModal,
} from './opportunities';

export interface OpportunitiesTabProps {
  soundEnabled?: boolean;
}

export const OpportunitiesTab: React.FC<OpportunitiesTabProps> = () => {
  const [activeSubTab, setActiveSubTab] = useState<SubTabKey>('catalog');
  const [loading, setLoading] = useState(true);

  // User identity & role from JWT
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

  // Catalog state
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<OpportunityPaymentType | ''>('');

  // My items
  const [myOpportunities, setMyOpportunities] = useState<Opportunity[]>([]);
  const [myApplications, setMyApplications] = useState<OpportunityApplication[]>([]);

  // Moderation
  const [moderationQueue, setModerationQueue] = useState<Opportunity[]>([]);

  // Modals
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

  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const isModeratorOrAdmin = userRole === 'MODERATOR' || userRole === 'ADMIN';

  // Fetch catalog opportunities
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

  // Fetch my opportunities
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

  // Fetch my applications
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

  // Fetch moderation queue
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

  // Load data when active subtab changes
  useEffect(() => {
    if (activeSubTab === 'catalog') {
      void fetchCatalog();
    } else if (activeSubTab === 'my-opportunities') {
      void fetchMyOpportunities();
    } else if (activeSubTab === 'my-applications') {
      void fetchMyApplications();
    } else if (activeSubTab === 'moderation') {
      void fetchModerationQueue();
    }
  }, [
    activeSubTab,
    fetchCatalog,
    fetchMyOpportunities,
    fetchMyApplications,
    fetchModerationQueue,
  ]);

  // Pre-fetch moderation count if user is moderator or admin
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

  // Show temporary action message
  const showFeedback = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 4000);
  };

  // Submit opportunity creation
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

      showFeedback('Можливість успішно створена як чернетка!');
      setActiveSubTab('my-opportunities');
    } catch (err: unknown) {
      alert((err as Error).message || 'Помилка створення можливості');
    } finally {
      setCreating(false);
    }
  };

  // Submit application
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOpportunity) return;

    setApplying(true);

    try {
      await opportunitiesApi.apply(selectedOpportunity.id, {
        applicantName: 'Студент Каразінського університету',
        contactInfo: applyContactInfo.trim() || 'Вказано в профілі',
        motivation: applyMotivation.trim(),
      });

      setIsApplyModalOpen(false);
      setApplyMotivation('');
      setApplyContactInfo('');
      showFeedback('Ваш відгук успішно надіслано організатору!');

      if (activeSubTab === 'my-applications') {
        void fetchMyApplications();
      }
    } catch (err: unknown) {
      alert((err as Error).message || 'Не вдалося подати відгук');
    } finally {
      setApplying(false);
    }
  };

  // Send draft to review
  const handleSendToReview = async (id: string) => {
    try {
      await opportunitiesApi.changeStatus(id, 'READY_FOR_REVIEW');
      showFeedback('Можливість надіслана на модерацію!');
      void fetchMyOpportunities();

      if (selectedOpportunity && selectedOpportunity.id === id) {
        setSelectedOpportunity({ ...selectedOpportunity, status: 'READY_FOR_REVIEW' });
      }
    } catch (err: unknown) {
      alert((err as Error).message || 'Помилка');
    }
  };

  // Change lifecycle state
  const handleLifecycleChange = async (id: string, state: OpportunityLifecycle) => {
    try {
      await opportunitiesApi.changeLifecycle(id, state);
      showFeedback('Стан проекту оновлено');
      void fetchMyOpportunities();

      if (selectedOpportunity && selectedOpportunity.id === id) {
        setSelectedOpportunity({ ...selectedOpportunity, lifecycleState: state });
      }
    } catch (err: unknown) {
      alert((err as Error).message || 'Помилка');
    }
  };

  // View applicants for an opportunity
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

  // Update applicant response status
  const handleUpdateAppStatus = async (appId: string, status: OpportunityAppStatus) => {
    try {
      await opportunitiesApi.updateApplicationStatus(appId, status);
      setActiveOpportunityApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status } : a)),
      );
    } catch (err: unknown) {
      alert((err as Error).message || 'Помилка оновлення статусу');
    }
  };

  // Withdraw my application
  const handleWithdrawApplication = async (appId: string) => {
    if (!confirm('Ви впевнені, що бажаєте відкликати свій відгук?')) return;

    try {
      await opportunitiesApi.withdrawApplication(appId);
      setMyApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: 'WITHDRAWN' } : a)),
      );
      showFeedback('Відгук відкликано');
    } catch (err: unknown) {
      alert((err as Error).message || 'Помилка');
    }
  };

  // Moderation action
  const handleModerate = async (
    id: string,
    action: 'APPROVE' | 'REJECT' | 'REQUIRE_CHANGES',
    comment?: string,
  ) => {
    try {
      await opportunitiesApi.moderate(id, action, comment);
      setModerationQueue((prev) => prev.filter((item) => item.id !== id));
      showFeedback(
        action === 'APPROVE'
          ? 'Можливість схвалено та опубліковано в каталозі!'
          : action === 'REJECT'
            ? 'Можливість відхилено'
            : 'Можливість повернуто на доопрацювання автору',
      );
    } catch (err: unknown) {
      alert((err as Error).message || 'Помилка модерації');
    }
  };

  return (
    <div className={styles.container}>
      {actionMessage && (
        <div className={styles.feedbackBanner} role="status">
          <Check size={18} style={{ color: 'var(--success-color, #10b981)' }} />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Top Segmented Navigation & Action */}
      <div className={styles.topBar}>
        <div className={styles.segmentedControl} role="tablist">
          <button
            type="button"
            className={`${styles.segmentItem} ${activeSubTab === 'catalog' ? styles.activeSegment : ''}`}
            onClick={() => setActiveSubTab('catalog')}
          >
            <Briefcase size={16} />
            Каталог
          </button>
          <button
            type="button"
            className={`${styles.segmentItem} ${activeSubTab === 'my-opportunities' ? styles.activeSegment : ''}`}
            onClick={() => setActiveSubTab('my-opportunities')}
          >
            <FileText size={16} />
            Мої можливості
          </button>
          <button
            type="button"
            className={`${styles.segmentItem} ${activeSubTab === 'my-applications' ? styles.activeSegment : ''}`}
            onClick={() => setActiveSubTab('my-applications')}
          >
            <Users size={16} />
            Мої відгуки
          </button>

          <button
            type="button"
            className={`${styles.segmentItem} ${activeSubTab === 'moderation' ? styles.activeSegment : ''}`}
            onClick={() => setActiveSubTab('moderation')}
          >
            <ShieldCheck size={16} />
            Модерація
            {moderationQueue.length > 0 && (
              <span className={styles.badgePill}>{moderationQueue.length}</span>
            )}
          </button>
        </div>

        <div className={styles.createBtnWrapper}>
          <Button
            variant="primary"
            size="medium"
            onClick={() => setIsCreateModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={16} />
            Створити можливість
          </Button>
        </div>
      </div>

      {/* SubTab Views */}
      {activeSubTab === 'catalog' && (
        <CatalogTab
          loading={loading}
          opportunities={opportunities}
          search={search}
          onSearchChange={setSearch}
          paymentFilter={paymentFilter}
          onPaymentFilterChange={setPaymentFilter}
          onOpenDetail={(item) => {
            setSelectedOpportunity(item);
            setIsDetailModalOpen(true);
          }}
        />
      )}

      {activeSubTab === 'my-opportunities' && (
        <MyOpportunitiesTab
          loading={loading}
          myOpportunities={myOpportunities}
          onOpenApplicants={handleOpenApplicants}
          onOpenDetail={(item) => {
            setSelectedOpportunity(item);
            setIsDetailModalOpen(true);
          }}
        />
      )}

      {activeSubTab === 'my-applications' && (
        <MyApplicationsTab
          loading={loading}
          myApplications={myApplications}
          onWithdraw={handleWithdrawApplication}
        />
      )}

      {activeSubTab === 'moderation' && (
        <ModerationQueueTab
          loading={loading}
          moderationQueue={moderationQueue}
          onModerate={handleModerate}
          onOpenRejectModal={(id) => setRejectModal({ open: true, id, comment: '' })}
        />
      )}

      {/* Modals */}
      <OpportunityDetailModal
        open={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        opportunity={selectedOpportunity}
        userId={userId}
        onSendToReview={handleSendToReview}
        onLifecycleChange={handleLifecycleChange}
        onOpenApply={() => {
          setIsDetailModalOpen(false);
          setIsApplyModalOpen(true);
        }}
      />

      <CreateOpportunityModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        formData={createFormData}
        setFormData={setCreateFormData}
        onSubmit={handleCreateSubmit}
        submitting={creating}
      />

      <ApplyOpportunityModal
        open={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        opportunityTitle={selectedOpportunity?.title}
        motivation={applyMotivation}
        onMotivationChange={setApplyMotivation}
        contactInfo={applyContactInfo}
        onContactInfoChange={setApplyContactInfo}
        onSubmit={handleApplySubmit}
        submitting={applying}
      />

      <ApplicantsModal
        open={isApplicantsModalOpen}
        onClose={() => setIsApplicantsModalOpen(false)}
        applications={activeOpportunityApplications}
        loading={loadingApplicants}
        onUpdateStatus={handleUpdateAppStatus}
      />

      <ModerationRejectModal
        rejectModal={rejectModal}
        onClose={() => setRejectModal({ open: false, id: null, comment: '' })}
        onCommentChange={(comment) => setRejectModal((prev) => ({ ...prev, comment }))}
        onConfirm={(id, action, comment) => {
          void handleModerate(id, action, comment);
          setRejectModal({ open: false, id: null, comment: '' });
        }}
      />
    </div>
  );
};
