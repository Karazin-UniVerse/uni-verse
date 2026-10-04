'use client';

import React from 'react';
import clsx from 'clsx';
import { Briefcase, Sparkles, Coins, ArrowUpRight } from 'lucide-react';
import { Button } from '@una';
import type { Opportunity } from '@uni-hub/types';
import styles from './OpportunityCard.module.scss';

export interface OpportunityCardProps {
  opportunity: Opportunity;
  variant?: 'catalog' | 'owner';
  statusBadge?: React.ReactNode;
  onOpenDetail?: (opp: Opportunity) => void;
  onOpenApplicants?: (opp: Opportunity) => void;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({
  opportunity,
  statusBadge,
  onOpenDetail,
  onOpenApplicants,
  variant = 'catalog',
}) => {
  const isPaid = opportunity.paymentType === 'PAID';
  const ownerName = opportunity.owner?.name || opportunity.owner?.email || 'Каразінський університет';
  const initial = ownerName.charAt(0).toUpperCase();

  const handleCardClick = () => {
    if (variant === 'catalog' && onOpenDetail) {
      onOpenDetail(opportunity);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (variant === 'catalog' && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onOpenDetail?.(opportunity);
    }
  };

  return (
    <article
      className={clsx(styles.card, isPaid ? styles.paidCard : styles.unpaidCard)}
      onClick={handleCardClick}
      role={variant === 'catalog' ? 'button' : undefined}
      tabIndex={variant === 'catalog' ? 0 : undefined}
      onKeyDown={variant === 'catalog' ? handleKeyDown : undefined}
    >
      <div className={styles.cardTop}>
        <div className={styles.cardBadgeRow}>
          <div className={clsx(styles.categoryPill, isPaid ? styles.paidCategory : styles.unpaidCategory)}>
            <Briefcase size={12} />
            <span>{isPaid ? 'Вакансія' : 'Практика'}</span>
          </div>

          {variant === 'owner' ? (
            statusBadge
          ) : isPaid ? (
            <span className={styles.compensationPill}>
              <Coins size={12} />
              {opportunity.paymentDetails || 'Оплачувано'}
            </span>
          ) : (
            <span className={styles.experiencePill}>
              <Sparkles size={12} />
              Досвід / Практика
            </span>
          )}
        </div>

        <h3 className={styles.cardTitle}>{opportunity.title}</h3>
        <p className={styles.cardDescription}>{opportunity.description}</p>

        {variant === 'owner' && opportunity.moderationComment && (
          <div className={styles.warningBox}>
            <strong>Зауваження модератора:</strong> {opportunity.moderationComment}
          </div>
        )}
      </div>

      <div className={styles.cardMetaRow}>
        {variant === 'owner' ? (
          <>
            <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
              {new Date(opportunity.createdAt).toLocaleDateString('uk-UA')}
            </span>
            <div className={styles.cardActions}>
              <Button
                variant="secondary"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenApplicants?.(opportunity);
                }}
              >
                Відгуки
              </Button>
              <Button
                variant="primary"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDetail?.(opportunity);
                }}
              >
                Управління
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.ownerInfo} title={ownerName}>
              <div className={styles.ownerAvatar}>{initial}</div>
              <div className={styles.ownerMeta}>
                <span className={styles.ownerName}>{ownerName}</span>
                <span className={styles.ownerRole}>
                  {opportunity.ownerContactInfo || opportunity.owner?.email || 'Каразінський університет'}
                </span>
              </div>
            </div>

            <div className={styles.cardDetailsBtn}>
              <span>Деталі</span>
              <ArrowUpRight size={15} className={styles.cardArrow} />
            </div>
          </>
        )}
      </div>
    </article>
  );
};
