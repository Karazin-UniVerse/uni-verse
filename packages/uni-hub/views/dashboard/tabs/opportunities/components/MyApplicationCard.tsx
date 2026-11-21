'use client';

import React from 'react';
import clsx from 'clsx';
import {
  Calendar,
  Coins,
  Briefcase,
  MessageSquare,
  AlertCircle,
  Hash,
  X,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button } from '@una';
import {
  MAX_APPLICATION_WITHDRAWALS,
  OPPORTUNITY_APP_STATUS,
  OPPORTUNITY_PAYMENT_TYPE,
} from '@core/constants/opportunities';
import type { OpportunityApplication } from '@core/types/opportunities';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';
import { ContactTags } from '@ui';
import styles from '../../OpportunitiesTab.module.scss';
import { OpportunityUnavailableNotice } from './OpportunityUnavailableNotice';
import {
  hasReachedApplicationWithdrawalLimit,
  isUnavailableOpportunity,
  isWithdrawableApplicationStatus,
} from '@core/utils/opportunities';

interface MyApplicationCardProps {
  application: OpportunityApplication;
  onWithdraw: (appId: string) => void;
}

/** Renders an application with either full opportunity details or its public summary. */
export function MyApplicationCard({ application, onWithdraw }: MyApplicationCardProps) {
  const { formatMessage, localeTag } = useLanguage();
  const record = application.opportunity;
  const unavailable = record && isUnavailableOpportunity(record) ? record : undefined;
  const opportunity = record && !isUnavailableOpportunity(record) ? record : undefined;
  const paymentType = record?.paymentType;
  const isWithdrawable = isWithdrawableApplicationStatus(application.status);
  const hasReachedWithdrawalLimit = hasReachedApplicationWithdrawalLimit(
    application.withdrawalCount,
  );

  return (
    <div
      className={clsx(
        styles.applicationCard,
        application.status === OPPORTUNITY_APP_STATUS.ACCEPTED && styles.statusAccepted,
        application.status === OPPORTUNITY_APP_STATUS.UNDER_REVIEW && styles.statusReview,
        application.status === OPPORTUNITY_APP_STATUS.REJECTED && styles.statusRejected,
        application.status === OPPORTUNITY_APP_STATUS.SUBMITTED && styles.statusSubmitted,
        application.status === OPPORTUNITY_APP_STATUS.WITHDRAWN && styles.statusWithdrawn,
      )}
    >
      <div className={styles.applicationHeader}>
        <div className={styles.applicationMainCol}>
          <div className={styles.applicationBadgeRow}>
            <ApplicationStatusBadge status={application.status} />
            <span className={styles.submissionDate}>
              <Calendar size={12} />
              {formatMessage('opportunities.myApplications.submittedOn', {
                date: new Date(application.createdAt).toLocaleDateString(localeTag, {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }),
              })}
            </span>
          </div>

          {unavailable && <OpportunityUnavailableNotice availability={unavailable.availability} />}
          <h3 className={styles.applicationTitle}>
            {record?.title || formatMessage('opportunities.myApplications.defaultTitle')}
          </h3>

          {opportunity?.owner && (
            <div className={styles.authorStrip}>
              <div className={styles.ownerAvatar}>
                {(opportunity.owner.name || opportunity.owner.email || 'O').charAt(0).toUpperCase()}
              </div>
              <div className={styles.ownerMeta}>
                <div className={styles.ownerRow}>
                  <span className={styles.ownerName}>
                    {opportunity.owner.name || opportunity.owner.email}
                  </span>
                  <ContactTags
                    emailLabel={formatMessage('opportunities.emailLabel')}
                    alternativeContactLabel={formatMessage('opportunities.alternativeContact')}
                    email={opportunity.owner.email}
                    alternativeContact={opportunity.ownerContactInfo}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {paymentType && (
          <div className={styles.applicationTypeCol}>
            {paymentType === OPPORTUNITY_PAYMENT_TYPE.PAID ? (
              <span className={styles.compensationPill}>
                <Coins size={13} />
                <span>
                  {opportunity?.paymentDetails
                    ? formatMessage('opportunities.myApplications.paidWithAmount', {
                        amount: opportunity.paymentDetails,
                      })
                    : formatMessage('opportunities.myApplications.paid')}
                </span>
              </span>
            ) : (
              <span className={styles.unpaidPill}>
                <Briefcase size={13} />
                <span>{formatMessage('opportunities.myApplications.unpaid')}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {application.motivation && (
        <div className={styles.motivationBox}>
          <div className={styles.motivationLabel}>
            <MessageSquare size={13} />
            {formatMessage('opportunities.myApplications.motivationLabel')}
          </div>
          <p className={styles.motivationText}>{application.motivation}</p>
        </div>
      )}

      {(application.applicant?.email || application.contactInfo.trim()) && (
        <div className={styles.authorStrip}>
          <ContactTags
            email={application.applicant?.email}
            alternativeContact={application.contactInfo}
            emailLabel={formatMessage('opportunities.emailLabel')}
            alternativeContactLabel={formatMessage('opportunities.alternativeContact')}
          />
        </div>
      )}

      {application.ownerComment && (
        <div className={styles.ownerFeedbackBox}>
          <AlertCircle size={15} className={styles.feedbackIcon} />
          <div>
            <span className={styles.feedbackLabel}>
              {formatMessage('opportunities.myApplications.ownerFeedbackLabel')}{' '}
            </span>
            <span className={styles.feedbackText}>{application.ownerComment}</span>
          </div>
        </div>
      )}

      <div className={styles.applicationFooter}>
        <span className={styles.idBadge}>
          <Hash size={12} />
          {application.id.slice(0, 8)}
        </span>

        <div className={styles.applicationActions}>
          {isWithdrawable && hasReachedWithdrawalLimit && (
            <span className={styles.statusNoticeNeutral}>
              {formatMessage('opportunities.errors.withdrawalLimitReached', {
                limit: MAX_APPLICATION_WITHDRAWALS,
              })}
            </span>
          )}
          {isWithdrawable && !hasReachedWithdrawalLimit && (
            <Button
              variant="secondary"
              className={styles.withdrawBtn}
              onClick={() => onWithdraw(application.id)}
            >
              <X size={14} className={styles.btnIcon} />
              {formatMessage('opportunities.myApplications.withdrawBtn')}
            </Button>
          )}

          {application.status === OPPORTUNITY_APP_STATUS.ACCEPTED && (
            <span className={styles.statusNoticeSuccess}>
              <CheckCircle2 size={14} />
              {formatMessage('opportunities.myApplications.statusAccepted')}
            </span>
          )}

          {application.status === OPPORTUNITY_APP_STATUS.REJECTED && (
            <span className={styles.statusNoticeDanger}>
              <XCircle size={14} />
              {formatMessage('opportunities.myApplications.statusRejected')}
            </span>
          )}

          {application.status === OPPORTUNITY_APP_STATUS.WITHDRAWN && (
            <span className={styles.statusNoticeNeutral}>
              {formatMessage('opportunities.myApplications.statusWithdrawn')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
