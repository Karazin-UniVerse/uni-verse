import React from 'react';
import { Briefcase } from 'lucide-react';
import { Tag } from '@una';
import { CategoryPill } from '@ui';
import type { Opportunity } from '@core/types/opportunities';
import styles from '../../OpportunityCard.module.scss';
import type { FormatMessage } from '@uni-hub/i18n/LanguageContext';
import { OpportunityCompensationBadge } from './OpportunityCompensationBadge';
import { getOpportunityTagLabel } from '../tags';

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
      <CategoryPill
        icon={<Briefcase size={12} />}
        label={
          isPaid
            ? formatMessage('opportunities.card.vacancy')
            : formatMessage('opportunities.card.practice')
        }
        tone={isPaid ? 'success' : 'info'}
      />

      {opportunity.acceptsApplications === false && (
        <Tag tone="neutral" size="small">
          {formatMessage('opportunities.card.applicationsClosedBadge')}
        </Tag>
      )}

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

    {Boolean(opportunity.tags?.length) && (
      <div className={styles.cardTagsGroup}>
        {opportunity.tags?.map((tag) => (
          <Tag key={tag} tone="neutral" size="small">
            {getOpportunityTagLabel(tag, formatMessage)}
          </Tag>
        ))}
      </div>
    )}

    {isOwner && opportunity.moderationComment && (
      <div className={styles.warningBox}>
        <strong>{formatMessage('opportunities.card.moderatorNote')}</strong>{' '}
        {opportunity.moderationComment}
      </div>
    )}
  </div>
);
