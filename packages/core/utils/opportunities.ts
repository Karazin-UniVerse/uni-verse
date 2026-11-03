import {
  OPPORTUNITY_LIFECYCLE,
  OPPORTUNITY_PAYMENT_TYPE,
  OPPORTUNITY_STATUS,
  type OpportunityLifecycle,
  type OpportunityPaymentType,
} from '../constants/opportunities.ts';
import type {
  Opportunity,
  OpportunityContentFields,
  UpdateOpportunityRequest,
} from '../types/opportunities.ts';
import { normalizeTags } from './tags.ts';

export const getOpportunityTagNames = ({
  status,
  tags,
  proposedTags,
}: Partial<Pick<Opportunity, 'status' | 'tags' | 'proposedTags'>>): string[] => {
  if (status === OPPORTUNITY_STATUS.PUBLISHED) {
    return (tags ?? []).map((tag) => tag.name);
  }

  return proposedTags ?? [];
};

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
  current: OpportunityContentFields &
    Partial<Pick<Opportunity, 'status' | 'tags' | 'proposedTags'>>,
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

  if (currentTuple.some((value, index) => value !== updatedTuple[index])) {
    return true;
  }

  if (updated.tags === undefined) {
    return false;
  }

  const currentTags = normalizeTags(getOpportunityTagNames(current));
  const updatedTags = normalizeTags(updated.tags);

  return (
    currentTags.length !== updatedTags.length ||
    currentTags.some((tag) => !updatedTags.includes(tag))
  );
}
