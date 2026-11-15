import { createHash } from 'node:crypto';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import {
  OPPORTUNITY_MODERATE_ACTION,
  OPPORTUNITY_STATUS,
} from '@universe/core/constants/opportunities';
import { OpportunityAvailability } from '@universe/core/constants/opportunity-availability';
import { isValidContactInfo } from '@universe/core/utils/contacts';
import { normalizeOpportunityContent } from '@universe/core/utils/opportunities';
import type {
  Opportunity,
  OpportunityStatus,
  Prisma,
} from '@universe/database';
import type { ModerateOpportunityDto } from './dto/moderate-opportunity.dto';

import type { UnavailableOpportunity } from '@universe/core/types/opportunities';

/** Builds the public summary using fields captured at publication. */
export function unavailableOpportunity(
  opportunity: Pick<
    Opportunity,
    'id' | 'status' | 'publishedTitle' | 'publishedPaymentType'
  >,
  title = opportunity.publishedTitle ?? '',
  paymentType = opportunity.publishedPaymentType,
): UnavailableOpportunity {
  return {
    id: opportunity.id,
    title,
    ...(paymentType ? { paymentType } : {}),
    availability:
      opportunity.status === OPPORTUNITY_STATUS.REJECTED
        ? OpportunityAvailability.PERMANENT
        : OpportunityAvailability.TEMPORARY,
  };
}

export type ApplyModerationParams = {
  id: string;
  opportunity: Opportunity;
  newStatus: OpportunityStatus;
  dto: ModerateOpportunityDto;
};

export async function applyModerationInTransaction(
  tx: Prisma.TransactionClient,
  { id, opportunity, newStatus, dto }: ApplyModerationParams,
): Promise<Opportunity> {
  const isApprove = dto.action === OPPORTUNITY_MODERATE_ACTION.APPROVE;

  return tx.opportunity.update({
    where: {
      id,
      status: opportunity.status,
      updatedAt: opportunity.updatedAt,
    },
    data: {
      status: newStatus,
      moderationContentHash:
        dto.action === OPPORTUNITY_MODERATE_ACTION.REQUIRE_CHANGES
          ? getOpportunityContentHash(opportunity)
          : null,
      moderationComment: isApprove ? null : dto.comment,
      ...(isApprove && {
        publishedAt: opportunity.publishedAt ?? new Date(),
        publishedTitle: opportunity.title,
        publishedPaymentType: opportunity.paymentType,
      }),
    },
  });
}

export function getOpportunityContentHash(
  opportunity: Pick<
    Opportunity,
    | 'title'
    | 'description'
    | 'ownerContactInfo'
    | 'paymentType'
    | 'paymentDetails'
  >,
): string {
  return createHash('sha256')
    .update(JSON.stringify(normalizeOpportunityContent(opportunity)))
    .digest('hex');
}

@ValidatorConstraint({ name: 'isContactInfo', async: false })
export class IsContactInfoConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return (
      typeof value === 'string' && (!value.trim() || isValidContactInfo(value))
    );
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a valid Telegram username (@username, t.me/...) or phone number (+380...)`;
  }
}
