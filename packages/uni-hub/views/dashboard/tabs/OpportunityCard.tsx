'use client';

import React from 'react';
import clsx from 'clsx';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { Opportunity } from '@core/types/opportunities';
import styles from './OpportunityCard.module.scss';
import { OpportunityCardTop } from './opportunities/components/OpportunityCardTop';
import { OpportunityOwnerMetaRow } from './opportunities/components/OpportunityOwnerMetaRow';
import { OpportunityCatalogMetaRow } from './opportunities/components/OpportunityCatalogMetaRow';

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
  const { formatMessage, localeTag } = useLanguage();
  const isPaid = opportunity.paymentType === 'PAID';
  const isOwner = variant === 'owner';

  const cardClassName = clsx(
    styles.card,
    isPaid ? styles.paidCard : styles.unpaidCard,
    !isOwner && styles.clickableCard,
  );

  const handleCardClick = isOwner ? undefined : () => onOpenDetail?.(opportunity);
  return (
    <article className={clsx(styles.card, isPaid ? styles.paidCard : styles.unpaidCard)}>
      <div className={styles.cardTop}>
        <div className={styles.cardBadgeRow}>
          <div className={styles.categoryBadgeGroup}>
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

            {opportunity.acceptsApplications === false && (
              <span className={styles.closedPill}>
                {formatMessage('opportunities.card.applicationsClosedBadge')}
              </span>
            )}
          </div>

          {variant === 'owner' ? statusBadge : publicBadge}
        </div>

  const handleCardKeyDown = isOwner
    ? undefined
    : (event: React.KeyboardEvent<HTMLElement>): void => {
        if (event.target !== event.currentTarget) {
          return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenDetail?.(opportunity);
        }
      };

  return (
    <article
      className={cardClassName}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role={isOwner ? undefined : 'button'}
      tabIndex={isOwner ? undefined : 0}
      aria-label={
        isOwner
          ? undefined
          : formatMessage('opportunities.card.detailsAria', { title: opportunity.title })
      }
    >
      <OpportunityCardTop
        opportunity={opportunity}
        isPaid={isPaid}
        isOwner={isOwner}
        statusBadge={statusBadge}
        formatMessage={formatMessage}
      />

      <div className={styles.cardMetaRow}>
        {isOwner ? (
          <OpportunityOwnerMetaRow
            opportunity={opportunity}
            localeTag={localeTag}
            formatMessage={formatMessage}
            onOpenApplicants={onOpenApplicants}
            onOpenDetail={onOpenDetail}
          />
        ) : (
          <OpportunityCatalogMetaRow opportunity={opportunity} formatMessage={formatMessage} />
        )}
      </div>
    </article>
  );
};
