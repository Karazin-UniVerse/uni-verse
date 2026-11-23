import React from 'react';
import { LockKeyhole } from 'lucide-react';
import {
  OPPORTUNITY_AVAILABILITY,
  type OpportunityAvailability,
} from '@core/constants/opportunity-availability';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import styles from '../../OpportunityCard.module.scss';

export interface OpportunityUnavailableNoticeProps {
  availability: OpportunityAvailability;
}

/** Displays the localized status of an unavailable opportunity. */
export function OpportunityUnavailableNotice({
  availability,
}: Readonly<OpportunityUnavailableNoticeProps>): React.JSX.Element {
  const { formatMessage } = useLanguage();

  return (
    <output className={styles.unavailableNotice}>
      <LockKeyhole size={20} aria-hidden="true" />
      {formatMessage(
        availability === OPPORTUNITY_AVAILABILITY.PERMANENT
          ? 'opportunities.unavailable.permanent'
          : 'opportunities.unavailable.temporary',
      )}
    </output>
  );
}
