export type { CreateOpportunityFormData } from '@ui';

export interface RejectModalState {
  open: boolean;
  id: string | null;
  comment: string;
}
