export const OPPORTUNITY_AVAILABILITY = {
  TEMPORARY: 'temporary',
  PERMANENT: 'permanent',
} as const;

export type OpportunityAvailability =
  (typeof OPPORTUNITY_AVAILABILITY)[keyof typeof OPPORTUNITY_AVAILABILITY];
