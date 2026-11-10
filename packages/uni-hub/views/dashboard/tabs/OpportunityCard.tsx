'use client';

import React from 'react';
import clsx from 'clsx';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { Opportunity, OpportunityListItem } from '@core/types/opportunities';
import { Star } from 'lucide-react';
import { Button } from '@una';
import { OpportunityUnavailableNotice } from './opportunities/components/OpportunityUnavailableNotice';
import styles from './OpportunityCard.module.scss';
import { OpportunityCardTop } from './opportunities/components/OpportunityCardTop';
import { OpportunityOwnerMetaRow } from './opportunities/components/OpportunityOwnerMetaRow';
import { OpportunityCatalogMetaRow } from './opportunities/components/OpportunityCatalogMetaRow';
import { OPPORTUNITY_PAYMENT_TYPE } from '@core/constants/opportunities';
import { OPPORTUNITY_CARD_VARIANT } from './opportunities/constants';
import { isUnavailableOpportunity } from '@core/utils/opportunities';
export interface OpportunityCardProps {
  opportunity: OpportunityListItem;
  variant?: 'catalog' | 'owner';
  statusBadge?: React.ReactNode;
  onOpenDetail?: (opp: Opportunity) => void;
  onOpenApplicants?: (opp: Opportunity) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string, isFavorite: boolean) => void;
  favoriteDisabled?: boolean;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({
  opportunity,
  statusBadge,
  onOpenDetail,
  onOpenApplicants,
  onToggleFavorite,
  favoriteDisabled,
  isFavorite = false,
  variant = OPPORTUNITY_CARD_VARIANT.CATALOG,
}) => {
  const { formatMessage, localeTag } = useLanguage();
  const favoriteAction = onToggleFavorite && (
    <div className={styles.favoriteAction}>
      <Button
        variant="secondary"
        disabled={favoriteDisabled}
        aria-pressed={isFavorite}
        aria-label={formatMessage(
          isFavorite ? 'opportunities.favorites.remove' : 'opportunities.favorites.add',
        )}
        onClick={() => onToggleFavorite(opportunity.id, isFavorite)}
      >
        <Star size={18} fill={isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />
      </Button>
    </div>
  );

  if (isUnavailableOpportunity(opportunity)) {
    return (
      <article className={styles.card}>
        <h3 className={styles.cardTitle}>{opportunity.title}</h3>
        <OpportunityUnavailableNotice availability={opportunity.availability} />
        {favoriteAction}
      </article>
    );
  }

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
        <div className={styles.ownerContactBlock}>
          <OpportunityCatalogMetaRow opportunity={opportunity} formatMessage={formatMessage} />
        </div>
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
      {favoriteAction}
      <button
        type="button"
        className={styles.cardLink}
        aria-label={formatMessage('opportunities.card.detailsAria', { title: opportunity.title })}
        onClick={() => onOpenDetail?.(opportunity)}
      />
    </article>
  );
};
