import React from 'react';
import { Sparkles, Coins } from 'lucide-react';
import { CategoryPill } from '@ui';

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
}) => (
  <CategoryPill
    icon={isPaid ? <Coins size={12} /> : <Sparkles size={12} />}
    label={isPaid ? paymentDetails || paidLabel : experienceLabel}
    tone={isPaid ? 'success' : 'neutral'}
  />
);
