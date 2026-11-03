import type { OpportunityPaymentType } from '@core/constants/opportunities';

export type OpportunityFilterValue = {
  paymentType: OpportunityPaymentType | '';
  isRecruiting: boolean;
  tags: string[];
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
  formatCreateTag: (tag: string) => string;
};

export type OpportunityFilterPanelProps = {
  value: OpportunityFilterValue;
  onApply: (value: OpportunityFilterValue) => void;
  labels: OpportunityFilterPanelLabels;
  loadTagSuggestions?: (query: string) => Promise<string[]>;
  className?: string;
};
