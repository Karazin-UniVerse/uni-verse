import type { FormEvent } from 'react';

export type ApplyOpportunityModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  motivation: string;
  onMotivationChange: (val: string) => void;
  contactInfo: string;
  onContactInfoChange: (val: string) => void;
  onSubmit: (e: FormEvent) => void;
  submitting?: boolean;
  motivationLabel?: string;
  motivationPlaceholder?: string;
  contactLabel?: string;
  contactPlaceholder?: string;
  cancelText?: string;
  submitText?: string;
  submittingText?: string;
  className?: string;
};
