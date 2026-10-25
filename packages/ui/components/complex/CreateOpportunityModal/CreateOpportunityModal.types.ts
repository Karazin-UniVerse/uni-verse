import type { SyntheticEvent, Dispatch, SetStateAction } from 'react';
import type { OpportunityLifecycle, OpportunityPaymentType } from '@core/constants/opportunities';
import type { OpportunityLifecycleOption } from '../OpportunityDetail/OpportunityDetail.types';

export type CreateOpportunityFormData = {
  title: string;
  description: string;
  ownerContactInfo: string;
  paymentType: OpportunityPaymentType;
  paymentDetails: string;
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
  acceptsApplicationsLabel?: string;
  phaseLabel?: string;
  lifecycleOptions?: OpportunityLifecycleOption[];
  submitting?: boolean;
  className?: string;
};
