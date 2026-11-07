import { LockKeyhole } from 'lucide-react';
import type { OpportunityAvailability } from '@core/constants/opportunities';
import { OPPORTUNITY_AVAILABILITY } from '@core/constants/opportunities';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import styles from '../../OpportunityCard.module.scss';

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
