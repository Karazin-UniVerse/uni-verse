import type { FormEvent, Dispatch, SetStateAction } from 'react';

export type OpportunityPaymentType = 'PAID' | 'UNPAID';

export type CreateOpportunityFormData = {
  title: string;
  description: string;
  ownerContactInfo: string;
  paymentType: OpportunityPaymentType;
  paymentDetails: string;
};

export type CreateOpportunityModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  formData: CreateOpportunityFormData;
  setFormData: Dispatch<SetStateAction<CreateOpportunityFormData>>;
  onSubmit: (e: FormEvent) => void;
  submitting?: boolean;
  titleLabel?: string;
  titlePlaceholder?: string;
  descLabel?: string;
  descPlaceholder?: string;
  contactLabel?: string;
  contactPlaceholder?: string;
  paymentTypeLabel?: string;
  paymentDetailsLabel?: string;
  paymentDetailsPlaceholder?: string;
  unpaidOptionLabel?: string;
  paidOptionLabel?: string;
  cancelText?: string;
  submitText?: string;
  savingText?: string;
  className?: string;
};
