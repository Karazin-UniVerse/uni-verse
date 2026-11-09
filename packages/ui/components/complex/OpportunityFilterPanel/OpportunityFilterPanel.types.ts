import type { OpportunityPaymentType } from '@core/constants/opportunities';
import type { OpportunityTag } from '@core/constants/tags';
import type { MultiSelectGroup } from '../../una/inputs/MultiSelect';

export type OpportunityFilterValue = {
  paymentType: OpportunityPaymentType | '';
  isRecruiting: boolean;
  tags: OpportunityTag[];
};

export type OpportunityFilterPanelLabels = {
  open: string;
  close: string;
  title: string;
  paymentType: string;
  paymentAll: string;
  paymentPaid: string;
  paymentUnpaid: string;
  recruiting: string;
  tags: string;
  tagsPlaceholder: string;
  removeTag: string;
  apply: string;
};

export type OpportunityFilterPanelProps = {
  value: OpportunityFilterValue;
  onApply: (value: OpportunityFilterValue) => void;
  labels: OpportunityFilterPanelLabels;
  tagGroups: readonly MultiSelectGroup<OpportunityTag>[];
  className?: string;
};
