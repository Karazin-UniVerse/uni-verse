import type { SyntheticEvent } from 'react';

export type ApplyOpportunityModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  motivation: string;
  onMotivationChange: (val: string) => void;
  contactInfo: string;
  onContactInfoChange: (val: string) => void;
  onSubmit: (e: SyntheticEvent<HTMLFormElement>) => void;
  motivationLabel: string;
  motivationPlaceholder: string;
  contactLabel: string;
  contactPlaceholder: string;
  cancelText: string;
  submitText: string;
  submittingText: string;
  submitting?: boolean;
  className?: string;
};
