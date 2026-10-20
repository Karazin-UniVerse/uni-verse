import React from 'react';
import clsx from 'clsx';
import { Briefcase } from 'lucide-react';
import type { Opportunity } from '@core/types/opportunities';
import styles from '../../OpportunityCard.module.scss';
import type { FormatMessage } from '../types';
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
      <div
        className={clsx(styles.categoryPill, isPaid ? styles.paidCategory : styles.unpaidCategory)}
      >
        <Briefcase size={12} />
        <span>
          {isPaid
            ? formatMessage('opportunities.card.vacancy')
            : formatMessage('opportunities.card.practice')}
        </span>
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
