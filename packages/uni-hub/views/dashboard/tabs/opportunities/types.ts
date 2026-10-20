import type { OpportunityPaymentType } from '@core/constants/opportunities';
import type { OpportunitySubTab } from './constants';

export type SubTabKey = OpportunitySubTab;

export interface CreateOpportunityFormData {
  title: string;
  description: string;
  ownerContactInfo: string;
  paymentType: OpportunityPaymentType;
  paymentDetails: string;
  acceptsApplications?: boolean;
}

export interface RejectModalState {
  open: boolean;
  id: string | null;
  comment: string;
}
