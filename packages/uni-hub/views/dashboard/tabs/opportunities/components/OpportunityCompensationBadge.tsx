import React from 'react';
import { Sparkles, Coins } from 'lucide-react';
import styles from '../../OpportunityCard.module.scss';

interface Props {
  isPaid: boolean;
  paidLabel: string;
  experienceLabel: string;
  paymentDetails?: string | null;
}

export const OpportunityCompensationBadge: React.FC<Props> = ({
  isPaid,
  paidLabel,
  experienceLabel,
  paymentDetails,
}) => {
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
};
