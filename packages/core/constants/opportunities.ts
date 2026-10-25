export const OPPORTUNITY_STATUS = {
  DRAFT: 'DRAFT',
  READY_FOR_REVIEW: 'READY_FOR_REVIEW',
  REQUIRES_CHANGES: 'REQUIRES_CHANGES',
  PUBLISHED: 'PUBLISHED',
  REJECTED: 'REJECTED',
} as const;

export type OpportunityStatus = (typeof OPPORTUNITY_STATUS)[keyof typeof OPPORTUNITY_STATUS];

export const OPPORTUNITY_LIFECYCLE = {
  START: 'START',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type OpportunityLifecycle =
  (typeof OPPORTUNITY_LIFECYCLE)[keyof typeof OPPORTUNITY_LIFECYCLE];

export const OPPORTUNITY_PAYMENT_TYPE = {
  PAID: 'PAID',
  UNPAID: 'UNPAID',
} as const;

export type OpportunityPaymentType =
  (typeof OPPORTUNITY_PAYMENT_TYPE)[keyof typeof OPPORTUNITY_PAYMENT_TYPE];

export const OPPORTUNITY_APP_STATUS = {
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
} as const;

export type OpportunityAppStatus =
  (typeof OPPORTUNITY_APP_STATUS)[keyof typeof OPPORTUNITY_APP_STATUS];

export const OPPORTUNITY_MODERATE_ACTION = {
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  REQUIRE_CHANGES: 'REQUIRE_CHANGES',
} as const;

export type OpportunityModerateAction =
  (typeof OPPORTUNITY_MODERATE_ACTION)[keyof typeof OPPORTUNITY_MODERATE_ACTION];

export const OPPORTUNITY_VIEW_PARAM = 'view' as const;

export const OPPORTUNITY_VIEW = {
  APPLICANTS: 'applicants',
} as const;

export type OpportunityView = (typeof OPPORTUNITY_VIEW)[keyof typeof OPPORTUNITY_VIEW];
