import {
  APPLICATION_STATUS_TRANSITIONS,
  MAX_APPLICATION_REAPPLIES,
  OWNER_TRACKED_WITHDRAWAL_STATUSES,
  OPPORTUNITY_APP_STATUS,
  type OpportunityAppStatus,
  OPPORTUNITY_LIFECYCLE,
  OPPORTUNITY_PAYMENT_TYPE,
  type OpportunityLifecycle,
  type OpportunityPaymentType,
} from '../constants/opportunities.ts';
import type {
  OpportunityContentFields,
  UnavailableOpportunity,
  UpdateOpportunityRequest,
} from '../types/opportunities.ts';

export function isWithdrawableApplicationStatus(status: OpportunityAppStatus): boolean {
  return (
    status === OPPORTUNITY_APP_STATUS.SUBMITTED ||
    status === OPPORTUNITY_APP_STATUS.UNDER_REVIEW ||
    status === OPPORTUNITY_APP_STATUS.ACCEPTED
  );
}

export function hasReachedApplicationReapplyLimit(reapplyCount?: number): boolean {
  return (reapplyCount ?? 0) >= MAX_APPLICATION_REAPPLIES;
}

export function canChangeApplicationStatus(
  from: OpportunityAppStatus,
  to: OpportunityAppStatus,
): boolean {
  return APPLICATION_STATUS_TRANSITIONS[from].includes(to);
}

export function isReapplicableApplicationStatus(status: OpportunityAppStatus): boolean {
  return status === OPPORTUNITY_APP_STATUS.WITHDRAWN || status === OPPORTUNITY_APP_STATUS.REJECTED;
}

export function isOwnerTrackedWithdrawalStatus(status: OpportunityAppStatus): boolean {
  return (OWNER_TRACKED_WITHDRAWAL_STATUSES as readonly OpportunityAppStatus[]).includes(status);
}

export function isRecruitmentPhase(lifecycleState?: OpportunityLifecycle): boolean {
  return (
    lifecycleState === undefined ||
    lifecycleState === OPPORTUNITY_LIFECYCLE.START ||
    lifecycleState === OPPORTUNITY_LIFECYCLE.ACTIVE
  );
}

export function normalizeOpportunityContent(
  opportunity: OpportunityContentFields,
): [string, string, string, OpportunityPaymentType, string | null] {
  const paymentType = opportunity.paymentType ?? OPPORTUNITY_PAYMENT_TYPE.UNPAID;
  const trimmedDetails =
    paymentType === OPPORTUNITY_PAYMENT_TYPE.PAID ? (opportunity.paymentDetails ?? '').trim() : '';

  return [
    (opportunity.title ?? '').trim(),
    (opportunity.description ?? '').trim(),
    (opportunity.ownerContactInfo ?? '').trim(),
    paymentType,
    trimmedDetails || null,
  ];
}

export function hasOpportunityContentChanged(
  current: OpportunityContentFields,
  updated: UpdateOpportunityRequest,
): boolean {
  const mergedPaymentType = updated.paymentType ?? current.paymentType;
  const currentTuple = normalizeOpportunityContent(current);
  const updatedTuple = normalizeOpportunityContent({
    title: updated.title ?? current.title,
    description: updated.description ?? current.description,
    ownerContactInfo: updated.ownerContactInfo ?? current.ownerContactInfo,
    paymentType: mergedPaymentType,
    paymentDetails:
      updated.paymentDetails !== undefined ? updated.paymentDetails : current.paymentDetails,
  });

  return currentTuple.some((value, index) => value !== updatedTuple[index]);
}

export function isUnavailableOpportunity(
  opportunity: object,
): opportunity is UnavailableOpportunity {
  return 'availability' in opportunity;
}
