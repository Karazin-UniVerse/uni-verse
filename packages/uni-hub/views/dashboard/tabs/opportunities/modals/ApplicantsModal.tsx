'use client';

import React from 'react';
import { Button, Spinner, Empty, Modal } from '@una';
import { Mail, MessageSquare, Calendar, CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { OpportunityApplication, OpportunityAppStatus } from '@uni-hub/types';
import { getApplicationStatusBadge } from '../badges';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import styles from '../../OpportunitiesTab.module.scss';

export interface ApplicantsModalProps {
  open: boolean;
  onClose: () => void;
  applications: OpportunityApplication[];
  loading: boolean;
  onUpdateStatus: (appId: string, status: OpportunityAppStatus) => void;
}

export const ApplicantsModal: React.FC<ApplicantsModalProps> = ({
  open,
  onClose,
  applications,
  loading,
  onUpdateStatus,
}) => {
  const { formatMessage } = useLanguage();

  let content;

  if (loading) {
    content = (
      <div className={styles.loadingBox}>
        <Spinner size="large" />
      </div>
    );
  } else if (applications.length === 0) {
    content = <Empty description={formatMessage('opportunities.applicants.empty')} />;
  } else {
    content = (
      <div className={styles.listStack}>
        {applications.map((app) => (
          <div key={app.id} className={styles.applicantCard}>
            <div className={styles.applicantHeader}>
              <div className={styles.authorStrip}>
                <div className={styles.ownerAvatar}>
                  {(app.applicant?.name || app.applicantName || 'S').charAt(0).toUpperCase()}
                </div>
                <div className={styles.ownerMeta}>
                  <div className={styles.ownerRow}>
                    <span className={styles.applicantName}>
                      {app.applicant?.name || app.applicantName || 'Студент'}
                    </span>
                    {(app.applicant?.email || app.contactInfo) && (
                      <span className={styles.authorContactTag}>
                        <Mail size={12} />
                        {app.applicant?.email || app.contactInfo}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.applicantStatusRow}>
                {getApplicationStatusBadge(app.status)}
              </div>
            </div>

            {app.motivation && (
              <div className={styles.applicantMotivationBox}>
                <div className={styles.motivationLabel}>
                  <MessageSquare size={13} />
                  Супровідне повідомлення:
                </div>
                <p className={styles.motivationText}>{app.motivation}</p>
              </div>
            )}

            <div className={styles.applicantFooter}>
              <span className={styles.submissionDate}>
                <Calendar size={12} />
                Подано{' '}
                {new Date(app.createdAt).toLocaleDateString('uk-UA', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>

              <div className={styles.applicantActions}>
                {app.status !== 'ACCEPTED' && (
                  <Button
                    size="small"
                    variant="primary"
                    className={styles.approveBtn}
                    onClick={() => onUpdateStatus(app.id, 'ACCEPTED')}
                  >
                    <CheckCircle2 size={14} style={{ marginRight: '6px' }} />
                    Прийняти
                  </Button>
                )}
                {app.status !== 'UNDER_REVIEW' && (
                  <Button
                    size="small"
                    variant="secondary"
                    className={styles.reviseBtn}
                    onClick={() => onUpdateStatus(app.id, 'UNDER_REVIEW')}
                  >
                    <Clock size={14} style={{ marginRight: '6px' }} />
                    На розгляд
                  </Button>
                )}
                {app.status !== 'REJECTED' && (
                  <Button
                    size="small"
                    variant="secondary"
                    className={styles.rejectBtn}
                    onClick={() => onUpdateStatus(app.id, 'REJECTED')}
                  >
                    <XCircle size={14} style={{ marginRight: '6px' }} />
                    Відхилити
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Кандидати на можливість (${applications.length})`}
      width={720}
    >
      <div className={styles.modalStack}>
        {content}

        <div className={styles.modalFooter}>
          <Button variant="secondary" onClick={onClose}>
            Закрити
          </Button>
        </div>
      </div>
    </Modal>
  );
};
