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
    expect(state.isRecruiting).toBe(false);
    expect(state.tags).toEqual([]);
  });

  it('keeps the selected sub-tab, search and payment filter until they change again', () => {
    const { setActiveSubTab, setSearch, setPaymentFilter, setIsRecruiting, setTags } =
      useOpportunitiesStore.getState();

    setActiveSubTab(OPPORTUNITY_SUB_TAB.MyApplications);
    setSearch('python');
    setPaymentFilter('PAID');
    setIsRecruiting(true);
    setTags(['react']);

    const state = useOpportunitiesStore.getState();

    expect(state.activeSubTab).toBe(OPPORTUNITY_SUB_TAB.MyApplications);
    expect(state.search).toBe('python');
    expect(state.paymentFilter).toBe('PAID');
    expect(state.isRecruiting).toBe(true);
    expect(state.tags).toEqual(['react']);
  });

  it('sets all filters via setFilters', () => {
    const { setFilters } = useOpportunitiesStore.getState();

    setFilters({
      paymentType: 'UNPAID',
      isRecruiting: true,
      tags: ['design'],
    });

    const state = useOpportunitiesStore.getState();

    expect(state.paymentFilter).toBe('UNPAID');
    expect(state.isRecruiting).toBe(true);
    expect(state.tags).toEqual(['design']);
  });

  it('should reset changed state back to catalog defaults via reset', () => {
    const { setActiveSubTab, setSearch, setPaymentFilter, setIsRecruiting, setTags, reset } =
      useOpportunitiesStore.getState();

    setActiveSubTab(OPPORTUNITY_SUB_TAB.MyApplications);
    setSearch('python');
    setPaymentFilter('PAID');

    setIsRecruiting(true);
    setTags(['react']);

    reset();

    const state = useOpportunitiesStore.getState();

    expect(state.activeSubTab).toBe(OPPORTUNITY_SUB_TAB.Catalog);
    expect(state.search).toBe('');
    expect(state.paymentFilter).toBe('');
    expect(state.isRecruiting).toBe(false);
    expect(state.tags).toEqual([]);
  });
});
