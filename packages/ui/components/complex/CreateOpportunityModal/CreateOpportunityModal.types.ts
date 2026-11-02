import type { SyntheticEvent, Dispatch, SetStateAction } from 'react';
import type { OpportunityLifecycle, OpportunityPaymentType } from '@core/constants/opportunities';
import type { OpportunityLifecycleOption } from '../OpportunityDetail/OpportunityDetail.types';

export type CreateOpportunityFormData = {
  title: string;
  description: string;
  ownerContactInfo: string;
  paymentType: OpportunityPaymentType;
  paymentDetails: string;
  tags?: string[];
  acceptsApplications?: boolean;
  lifecycleState?: OpportunityLifecycle;
};

export type CreateOpportunityModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  formData: CreateOpportunityFormData;
  setFormData: Dispatch<SetStateAction<CreateOpportunityFormData>>;
  onSubmit: (e: SyntheticEvent<HTMLFormElement>) => void;
  titleLabel: string;
  titlePlaceholder: string;
  descLabel: string;
  descPlaceholder: string;
  contactLabel: string;
  contactPlaceholder: string;
  paymentTypeLabel: string;
  paymentDetailsLabel: string;
  paymentDetailsPlaceholder: string;
  unpaidOptionLabel: string;
  paidOptionLabel: string;
  cancelText: string;
  submitText: string;
  savingText: string;
  contactHint?: string;
  acceptsApplicationsLabel?: string;
  phaseLabel?: string;
  lifecycleOptions?: OpportunityLifecycleOption[];
  tagsLabel?: string;
  tagsPlaceholder?: string;
  removeTagLabel?: string;
  formatCreateTagLabel?: (tag: string) => string;
  loadTagSuggestions?: (query: string) => Promise<string[]>;
  submitting?: boolean;
  className?: string;
};
