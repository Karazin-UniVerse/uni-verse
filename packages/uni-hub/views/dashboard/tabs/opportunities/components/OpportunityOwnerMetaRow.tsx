import React from 'react';
import { Button } from '@una';
import type { Opportunity } from '@core/types/opportunities';
import styles from '../../OpportunityCard.module.scss';
import type { FormatMessage } from '../types';

interface Props {
  opportunity: Opportunity;
  localeTag: string;
  formatMessage: FormatMessage;
  onOpenApplicants?: (opp: Opportunity) => void;
  onOpenDetail?: (opp: Opportunity) => void;
}

export const OpportunityOwnerMetaRow: React.FC<Props> = ({
  opportunity,
  localeTag,
  formatMessage,
  onOpenApplicants,
  onOpenDetail,
}) => (
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
