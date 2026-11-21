import { LockKeyhole } from 'lucide-react';
import {
  OPPORTUNITY_AVAILABILITY,
  type OpportunityAvailability,
} from '@core/constants/opportunity-availability';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import styles from '../../OpportunityCard.module.scss';

/** Displays the localized status of an unavailable opportunity. */
export function OpportunityUnavailableNotice({
  availability,
}: {
  availability: OpportunityAvailability;
}) {
  const { formatMessage } = useLanguage();

  return (
    <p className={styles.unavailableNotice} role="status">
      <LockKeyhole size={20} aria-hidden="true" />
      {formatMessage(
        availability === OPPORTUNITY_AVAILABILITY.PERMANENT
          ? 'opportunities.unavailable.permanent'
          : 'opportunities.unavailable.temporary',
      )}
    </p>
  );
}
