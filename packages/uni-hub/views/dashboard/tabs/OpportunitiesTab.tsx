'use client';

import React from 'react';
import { Plus, Briefcase, ShieldCheck, Users, FileText } from 'lucide-react';
import { Button } from '@una';
import { ConfirmModal, SegmentedControl, type SegmentedControlItem } from '@ui';
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
  useApplicantActions,
  useApplicants,
  useCreateOpportunity,
  useModeration,
  useOpportunitiesData,
  useOpportunityDetail,
  OPPORTUNITY_SUB_TAB,
  type OpportunitySubTab,
} from './opportunities';

export const OpportunitiesTab: React.FC = () => {
  const { formatMessage } = useLanguage();
  const currentUser = useCurrentUser();
  const isModerator = currentUser.roles.includes(ROLE.OPPORTUNITIES_MODERATOR);
  const data = useOpportunitiesData(isModerator);
  const { activeSubTab, setActiveSubTab } = data;
  const detail = useOpportunityDetail();
  const create = useCreateOpportunity({
    onCreated: () => setActiveSubTab(OPPORTUNITY_SUB_TAB.MyOpportunities),
  });
  const applicants = useApplicants();
  const applicantActions = useApplicantActions({
    currentUser,
    selectedOpportunity: detail.selectedOpportunity,
  });
  const moderation = useModeration();

  const segmentItems: SegmentedControlItem<OpportunitySubTab>[] = [
    {
      id: OPPORTUNITY_SUB_TAB.Catalog,
      label: formatMessage('opportunities.tabs.catalog'),
      icon: <Briefcase size={16} />,
    },
    {
      id: OPPORTUNITY_SUB_TAB.MyOpportunities,
      label: formatMessage('opportunities.tabs.myOpportunities'),
      icon: <FileText size={16} />,
    },
    {
      id: OPPORTUNITY_SUB_TAB.MyApplications,
      label: formatMessage('opportunities.tabs.myApplications'),
      icon: <Users size={16} />,
    },
    ...(isModerator
      ? [
          {
            id: OPPORTUNITY_SUB_TAB.Moderation,
            label: formatMessage('opportunities.tabs.moderation'),
            icon: <ShieldCheck size={16} />,
            badge: data.moderationQueue.items.length,
          },
        ]
      : []),
  ];

  return (
    <div className={styles.container}>
      {/* Top Segmented Navigation & Action */}
      <div className={styles.topBar}>
        <SegmentedControl
          items={segmentItems}
          selectedId={activeSubTab}
          panelIdPrefix="panel"
          ariaLabel={formatMessage('opportunities.title')}
          onSelect={setActiveSubTab}
        />

        <div className={styles.createBtnWrapper}>
          <Button variant="primary" onClick={create.openCreate} className={styles.createBtn}>
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
            isError={data.catalog.isError}
            onRetry={data.catalog.refetch}
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
            isError={data.myOpportunities.isError}
            onRetry={data.myOpportunities.refetch}
            myOpportunities={data.myOpportunities.items}
            onOpenApplicants={applicants.open}
            onOpenDetail={detail.open}
          />
        )}

        {activeSubTab === OPPORTUNITY_SUB_TAB.MyApplications && (
          <MyApplicationsTab
            loading={data.myApplications.loading}
            isError={data.myApplications.isError}
            onRetry={data.myApplications.refetch}
            myApplications={data.myApplications.items}
            onWithdraw={applicantActions.setWithdrawApplicationId}
          />
        )}

        {activeSubTab === OPPORTUNITY_SUB_TAB.Moderation && isModerator && (
          <ModerationQueueTab
            loading={data.moderationQueue.loading}
            isError={data.moderationQueue.isError}
            onRetry={data.moderationQueue.refetch}
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
        onEdit={(opportunity) => {
          detail.setIsOpen(false);
          create.openEdit(opportunity);
        }}
        onOpenApply={() => {
          detail.setIsOpen(false);
          applicantActions.setIsApplyOpen(true);
        }}
      />

      <CreateOpportunityModal
        open={create.isOpen}
        onClose={create.close}
        formData={create.formData}
        setFormData={create.setFormData}
        onSubmit={create.handleSubmit}
        submitting={create.creating}
        isEdit={create.isEdit}
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
        onClose={applicants.close}
        applications={applicants.applications}
        loading={applicants.loading}
        isError={applicants.isError}
        onRetry={applicants.refetch}
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
        isSubmitting={moderation.submitting}
      />
    </div>
  );
};
