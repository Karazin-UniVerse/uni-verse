'use client';

import React from 'react';
import { Plus, Briefcase, ShieldCheck, Users, FileText } from 'lucide-react';
import { Button } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import styles from './OpportunitiesTab.module.scss';
import { useOpportunities } from './opportunities/useOpportunities';
import {
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
  const { formatMessage } = useLanguage();
  const {
    activeSubTab,
    setActiveSubTab,
    loading,
    userId,
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
    handleCreateSubmit,
    handleApplySubmit,
    handleSendToReview,
    handleLifecycleChange,
    handleOpenApplicants,
    handleUpdateAppStatus,
    handleWithdrawApplication,
    handleModerate,
    isModeratorOrAdmin,
  } = useOpportunities();

  return (
    <div className={styles.container}>
      {/* Top Segmented Navigation & Action */}
      <div className={styles.topBar}>
        <div className={styles.segmentedControl} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'catalog'}
            aria-controls="panel-catalog"
            className={`${styles.segmentItem} ${activeSubTab === 'catalog' ? styles.activeSegment : ''}`}
            onClick={() => setActiveSubTab('catalog')}
          >
            <Briefcase size={16} />
            {formatMessage('opportunities.tabs.catalog')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'my-opportunities'}
            aria-controls="panel-my-opportunities"
            className={`${styles.segmentItem} ${activeSubTab === 'my-opportunities' ? styles.activeSegment : ''}`}
            onClick={() => setActiveSubTab('my-opportunities')}
          >
            <FileText size={16} />
            {formatMessage('opportunities.tabs.myOpportunities')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'my-applications'}
            aria-controls="panel-my-applications"
            className={`${styles.segmentItem} ${activeSubTab === 'my-applications' ? styles.activeSegment : ''}`}
            onClick={() => setActiveSubTab('my-applications')}
          >
            <Users size={16} />
            {formatMessage('opportunities.tabs.myApplications')}
          </button>

          {isModeratorOrAdmin && (
            <button
              type="button"
              role="tab"
              aria-selected={activeSubTab === 'moderation'}
              aria-controls="panel-moderation"
              className={`${styles.segmentItem} ${activeSubTab === 'moderation' ? styles.activeSegment : ''}`}
              onClick={() => setActiveSubTab('moderation')}
            >
              <ShieldCheck size={16} />
              {formatMessage('opportunities.tabs.moderation')}
              {moderationQueue.length > 0 && (
                <span className={styles.badgePill}>{moderationQueue.length}</span>
              )}
            </button>
          )}
        </div>

        <div className={styles.createBtnWrapper}>
          <Button
            variant="primary"
            size="small"
            onClick={() => setIsCreateModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={16} />
            {formatMessage('opportunities.actions.create')}
          </Button>
        </div>
      </div>

      {/* SubTab Views */}
      <div role="tabpanel" id={`panel-${activeSubTab}`}>
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

        {activeSubTab === 'moderation' && isModeratorOrAdmin && (
          <ModerationQueueTab
            loading={loading}
            moderationQueue={moderationQueue}
            onModerate={handleModerate}
            onOpenRejectModal={(id) => setRejectModal({ open: true, id, comment: '' })}
          />
        )}
      </div>

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
