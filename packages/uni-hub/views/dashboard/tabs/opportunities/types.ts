import type { OpportunityPaymentType } from '@core/constants/opportunities';
import type { OpportunitySubTab } from './constants';
import type { TranslationKey } from '@uni-hub/i18n/translations';

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
export type FormatMessage = (
  key: TranslationKey,
  values?: Record<string, string | number>,
) => string;
