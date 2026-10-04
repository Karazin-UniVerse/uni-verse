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
import { Button, Spinner, Empty } from '@una';
import type { OpportunityApplication } from '@uni-hub/types';
import { getApplicationStatusBadge } from './badges';
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
  if (loading) {
    return (
      <div className={styles.loadingBox}>
        <Spinner size="large" />
      </div>
    );
  }

  if (myApplications.length === 0) {
    return <Empty description="Ви ще не відгукувалися на жодну можливість" />;
  }

  return (
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
                {getApplicationStatusBadge(app.status)}
                <span className={styles.submissionDate}>
                  <Calendar size={12} />
                  Подано {new Date(app.createdAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>

              <h3 className={styles.applicationTitle}>
                {app.opportunity?.title || 'Проектна можливість'}
              </h3>

              {app.opportunity?.owner && (
                <div className={styles.authorStrip}>
                  <div className={styles.ownerAvatar}>
                    {(app.opportunity.owner.name || app.opportunity.owner.email || 'O').charAt(0).toUpperCase()}
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
                    <span>{app.opportunity.paymentDetails ? `Оплачувана (${app.opportunity.paymentDetails})` : 'Оплачувана'}</span>
                  </span>
                ) : (
                  <span className={styles.unpaidPill}>
                    <Briefcase size={13} />
                    <span>Практика</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {app.motivation && (
            <div className={styles.motivationBox}>
              <div className={styles.motivationLabel}>
                <MessageSquare size={13} />
                Ваш супровідний лист / мотивація:
              </div>
              <p className={styles.motivationText}>{app.motivation}</p>
            </div>
          )}

          {app.ownerComment && (
            <div className={styles.ownerFeedbackBox}>
              <AlertCircle size={15} className={styles.feedbackIcon} />
              <div>
                <span className={styles.feedbackLabel}>Відповідь автора пропозиції: </span>
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
                  <X size={14} style={{ marginRight: '6px' }} />
                  Відкликати відгук
                </Button>
              )}

              {app.status === 'ACCEPTED' && (
                <span className={styles.statusNoticeSuccess}>
                  <CheckCircle2 size={14} />
                  Вашу кандидатуру схвалено організатором
                </span>
              )}

              {app.status === 'REJECTED' && (
                <span className={styles.statusNoticeDanger}>
                  <XCircle size={14} />
                  Організатор відхилив відгук
                </span>
              )}

              {app.status === 'WITHDRAWN' && (
                <span className={styles.statusNoticeNeutral}>
                  Ви відкликали цей відгук
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
