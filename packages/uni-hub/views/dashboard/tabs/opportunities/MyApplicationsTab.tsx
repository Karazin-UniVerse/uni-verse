'use client';

import React from 'react';
import clsx from 'clsx';
import {
  Calendar,
  Mail,
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
import type { OpportunityApplication } from '@uni-hub/types';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';
import { TabStateWrapper } from './TabStateWrapper';
import styles from '../OpportunitiesTab.module.scss';

export interface MyApplicationsTabProps {
  loading: boolean;
  myApplications: OpportunityApplication[];
  onWithdraw: (appId: string) => void;
}

export const MyApplicationsTab: React.FC<MyApplicationsTabProps> = ({
  loading,
  myApplications,
  onWithdraw,
}) => {
  const { formatMessage, localeTag } = useLanguage();

  return (
    <TabStateWrapper
      loading={loading}
      isEmpty={myApplications.length === 0}
      emptyDescription={formatMessage('opportunities.myApplications.empty')}
    >
      <div className={styles.listStack}>
        {myApplications.map((app) => (
          <div
            key={app.id}
            className={clsx(
              styles.applicationCard,
              app.status === 'ACCEPTED' && styles.statusAccepted,
              app.status === 'UNDER_REVIEW' && styles.statusReview,
              app.status === 'REJECTED' && styles.statusRejected,
              app.status === 'SUBMITTED' && styles.statusSubmitted,
              app.status === 'WITHDRAWN' && styles.statusWithdrawn,
            )}
          >
            <div className={styles.applicationHeader}>
              <div className={styles.applicationMainCol}>
                <div className={styles.applicationBadgeRow}>
                  <ApplicationStatusBadge status={app.status} />
                  <span className={styles.submissionDate}>
                    <Calendar size={12} />
                    {formatMessage('opportunities.myApplications.submittedOn', {
                      date: new Date(app.createdAt).toLocaleDateString(localeTag, {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      }),
                    })}
                  </span>
                </div>

                <h3 className={styles.applicationTitle}>
                  {app.opportunity?.title ||
                    formatMessage('opportunities.myApplications.defaultTitle')}
                </h3>

                {app.opportunity?.owner && (
                  <div className={styles.authorStrip}>
                    <div className={styles.ownerAvatar}>
                      {(app.opportunity.owner.name || app.opportunity.owner.email || 'O')
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div className={styles.ownerMeta}>
                      <div className={styles.ownerRow}>
                        <span className={styles.ownerName}>
                          {app.opportunity.owner.name || app.opportunity.owner.email}
                        </span>
                        {app.opportunity.ownerContactInfo && (
                          <span className={styles.authorContactTag}>
                            <Mail size={12} />
                            {app.opportunity.ownerContactInfo}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {app.opportunity && (
                <div className={styles.applicationTypeCol}>
                  {app.opportunity.paymentType === 'PAID' ? (
                    <span className={styles.compensationPill}>
                      <Coins size={13} />
                      <span>
                        {app.opportunity.paymentDetails
                          ? formatMessage('opportunities.myApplications.paidWithAmount', {
                              amount: app.opportunity.paymentDetails,
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

            {app.motivation && (
              <div className={styles.motivationBox}>
                <div className={styles.motivationLabel}>
                  <MessageSquare size={13} />
                  {formatMessage('opportunities.myApplications.motivationLabel')}
                </div>
                <p className={styles.motivationText}>{app.motivation}</p>
              </div>
            )}

            {app.ownerComment && (
              <div className={styles.ownerFeedbackBox}>
                <AlertCircle size={15} className={styles.feedbackIcon} />
                <div>
                  <span className={styles.feedbackLabel}>
                    {formatMessage('opportunities.myApplications.ownerFeedbackLabel')}{' '}
                  </span>
                  <span className={styles.feedbackText}>{app.ownerComment}</span>
                </div>
              </div>
            )}

            <div className={styles.applicationFooter}>
              <span className={styles.idBadge}>
                <Hash size={12} />
                {app.id.slice(0, 8)}
              </span>

              <div className={styles.applicationActions}>
                {(app.status === 'SUBMITTED' || app.status === 'UNDER_REVIEW') && (
                  <Button
                    variant="secondary"
                    size="small"
                    className={styles.withdrawBtn}
                    onClick={() => onWithdraw(app.id)}
                  >
                    <X size={14} className={styles.btnIcon} />
                    {formatMessage('opportunities.myApplications.withdrawBtn')}
                  </Button>
                )}

                {app.status === 'ACCEPTED' && (
                  <span className={styles.statusNoticeSuccess}>
                    <CheckCircle2 size={14} />
                    {formatMessage('opportunities.myApplications.statusAccepted')}
                  </span>
                )}

                {app.status === 'REJECTED' && (
                  <span className={styles.statusNoticeDanger}>
                    <XCircle size={14} />
                    {formatMessage('opportunities.myApplications.statusRejected')}
                  </span>
                )}

                {app.status === 'WITHDRAWN' && (
                  <span className={styles.statusNoticeNeutral}>
                    {formatMessage('opportunities.myApplications.statusWithdrawn')}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </TabStateWrapper>
  );
};
