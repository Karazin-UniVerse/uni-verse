'use client';

import React from 'react';
import {
  Clock,
  Calendar,
  Mail,
  Coins,
  Briefcase,
  AlertCircle,
  Hash,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button, Spinner, Empty } from '@una';
import type { Opportunity } from '@uni-hub/types';
import styles from '../OpportunitiesTab.module.scss';

export interface ModerationQueueTabProps {
  loading: boolean;
  moderationQueue: Opportunity[];
  onModerate: (
    id: string,
    action: 'APPROVE' | 'REJECT' | 'REQUIRE_CHANGES',
    comment?: string,
  ) => void;
  onOpenRejectModal: (id: string) => void;
}

export const ModerationQueueTab: React.FC<ModerationQueueTabProps> = ({
  loading,
  moderationQueue,
  onModerate,
  onOpenRejectModal,
}) => {
  if (loading) {
    return (
      <div className={styles.loadingBox}>
        <Spinner size="large" />
      </div>
    );
  }

  if (moderationQueue.length === 0) {
    return (
      <Empty description="Черга модерації порожня! Немає нових можливостей для перевірки." />
    );
  }

  return (
    <div className={styles.listStack}>
      {moderationQueue.map((item) => (
        <div key={item.id} className={styles.moderationCard}>
          <div className={styles.moderationHeader}>
            <div className={styles.moderationMainCol}>
              <div className={styles.moderationBadgeRow}>
                <span className={styles.reviewPendingBadge}>
                  <Clock size={12} />
                  Потребує модерації
                </span>
                <span className={styles.submissionDate}>
                  <Calendar size={12} />
                  Подано {new Date(item.createdAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>

              <h3 className={styles.moderationTitle}>{item.title}</h3>

              <div className={styles.authorStrip}>
                <div className={styles.ownerAvatar}>
                  {(item.owner?.name || item.owner?.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className={styles.ownerMeta}>
                  <div className={styles.ownerRow}>
                    <span className={styles.ownerName}>
                      {item.owner?.name || item.owner?.email || 'Невідомо'}
                    </span>
                    {item.ownerContactInfo && (
                      <span className={styles.authorContactTag}>
                        <Mail size={12} />
                        {item.ownerContactInfo}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.moderationTypeCol}>
              {item.paymentType === 'PAID' ? (
                <span className={styles.compensationPill}>
                  <Coins size={13} />
                  <span>{item.paymentDetails ? `Оплачувана (${item.paymentDetails})` : 'Оплачувана'}</span>
                </span>
              ) : (
                <span className={styles.unpaidPill}>
                  <Briefcase size={13} />
                  <span>Практика</span>
                </span>
              )}
            </div>
          </div>

          <div className={styles.moderationDescriptionBox}>
            <div className={styles.moderationDescriptionLabel}>
              Опис пропозиції
            </div>
            <p className={styles.moderationDescriptionText}>{item.description}</p>
          </div>

          {item.moderationComment && (
            <div className={styles.previousCommentBox}>
              <AlertCircle size={15} className={styles.commentIcon} />
              <div>
                <span className={styles.commentLabel}>Попередній коментар модерації: </span>
                <span className={styles.commentText}>{item.moderationComment}</span>
              </div>
            </div>
          )}

          <div className={styles.moderationFooter}>
            <span className={styles.idBadge}>
              <Hash size={12} />
              {item.id.slice(0, 8)}
            </span>

            <div className={styles.moderationActions}>
              <Button
                variant="primary"
                size="small"
                className={styles.approveBtn}
                onClick={() => onModerate(item.id, 'APPROVE')}
              >
                <CheckCircle2 size={14} style={{ marginRight: '6px' }} />
                Схвалити
              </Button>
              <Button
                variant="secondary"
                size="small"
                className={styles.reviseBtn}
                onClick={() => onOpenRejectModal(item.id)}
              >
                <AlertCircle size={14} style={{ marginRight: '6px' }} />
                На доопрацювання
              </Button>
              <Button
                variant="secondary"
                size="small"
                className={styles.rejectBtn}
                onClick={() => onModerate(item.id, 'REJECT')}
              >
                <XCircle size={14} style={{ marginRight: '6px' }} />
                Відхилити
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
