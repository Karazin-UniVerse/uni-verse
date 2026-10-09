import type { OpportunityPaymentType } from '@uni-hub/types';
import type { OpportunitySubTab } from './constants';

export type SubTabKey = OpportunitySubTab;

export interface CreateOpportunityFormData {
  title: string;
  description: string;
  ownerContactInfo: string;
  paymentType: OpportunityPaymentType;
  paymentDetails: string;
}

export interface RejectModalState {
  open: boolean;
  id: string | null;
  comment: string;
}
