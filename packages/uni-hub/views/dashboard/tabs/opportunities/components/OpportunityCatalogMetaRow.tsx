import React from 'react';
import type { Opportunity } from '@core/types/opportunities';
import styles from '../../OpportunityCard.module.scss';
import type { FormatMessage } from '@uni-hub/i18n/LanguageContext';

interface Props {
  opportunity: Opportunity;
  formatMessage: FormatMessage;
}

export const OpportunityCatalogMetaRow: React.FC<Props> = ({ opportunity, formatMessage }) => {
  const defaultOwner = formatMessage('opportunities.card.defaultOwner');
  const ownerName = opportunity.owner?.name || opportunity.owner?.email || defaultOwner;
  const initial = ownerName.charAt(0).toUpperCase();
  const alternativeContact = opportunity.ownerContactInfo.trim();

  return (
    <div className={styles.ownerInfo} title={ownerName}>
      <div className={styles.ownerAvatar}>{initial}</div>
      <div className={styles.ownerMeta}>
        <span className={styles.ownerName}>{ownerName}</span>
        {opportunity.owner?.email && opportunity.owner?.email !== ownerName && (
          <span className={styles.ownerRole}>{opportunity.owner.email}</span>
        )}
        {alternativeContact && (
          <span
            className={styles.ownerRole}
            title={formatMessage('opportunities.alternativeContact')}
          >
            {alternativeContact}
          </span>
        )}
      </div>
    </div>
  );
};
