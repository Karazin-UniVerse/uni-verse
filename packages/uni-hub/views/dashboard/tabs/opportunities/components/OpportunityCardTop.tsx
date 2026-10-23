import React from 'react';
import clsx from 'clsx';
import { Briefcase } from 'lucide-react';
import type { Opportunity } from '@core/types/opportunities';
import styles from '../../OpportunityCard.module.scss';
import type { FormatMessage } from '@uni-hub/i18n/LanguageContext';
import { OpportunityCompensationBadge } from './OpportunityCompensationBadge';

interface Props {
  opportunity: Opportunity;
  isPaid: boolean;
  isOwner: boolean;
  formatMessage: FormatMessage;
  statusBadge?: React.ReactNode;
}

export const OpportunityCardTop: React.FC<Props> = ({
  opportunity,
  isPaid,
  isOwner,
  formatMessage,
  statusBadge,
}) => (
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

      {isOwner ? (
        statusBadge
      ) : (
        <OpportunityCompensationBadge
          isPaid={isPaid}
          paidLabel={formatMessage('opportunities.card.paidDefault')}
          experienceLabel={formatMessage('opportunities.card.experience')}
          paymentDetails={opportunity.paymentDetails}
        />
      )}
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
);
