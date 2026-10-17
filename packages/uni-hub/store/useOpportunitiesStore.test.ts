import { describe, it, expect, beforeEach } from 'vitest';
import { OPPORTUNITY_SUB_TAB } from '@uni-hub/views/dashboard/tabs/opportunities/constants';
import { useOpportunitiesStore } from './useOpportunitiesStore';

describe('useOpportunitiesStore', () => {
  beforeEach(() => {
    useOpportunitiesStore.setState(useOpportunitiesStore.getInitialState());
  });

  it('starts on the catalog with an empty search and no payment filter', () => {
    const state = useOpportunitiesStore.getState();

    expect(state.activeSubTab).toBe(OPPORTUNITY_SUB_TAB.Catalog);
    expect(state.search).toBe('');
    expect(state.paymentFilter).toBe('');
  });

  it('keeps the selected sub-tab, search and payment filter until they change again', () => {
    const { setActiveSubTab, setSearch, setPaymentFilter } = useOpportunitiesStore.getState();

    setActiveSubTab(OPPORTUNITY_SUB_TAB.MyApplications);
    setSearch('python');
    setPaymentFilter('PAID');

    const state = useOpportunitiesStore.getState();

    expect(state.activeSubTab).toBe(OPPORTUNITY_SUB_TAB.MyApplications);
    expect(state.search).toBe('python');
    expect(state.paymentFilter).toBe('PAID');
  });
});
