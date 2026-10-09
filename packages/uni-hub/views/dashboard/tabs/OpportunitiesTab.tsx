'use client';

import React from 'react';
import { Plus, Briefcase, ShieldCheck, Users, FileText } from 'lucide-react';
import { Button } from '@una';
import { ConfirmModal } from '@universe/ui';
import { ROLE } from '@core/constants/roles';
import { useCurrentUser } from '@uni-hub/hooks/useCurrentUser';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import styles from './OpportunitiesTab.module.scss';
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
  OPPORTUNITY_SUB_TAB,
} from './opportunities';
import { useApplicantActions } from './opportunities/useApplicantActions';
import { useApplicants } from './opportunities/useApplicants';
import { useCreateOpportunity } from './opportunities/useCreateOpportunity';
import { useModeration } from './opportunities/useModeration';
import { useOpportunitiesData } from './opportunities/useOpportunitiesData';
import { useOpportunityDetail } from './opportunities/useOpportunityDetail';

export interface OpportunitiesTabProps {
  soundEnabled?: boolean;
}

export const OpportunitiesTab: React.FC<OpportunitiesTabProps> = () => {
  const { formatMessage } = useLanguage();
  const currentUser = useCurrentUser();
  const isModerator = currentUser.role === ROLE.OPPORTUNITIES_MODERATOR;
  const data = useOpportunitiesData(isModerator);
  const { activeSubTab, setActiveSubTab } = data;
  const detail = useOpportunityDetail(data.myOpportunities.refetch);
  const create = useCreateOpportunity({
    onCreated: () => setActiveSubTab(OPPORTUNITY_SUB_TAB.MyOpportunities),
  });
  const applicants = useApplicants();
  const applicantActions = useApplicantActions({
    currentUser,
    selectedOpportunity: detail.selectedOpportunity,
    setApplications: data.myApplications.setItems,
  });
  const moderation = useModeration(data.moderationQueue.setItems);

  return (
    <div className={styles.container}>
      {/* Top Segmented Navigation & Action */}
      <div className={styles.topBar}>
        <div className={styles.segmentedControl} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === OPPORTUNITY_SUB_TAB.Catalog}
            aria-controls="panel-catalog"
            className={`${styles.segmentItem} ${activeSubTab === OPPORTUNITY_SUB_TAB.Catalog ? styles.activeSegment : ''}`}
            onClick={() => setActiveSubTab(OPPORTUNITY_SUB_TAB.Catalog)}
          >
            <Briefcase size={16} />
            {formatMessage('opportunities.tabs.catalog')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === OPPORTUNITY_SUB_TAB.MyOpportunities}
            aria-controls="panel-my-opportunities"
            className={`${styles.segmentItem} ${activeSubTab === OPPORTUNITY_SUB_TAB.MyOpportunities ? styles.activeSegment : ''}`}
            onClick={() => setActiveSubTab(OPPORTUNITY_SUB_TAB.MyOpportunities)}
          >
            <FileText size={16} />
            {formatMessage('opportunities.tabs.myOpportunities')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === OPPORTUNITY_SUB_TAB.MyApplications}
            aria-controls="panel-my-applications"
            className={`${styles.segmentItem} ${activeSubTab === OPPORTUNITY_SUB_TAB.MyApplications ? styles.activeSegment : ''}`}
            onClick={() => setActiveSubTab(OPPORTUNITY_SUB_TAB.MyApplications)}
          >
            <Users size={16} />
            {formatMessage('opportunities.tabs.myApplications')}
          </button>

          {isModerator && (
            <button
              type="button"
              role="tab"
              aria-selected={activeSubTab === OPPORTUNITY_SUB_TAB.Moderation}
              aria-controls="panel-moderation"
              className={`${styles.segmentItem} ${activeSubTab === OPPORTUNITY_SUB_TAB.Moderation ? styles.activeSegment : ''}`}
              onClick={() => setActiveSubTab(OPPORTUNITY_SUB_TAB.Moderation)}
            >
              <ShieldCheck size={16} />
              {formatMessage('opportunities.tabs.moderation')}
              {data.moderationQueue.items.length > 0 && (
                <span className={styles.badgePill}>{data.moderationQueue.items.length}</span>
              )}
            </button>
          )}
        </div>

        <div className={styles.createBtnWrapper}>
          <Button
            variant="primary"
            onClick={() => create.setIsOpen(true)}
            className={styles.createBtn}
          >
            <Plus size={16} />
            {formatMessage('opportunities.actions.create')}
          </Button>
        </div>
      </div>

      {/* SubTab Views */}
      <div role="tabpanel" id={`panel-${activeSubTab}`}>
        {activeSubTab === OPPORTUNITY_SUB_TAB.Catalog && (
          <CatalogTab
            loading={data.catalog.loading}
            opportunities={data.catalog.items}
            search={data.search}
            onSearchChange={data.setSearch}
            paymentFilter={data.paymentFilter}
            onPaymentFilterChange={data.setPaymentFilter}
            onOpenDetail={detail.open}
          />
        )}

        {activeSubTab === OPPORTUNITY_SUB_TAB.MyOpportunities && (
          <MyOpportunitiesTab
            loading={data.myOpportunities.loading}
            myOpportunities={data.myOpportunities.items}
            onOpenApplicants={applicants.open}
            onOpenDetail={detail.open}
          />
        )}

        {activeSubTab === OPPORTUNITY_SUB_TAB.MyApplications && (
          <MyApplicationsTab
            loading={data.myApplications.loading}
            myApplications={data.myApplications.items}
            onWithdraw={applicantActions.setWithdrawApplicationId}
          />
        )}

        {activeSubTab === OPPORTUNITY_SUB_TAB.Moderation && isModerator && (
          <ModerationQueueTab
            loading={data.moderationQueue.loading}
            moderationQueue={data.moderationQueue.items}
            onModerate={moderation.handleModerate}
            onOpenRejectModal={moderation.openRejectModal}
          />
        )}
      </div>

      {/* Modals */}
      <OpportunityDetailModal
        open={detail.isOpen}
        onClose={() => detail.setIsOpen(false)}
        opportunity={detail.selectedOpportunity}
        userId={currentUser.userId}
        onSendToReview={detail.handleSendToReview}
        onLifecycleChange={detail.handleLifecycleChange}
        onOpenApply={() => {
          detail.setIsOpen(false);
          applicantActions.setIsApplyOpen(true);
        }}
      />

      <CreateOpportunityModal
        open={create.isOpen}
        onClose={() => create.setIsOpen(false)}
        formData={create.formData}
        setFormData={create.setFormData}
        onSubmit={create.handleSubmit}
        submitting={create.creating}
      />

      <ApplyOpportunityModal
        open={applicantActions.isApplyOpen}
        onClose={() => applicantActions.setIsApplyOpen(false)}
        opportunityTitle={detail.selectedOpportunity?.title}
        motivation={applicantActions.motivation}
        onMotivationChange={applicantActions.setMotivation}
        contactInfo={applicantActions.contactInfo}
        onContactInfoChange={applicantActions.setContactInfo}
        onSubmit={applicantActions.handleApplySubmit}
        submitting={applicantActions.applying}
      />

      <ApplicantsModal
        open={applicants.isOpen}
        onClose={() => applicants.setIsOpen(false)}
        applications={applicants.applications}
        loading={applicants.loading}
        onUpdateStatus={applicants.handleUpdateStatus}
      />

      <ConfirmModal
        open={applicantActions.withdrawApplicationId !== null}
        onClose={() => applicantActions.setWithdrawApplicationId(null)}
        onConfirm={applicantActions.handleWithdraw}
        title={formatMessage('opportunities.confirm.withdrawTitle')}
        message={formatMessage('opportunities.confirm.withdraw')}
        cancelLabel={formatMessage('common.cancel')}
        confirmLabel={formatMessage('opportunities.confirm.withdrawConfirm')}
        closeLabel={formatMessage('modal.close')}
        loading={applicantActions.withdrawing}
        variant="danger"
      />

      <ModerationRejectModal
        rejectModal={moderation.rejectModal}
        onClose={moderation.closeRejectModal}
        onCommentChange={moderation.changeRejectComment}
        onConfirm={moderation.handleRejectConfirm}
      />
    </div>
  );
};
