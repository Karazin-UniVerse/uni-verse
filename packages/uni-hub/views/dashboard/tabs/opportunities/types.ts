import type { OpportunityPaymentType } from '@uni-hub/types';

export type SubTabKey = 'catalog' | 'my-opportunities' | 'my-applications' | 'moderation';

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
