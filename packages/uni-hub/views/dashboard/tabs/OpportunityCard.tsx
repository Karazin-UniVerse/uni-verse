'use client';

import React from 'react';
import clsx from 'clsx';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { Opportunity, OpportunityListItem } from '@core/types/opportunities';
import { OPPORTUNITY_PAYMENT_TYPE } from '@core/constants/opportunities';
import { isUnavailableOpportunity } from '@core/utils/opportunities';
import { FavoriteToggleButton } from './opportunities/components/FavoriteToggleButton';
import { OpportunityCardTop } from './opportunities/components/OpportunityCardTop';
import { OpportunityCatalogMetaRow } from './opportunities/components/OpportunityCatalogMetaRow';
import { OpportunityOwnerMetaRow } from './opportunities/components/OpportunityOwnerMetaRow';
import { OpportunityUnavailableNotice } from './opportunities/components/OpportunityUnavailableNotice';
import { OPPORTUNITY_CARD_VARIANT } from './opportunities/constants';
import styles from './OpportunityCard.module.scss';

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
      <FavoriteToggleButton
        isFavorite={isFavorite}
        disabled={favoriteDisabled}
        onToggle={() => onToggleFavorite(opportunity.id, isFavorite)}
      />
    </div>
  );

  if (isUnavailableOpportunity(opportunity)) {
    return (
      <article className={styles.card}>
        <div className={styles.unavailableHeader}>
          <h3 className={styles.cardTitle}>
            {opportunity.title || formatMessage('opportunities.myApplications.defaultTitle')}
          </h3>
          {favoriteAction}
        </div>
        <OpportunityUnavailableNotice availability={opportunity.availability} />
      </article>
    );
  }

  const isPaid = opportunity.paymentType === OPPORTUNITY_PAYMENT_TYPE.PAID;
  const isOwner = variant === OPPORTUNITY_CARD_VARIANT.OWNER;
  const isClickable = Boolean(onOpenDetail);

  const cardClassName = clsx(
    styles.card,
    isPaid ? styles.paidCard : styles.unpaidCard,
    isClickable && styles.clickableCard,
  );

  return (
    <article className={cardClassName}>
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
        {favoriteAction}
      </div>

      {isClickable && (
        <button
          type="button"
          className={styles.cardLink}
          aria-label={formatMessage('opportunities.card.detailsAria', { title: opportunity.title })}
          onClick={() => onOpenDetail?.(opportunity)}
        />
      )}
    </article>
  );
};
