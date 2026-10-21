import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { Opportunity } from '@core/types/opportunities';
import styles from '../../OpportunityCard.module.scss';
import type { FormatMessage } from '../types';

interface Props {
  opportunity: Opportunity;
  formatMessage: FormatMessage;
}

export const OpportunityCatalogMetaRow: React.FC<Props> = ({ opportunity, formatMessage }) => {
  const defaultOwner = formatMessage('opportunities.card.defaultOwner');
  const ownerName = opportunity.owner?.name || opportunity.owner?.email || defaultOwner;
  const initial = ownerName.charAt(0).toUpperCase();
  const contactInfo = opportunity.ownerContactInfo || opportunity.owner?.email || defaultOwner;

  return (
    <>
      <div className={styles.ownerInfo} title={ownerName}>
        <div className={styles.ownerAvatar}>{initial}</div>
        <div className={styles.ownerMeta}>
          <span className={styles.ownerName}>{ownerName}</span>
          <span className={styles.ownerRole}>{contactInfo}</span>
        </div>
      </div>
      <span className={styles.cardDetailsLabel} aria-hidden="true">
        <span>{formatMessage('opportunities.card.details')}</span>
        <ArrowUpRight size={15} className={styles.cardArrow} />
      </span>
    </>
  );
};
