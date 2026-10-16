import { create } from 'zustand';
import type { OpportunityPaymentType } from '@core/constants/opportunities';
import {
  OPPORTUNITY_SUB_TAB,
  type OpportunitySubTab,
} from '@uni-hub/views/dashboard/tabs/opportunities/constants';

type OpportunitiesState = {
  activeSubTab: OpportunitySubTab;
  search: string;
  paymentFilter: OpportunityPaymentType | '';
  setActiveSubTab: (activeSubTab: OpportunitySubTab) => void;
  setSearch: (search: string) => void;
  setPaymentFilter: (paymentFilter: OpportunityPaymentType | '') => void;
};

export const useOpportunitiesStore = create<OpportunitiesState>()((set) => ({
  activeSubTab: OPPORTUNITY_SUB_TAB.Catalog,
  search: '',
  paymentFilter: '',

  setActiveSubTab: (activeSubTab) => set({ activeSubTab }),
  setSearch: (search) => set({ search }),
  setPaymentFilter: (paymentFilter) => set({ paymentFilter }),
}));
