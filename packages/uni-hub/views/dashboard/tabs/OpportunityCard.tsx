'use client';

import React from 'react';
import clsx from 'clsx';
import { Briefcase, Sparkles, Coins, ArrowUpRight } from 'lucide-react';
import { Button } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { TranslationKey } from '@uni-hub/i18n/translations';
import type { Opportunity } from '@core/types/opportunities';
import styles from './OpportunityCard.module.scss';

export interface OpportunityCardProps {
  opportunity: Opportunity;
  variant?: 'catalog' | 'owner';
  statusBadge?: React.ReactNode;
  onOpenDetail?: (opp: Opportunity) => void;
  onOpenApplicants?: (opp: Opportunity) => void;
}

type FormatMessage = (key: TranslationKey, values?: Record<string, string | number>) => string;

function resolveOwnerName(opportunity: Opportunity, fallback: string): string {
  return opportunity.owner?.name || opportunity.owner?.email || fallback;
}

function renderPublicBadge({
  isPaid,
  paidLabel,
  experienceLabel,
  paymentDetails,
}: {
  isPaid: boolean;
  paidLabel: string;
  experienceLabel: string;
  paymentDetails?: string | null;
}) {
  if (isPaid) {
    return (
      <span className={styles.compensationPill}>
        <Coins size={12} />
        {paymentDetails || paidLabel}
      </span>
    );
  }

  return (
    <span className={styles.experiencePill}>
      <Sparkles size={12} />
      {experienceLabel}
    </span>
  );
}

function renderOwnerMetaRow({
  opportunity,
  localeTag,
  formatMessage,
  onOpenApplicants,
  onOpenDetail,
}: {
  opportunity: Opportunity;
  localeTag: string;
  formatMessage: FormatMessage;
  onOpenApplicants?: (opp: Opportunity) => void;
  onOpenDetail?: (opp: Opportunity) => void;
}) {
  return (
    <>
      <span className={styles.cardDate}>
        {new Date(opportunity.createdAt).toLocaleDateString(localeTag)}
      </span>
      <div className={styles.cardActions}>
        <Button variant="secondary" onClick={() => onOpenApplicants?.(opportunity)}>
          {formatMessage('opportunities.card.applications')}
        </Button>
        <Button variant="primary" onClick={() => onOpenDetail?.(opportunity)}>
          {formatMessage('opportunities.card.management')}
        </Button>
      </div>
    </>
  );
}

function renderCatalogMetaRow({
  opportunity,
  ownerName,
  formatMessage,
  onOpenDetail,
}: {
  opportunity: Opportunity;
  ownerName: string;
  formatMessage: FormatMessage;
  onOpenDetail?: (opp: Opportunity) => void;
}) {
  const initial = ownerName.charAt(0).toUpperCase();
  const contactInfo =
    opportunity.ownerContactInfo ||
    opportunity.owner?.email ||
    formatMessage('opportunities.card.defaultOwner');

  return (
    <>
      <div className={styles.ownerInfo} title={ownerName}>
        <div className={styles.ownerAvatar}>{initial}</div>
        <div className={styles.ownerMeta}>
          <span className={styles.ownerName}>{ownerName}</span>
          <span className={styles.ownerRole}>{contactInfo}</span>
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
  );
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

  const ownerName = resolveOwnerName(opportunity, formatMessage('opportunities.card.defaultOwner'));

  return (
    <article
      className={clsx(
        styles.card,
        isPaid ? styles.paidCard : styles.unpaidCard,
        !isOwner && styles.clickableCard,
      )}
    >
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

          {isOwner
            ? statusBadge
            : renderPublicBadge({
                isPaid,
                paidLabel: formatMessage('opportunities.card.paidDefault'),
                experienceLabel: formatMessage('opportunities.card.experience'),
                paymentDetails: opportunity.paymentDetails,
              })}
        </div>

        <h3 className={styles.cardTitle}>{opportunity.title}</h3>
        <p className={styles.cardDescription}>{opportunity.description}</p>

        {isOwner && opportunity.moderationComment && (
          <div className={styles.warningBox}>
            <strong>{formatMessage('opportunities.card.moderatorNote')}</strong>{' '}
            {opportunity.moderationComment}
          </div>
        )}
      </div>

      <div className={styles.cardMetaRow}>
        {isOwner
          ? renderOwnerMetaRow({
              opportunity,
              localeTag,
              formatMessage,
              onOpenApplicants,
              onOpenDetail,
            })
          : renderCatalogMetaRow({
              opportunity,
              ownerName,
              formatMessage,
              onOpenDetail,
            })}
      </div>
    </article>
  );
};

export default OpportunityCard;
