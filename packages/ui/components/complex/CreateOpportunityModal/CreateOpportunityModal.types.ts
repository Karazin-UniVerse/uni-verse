import type { SyntheticEvent, Dispatch, SetStateAction } from 'react';
import type { OpportunityLifecycle, OpportunityPaymentType } from '@core/constants/opportunities';
import type { OpportunityTag } from '@core/constants/tags';
import type { MultiSelectGroup } from '../../una/inputs/MultiSelect';
import type { OpportunityLifecycleOption } from '../OpportunityDetail/OpportunityDetail.types';

export type CreateOpportunityFormData = {
  title: string;
  description: string;
  ownerContactInfo: string;
  paymentType: OpportunityPaymentType;
  paymentDetails: string;
  tags?: OpportunityTag[];
  acceptsApplications?: boolean;
  lifecycleState?: OpportunityLifecycle;
};

type BaseCreateOpportunityModalProps = {
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
  remoderationWarning?: string;
  lifecycleOptions?: OpportunityLifecycleOption[];
  submitting?: boolean;
  className?: string;
};

type CreateOpportunityModalTagProps =
  | {
      tagsLabel: string;
      removeTagLabel: string;
      tagsPlaceholder: string;
      tagGroups: readonly MultiSelectGroup<OpportunityTag>[];
    }
  | {
      tagsLabel?: undefined;
      removeTagLabel?: undefined;
      tagsPlaceholder?: undefined;
      tagGroups?: undefined;
    };

export type CreateOpportunityModalProps = BaseCreateOpportunityModalProps &
  CreateOpportunityModalTagProps;
