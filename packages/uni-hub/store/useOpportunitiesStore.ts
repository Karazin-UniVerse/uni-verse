import { create } from 'zustand';
import type { OpportunityPaymentType } from '@core/constants/opportunities';
import {
  OPPORTUNITY_SUB_TAB,
  type OpportunitySubTab,
} from '@uni-hub/views/dashboard/tabs/opportunities/constants';

export type OpportunityFilters = {
  paymentType: OpportunityPaymentType | '';
  isRecruiting: boolean;
  tags: string[];
};

type OpportunitiesState = {
  activeSubTab: OpportunitySubTab;
  search: string;
  paymentFilter: OpportunityPaymentType | '';
  isRecruiting: boolean;
  tags: string[];
  setActiveSubTab: (activeSubTab: OpportunitySubTab) => void;
  setSearch: (search: string) => void;
  setPaymentFilter: (paymentFilter: OpportunityPaymentType | '') => void;
  setIsRecruiting: (isRecruiting: boolean) => void;
  setTags: (tags: string[]) => void;
  setFilters: (filters: OpportunityFilters) => void;
  reset: () => void;
};

export const useOpportunitiesStore = create<OpportunitiesState>()((set) => ({
  activeSubTab: OPPORTUNITY_SUB_TAB.Catalog,
  search: '',
  paymentFilter: '',
  isRecruiting: false,
  tags: [],

  setActiveSubTab: (activeSubTab) => set({ activeSubTab }),
  setSearch: (search) => set({ search }),
  setPaymentFilter: (paymentFilter) => set({ paymentFilter }),
  setIsRecruiting: (isRecruiting) => set({ isRecruiting }),
  setTags: (tags) => set({ tags }),
  setFilters: ({ paymentType, isRecruiting, tags }) =>
    set({ paymentFilter: paymentType, isRecruiting, tags }),
  reset: () =>
    set({
      activeSubTab: OPPORTUNITY_SUB_TAB.Catalog,
      search: '',
      paymentFilter: '',
      isRecruiting: false,
      tags: [],
    }),
}));
