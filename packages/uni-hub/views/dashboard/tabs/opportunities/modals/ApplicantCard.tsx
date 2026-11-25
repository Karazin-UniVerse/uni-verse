'use client';

import React from 'react';
import { Button } from '@una';
import { MessageSquare, Calendar, CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { OpportunityApplication } from '@core/types/opportunities';
import { OPPORTUNITY_APP_STATUS, type OpportunityAppStatus } from '@core/constants/opportunities';
import { canChangeApplicationStatus } from '@core/utils/opportunities';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { ContactTags } from '@ui';
import { ApplicationStatusBadge } from '../components/ApplicationStatusBadge';
import styles from '../../OpportunitiesTab.module.scss';

export interface ApplicantCardProps {
  application: OpportunityApplication;
  onChangeStatus: (applicationId: string, status: OpportunityAppStatus) => void;
}

export function ApplicantCard({
  application,
  onChangeStatus,
}: Readonly<ApplicantCardProps>): React.JSX.Element {
  const { formatMessage, localeTag } = useLanguage();
  const canChangeTo = (status: OpportunityAppStatus): boolean =>
    canChangeApplicationStatus(application.status, status);

  return (
    <div className={styles.applicantCard}>
      <div className={styles.applicantHeader}>
        <div className={styles.authorStrip}>
          <div className={styles.ownerAvatar}>
            {(application.applicant?.name || application.applicantName || 'S')
              .charAt(0)
              .toUpperCase()}
          </div>
          <div className={styles.applicantMeta}>
            <span className={styles.applicantName}>
              {application.applicant?.name ||
                application.applicantName ||
                formatMessage('opportunities.applicantsModal.defaultApplicant')}
            </span>
            <div className={styles.applicantContacts}>
              <ContactTags
                emailLabel={formatMessage('opportunities.emailLabel')}
                alternativeContactLabel={formatMessage('opportunities.alternativeContact')}
                email={application.applicant?.email}
                alternativeContact={application.contactInfo}
              />
            </div>
          </div>
        </div>

        <div className={styles.applicantStatusRow}>
          <ApplicationStatusBadge status={application.status} />
        </div>
      </div>

      {application.motivation && (
        <div className={styles.applicantMotivationBox}>
          <div className={styles.motivationLabel}>
            <MessageSquare size={13} />
            {formatMessage('opportunities.applicantsModal.motivationLabel')}
          </div>
          <p className={styles.motivationText}>{application.motivation}</p>
        </div>
      )}

      <div className={styles.applicantFooter}>
        <span className={styles.submissionDate}>
          <Calendar size={12} />
          {formatMessage('opportunities.applicantsModal.submittedOn', {
            date: new Date(application.createdAt).toLocaleDateString(localeTag, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            }),
          })}
        </span>

        <div className={styles.applicantActions}>
          {application.status === OPPORTUNITY_APP_STATUS.WITHDRAWN && (
            <span className={styles.statusNoticeNeutral}>
              {formatMessage('opportunities.applicantsModal.withdrawnByCandidate')}
            </span>
          )}
          {canChangeTo(OPPORTUNITY_APP_STATUS.ACCEPTED) && (
            <Button
              variant="primary"
              tone="success"
              onClick={() => onChangeStatus(application.id, OPPORTUNITY_APP_STATUS.ACCEPTED)}
            >
              <CheckCircle2 size={14} className={styles.btnIcon} />
              {formatMessage('opportunities.applicantsModal.accept')}
            </Button>
          )}
          {canChangeTo(OPPORTUNITY_APP_STATUS.UNDER_REVIEW) && (
            <Button
              variant="secondary"
              tone="warning"
              onClick={() => onChangeStatus(application.id, OPPORTUNITY_APP_STATUS.UNDER_REVIEW)}
            >
              <Clock size={14} className={styles.btnIcon} />
              {formatMessage('opportunities.applicantsModal.underReview')}
            </Button>
          )}
          {canChangeTo(OPPORTUNITY_APP_STATUS.REJECTED) && (
            <Button
              variant="secondary"
              tone="danger"
              onClick={() => onChangeStatus(application.id, OPPORTUNITY_APP_STATUS.REJECTED)}
            >
              <XCircle size={14} className={styles.btnIcon} />
              {formatMessage('opportunities.applicantsModal.reject')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
