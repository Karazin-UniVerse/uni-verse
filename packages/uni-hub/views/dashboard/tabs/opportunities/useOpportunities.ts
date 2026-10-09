import { useOpportunitiesData } from './useOpportunitiesData';
import { useOpportunityModals } from './useOpportunityModals';

export function useOpportunities() {
  const data = useOpportunitiesData();
  const modals = useOpportunityModals({
    activeSubTab: data.activeSubTab,
    setActiveSubTab: data.setActiveSubTab,
    fetchMyOpportunities: data.fetchMyOpportunities,
    fetchMyApplications: data.fetchMyApplications,
    setMyApplications: data.setMyApplications,
    setModerationQueue: data.setModerationQueue,
  });

  return {
    ...data,
    ...modals,
  };
}
