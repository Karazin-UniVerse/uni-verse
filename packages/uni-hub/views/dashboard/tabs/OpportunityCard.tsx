'use client';

import React from 'react';
import clsx from 'clsx';
import { Briefcase, Sparkles, Coins, ArrowUpRight } from 'lucide-react';
import { Button } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
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
  const { formatMessage } = useLanguage();
  const isPaid = opportunity.paymentType === 'PAID';
  const ownerName =
    opportunity.owner?.name ||
    opportunity.owner?.email ||
    formatMessage('opportunities.card.defaultOwner');
  const initial = ownerName.charAt(0).toUpperCase();

  const publicBadge = isPaid ? (
    <span className={styles.compensationPill}>
      <Coins size={12} />
      {opportunity.paymentDetails || formatMessage('opportunities.card.paidDefault')}
    </span>
  ) : (
    <span className={styles.experiencePill}>
      <Sparkles size={12} />
      {formatMessage('opportunities.card.experience')}
    </span>
  );

  return (
    <article className={clsx(styles.card, isPaid ? styles.paidCard : styles.unpaidCard)}>
      <div className={styles.cardTop}>
        <div className={styles.cardBadgeRow}>
          <div
            className={clsx(
              styles.categoryPill,
              isPaid ? styles.paidCategory : styles.unpaidCategory,
            )}
          >
            <Briefcase size={12} />
            <span>
              {isPaid
                ? formatMessage('opportunities.card.vacancy')
                : formatMessage('opportunities.card.practice')}
            </span>
          </div>

          {variant === 'owner' ? statusBadge : publicBadge}
        </div>

        <h3 className={styles.cardTitle}>{opportunity.title}</h3>
        <p className={styles.cardDescription}>{opportunity.description}</p>

        {variant === 'owner' && opportunity.moderationComment && (
          <div className={styles.warningBox}>
            <strong>{formatMessage('opportunities.card.moderatorNote')}</strong>{' '}
            {opportunity.moderationComment}
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
                size="medium"
                onClick={() => onOpenApplicants?.(opportunity)}
              >
                {formatMessage('opportunities.card.applications')}
              </Button>
              <Button variant="primary" size="medium" onClick={() => onOpenDetail?.(opportunity)}>
                {formatMessage('opportunities.card.management')}
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
                  {opportunity.ownerContactInfo ||
                    opportunity.owner?.email ||
                    formatMessage('opportunities.card.defaultOwner')}
                </span>
              </div>
            </div>

            <button
              type="button"
              className={styles.cardDetailsBtn}
              onClick={() => onOpenDetail?.(opportunity)}
              aria-label={formatMessage('opportunities.card.detailsAria', {
                title: opportunity.title,
              })}
            >
              <span>{formatMessage('opportunities.card.details')}</span>
              <ArrowUpRight size={15} className={styles.cardArrow} />
            </button>
          </>
        )}
      </div>
    </article>
  );
};
