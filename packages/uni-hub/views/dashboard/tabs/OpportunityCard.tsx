'use client';

import React from 'react';
import clsx from 'clsx';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { Opportunity } from '@core/types/opportunities';
import styles from './OpportunityCard.module.scss';
import { OpportunityCardTop } from './opportunities/components/OpportunityCardTop';
import { OpportunityOwnerMetaRow } from './opportunities/components/OpportunityOwnerMetaRow';
import { OpportunityCatalogMetaRow } from './opportunities/components/OpportunityCatalogMetaRow';
import { OPPORTUNITY_PAYMENT_TYPE } from '@core/constants/opportunities';
import { OPPORTUNITY_CARD_VARIANT } from './opportunities/constants';
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
  variant = OPPORTUNITY_CARD_VARIANT.CATALOG,
}) => {
  const { formatMessage, localeTag } = useLanguage();
  const isPaid = opportunity.paymentType === OPPORTUNITY_PAYMENT_TYPE.PAID;
  const isOwner = variant === OPPORTUNITY_CARD_VARIANT.OWNER;

  const cardClassName = clsx(
    styles.card,
    isPaid ? styles.paidCard : styles.unpaidCard,
    !isOwner && styles.clickableCard,
  );

  const content = (
    <>
      <OpportunityCardTop
        opportunity={opportunity}
        isPaid={isPaid}
        isOwner={isOwner}
        statusBadge={statusBadge}
        formatMessage={formatMessage}
      />

      {isOwner && (
        <OpportunityCatalogMetaRow opportunity={opportunity} formatMessage={formatMessage} />
      )}

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
    </>
  );

  if (isOwner) {
    return <article className={cardClassName}>{content}</article>;
  }

  return (
    <article className={cardClassName}>
      {content}
      <button
        type="button"
        className={styles.cardLink}
        aria-label={formatMessage('opportunities.card.detailsAria', { title: opportunity.title })}
        onClick={() => onOpenDetail?.(opportunity)}
      />
    </article>
  );
};
