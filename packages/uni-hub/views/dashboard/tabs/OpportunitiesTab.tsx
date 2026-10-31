'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Briefcase, ShieldCheck, Users, FileText } from 'lucide-react';
import { Button } from '@una';
import { ConfirmModal, SegmentedControl, type SegmentedControlItem } from '@ui';
import { ROLE } from '@core/constants/roles';
import type { Opportunity } from '@core/types/opportunities';
import { useCurrentUser } from '@uni-hub/hooks/useCurrentUser';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { getOpportunityHref } from '../routes';
import styles from './OpportunitiesTab.module.scss';
import {
  CatalogTab,
  MyOpportunitiesTab,
  MyApplicationsTab,
  ModerationQueueTab,
  CreateOpportunityModal,
  ApplicantsModal,
  ModerationRejectModal,
  useApplicants,
  useCreateOpportunity,
  useModeration,
  useOpportunitiesData,
  useWithdrawApplication,
  OPPORTUNITY_SUB_TAB,
  type OpportunitySubTab,
} from './opportunities';

export const OpportunitiesTab: React.FC = () => {
  const router = useRouter();
  const { formatMessage } = useLanguage();
  const currentUser = useCurrentUser();
  const isModerator = currentUser.roles.includes(ROLE.OPPORTUNITIES_MODERATOR);
  const data = useOpportunitiesData(isModerator);
  const { activeSubTab, setActiveSubTab } = data;
  const create = useCreateOpportunity({
    onCreated: () => setActiveSubTab(OPPORTUNITY_SUB_TAB.MyOpportunities),
  });
  const applicants = useApplicants();
  const withdrawal = useWithdrawApplication();
  const moderation = useModeration();

  const openDetail = (opportunity: Opportunity): void =>
    router.push(getOpportunityHref(opportunity.id));

  const segmentItems: SegmentedControlItem<OpportunitySubTab>[] = [
    {
      id: OPPORTUNITY_SUB_TAB.Catalog,
      label: formatMessage('opportunities.tabs.catalog'),
      shortLabel: formatMessage('opportunities.tabs.catalogShort'),
      icon: <Briefcase size={16} />,
    },
    {
      id: OPPORTUNITY_SUB_TAB.MyOpportunities,
      label: formatMessage('opportunities.tabs.myOpportunities'),
      shortLabel: formatMessage('opportunities.tabs.myOpportunitiesShort'),
      icon: <FileText size={16} />,
    },
    {
      id: OPPORTUNITY_SUB_TAB.MyApplications,
      label: formatMessage('opportunities.tabs.myApplications'),
      shortLabel: formatMessage('opportunities.tabs.myApplicationsShort'),
      icon: <Users size={16} />,
    },
    ...(isModerator
      ? [
          {
            id: OPPORTUNITY_SUB_TAB.Moderation,
            label: formatMessage('opportunities.tabs.moderation'),
            shortLabel: formatMessage('opportunities.tabs.moderationShort'),
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

        {activeSubTab === OPPORTUNITY_SUB_TAB.MyOpportunities && (
          <div className={styles.createBtnWrapper}>
            <Button variant="primary" onClick={create.openCreate} className={styles.createBtn}>
              <Plus size={16} />
              {formatMessage('opportunities.actions.create')}
            </Button>
          </div>
        )}
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
            onOpenDetail={openDetail}
          />
        )}

        {activeSubTab === OPPORTUNITY_SUB_TAB.MyOpportunities && (
          <MyOpportunitiesTab
            loading={data.myOpportunities.loading}
            isError={data.myOpportunities.isError}
            onRetry={data.myOpportunities.refetch}
            myOpportunities={data.myOpportunities.items}
            onOpenApplicants={applicants.open}
            onOpenDetail={openDetail}
          />
        )}

        {activeSubTab === OPPORTUNITY_SUB_TAB.MyApplications && (
          <MyApplicationsTab
            loading={data.myApplications.loading}
            isError={data.myApplications.isError}
            onRetry={data.myApplications.refetch}
            myApplications={data.myApplications.items}
            onWithdraw={withdrawal.setWithdrawApplicationId}
          />
        )}

        {activeSubTab === OPPORTUNITY_SUB_TAB.Moderation && isModerator && (
          <ModerationQueueTab
            currentUserId={currentUser.userId}
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
      <CreateOpportunityModal
        open={create.isOpen}
        onClose={create.close}
        formData={create.formData}
        setFormData={create.setFormData}
        onSubmit={create.handleSubmit}
        submitting={create.creating}
        isEdit={create.isEdit}
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
        open={withdrawal.withdrawApplicationId !== null}
        onClose={() => withdrawal.setWithdrawApplicationId(null)}
        onConfirm={withdrawal.handleWithdraw}
        title={formatMessage('opportunities.confirm.withdrawTitle')}
        message={formatMessage('opportunities.confirm.withdraw')}
        cancelLabel={formatMessage('common.cancel')}
        confirmLabel={formatMessage('opportunities.confirm.withdrawConfirm')}
        closeLabel={formatMessage('modal.close')}
        loading={withdrawal.withdrawing}
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
