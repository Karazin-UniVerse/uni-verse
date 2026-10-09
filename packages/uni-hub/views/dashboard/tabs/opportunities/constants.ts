export const OPPORTUNITY_SUB_TAB = {
  Catalog: 'catalog',
  MyOpportunities: 'my-opportunities',
  MyApplications: 'my-applications',
  Moderation: 'moderation',
} as const;

export type OpportunitySubTab = (typeof OPPORTUNITY_SUB_TAB)[keyof typeof OPPORTUNITY_SUB_TAB];

export const OPPORTUNITY_SUB_TABS = Object.values(OPPORTUNITY_SUB_TAB);
