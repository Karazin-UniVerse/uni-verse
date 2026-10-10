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
import { Button } from '@una';
import type { Opportunity } from '@uni-hub/types';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { TabStateWrapper } from './TabStateWrapper';
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
  const { formatMessage, language } = useLanguage();

  return (
    <TabStateWrapper
      loading={loading}
      isEmpty={moderationQueue.length === 0}
      emptyDescription={formatMessage('opportunities.moderation.empty')}
    >
      <div className={styles.listStack}>
        {moderationQueue.map((item) => (
          <div key={item.id} className={styles.moderationCard}>
            <div className={styles.moderationHeader}>
              <div className={styles.moderationMainCol}>
                <div className={styles.moderationBadgeRow}>
                  <span className={styles.reviewPendingBadge}>
                    <Clock size={12} />
                    {formatMessage('opportunities.moderation.needsModeration')}
                  </span>
                  <span className={styles.submissionDate}>
                    <Calendar size={12} />
                    {formatMessage('opportunities.moderation.submittedOn', {
                      date: new Date(item.createdAt).toLocaleDateString(
                        language === 'uk' ? 'uk-UA' : 'en-US',
                        {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        },
                      ),
                    })}
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
                        {item.owner?.name ||
                          item.owner?.email ||
                          formatMessage('opportunities.moderation.unknownOwner')}
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
                    <span>
                      {item.paymentDetails
                        ? formatMessage('opportunities.moderation.paidWithAmount', {
                            amount: item.paymentDetails,
                          })
                        : formatMessage('opportunities.moderation.paid')}
                    </span>
                  </span>
                ) : (
                  <span className={styles.unpaidPill}>
                    <Briefcase size={13} />
                    <span>{formatMessage('opportunities.moderation.practice')}</span>
                  </span>
                )}
              </div>
            </div>

            <div className={styles.moderationDescriptionBox}>
              <div className={styles.moderationDescriptionLabel}>
                {formatMessage('opportunities.moderation.descLabel')}
              </div>
              <p className={styles.moderationDescriptionText}>{item.description}</p>
            </div>

            {item.moderationComment && (
              <div className={styles.previousCommentBox}>
                <AlertCircle size={15} className={styles.commentIcon} />
                <div>
                  <span className={styles.commentLabel}>
                    {formatMessage('opportunities.moderation.prevCommentLabel')}{' '}
                  </span>
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
                  size="medium"
                  className={styles.approveBtn}
                  onClick={() => onModerate(item.id, 'APPROVE')}
                >
                  <CheckCircle2 size={14} style={{ marginRight: '6px' }} />
                  {formatMessage('opportunities.moderation.approve')}
                </Button>
                <Button
                  variant="secondary"
                  size="medium"
                  className={styles.reviseBtn}
                  onClick={() => onOpenRejectModal(item.id)}
                >
                  <AlertCircle size={14} style={{ marginRight: '6px' }} />
                  {formatMessage('opportunities.moderation.revise')}
                </Button>
                <Button
                  variant="secondary"
                  size="medium"
                  className={styles.rejectBtn}
                  onClick={() => onOpenRejectModal(item.id)}
                >
                  <XCircle size={14} style={{ marginRight: '6px' }} />
                  {formatMessage('opportunities.moderation.reject')}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </TabStateWrapper>
  );
};
