import { createHash } from 'node:crypto';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import {
  OPPORTUNITY_MODERATE_ACTION,
  OPPORTUNITY_AVAILABILITY,
  OPPORTUNITY_STATUS,
} from '@universe/core/constants/opportunities';
import { isValidContactInfo } from '@universe/core/utils/contacts';
import { normalizeOpportunityContent } from '@universe/core/utils/opportunities';
import type {
  Opportunity,
  OpportunityStatus,
  Prisma,
} from '@universe/database';
import type { ModerateOpportunityDto } from './dto/moderate-opportunity.dto';

import type { UnavailableOpportunity } from '@universe/core/types/opportunities';

export function unavailableOpportunity(
  opportunity: Pick<Opportunity, 'id' | 'status' | 'paymentType'>,
  title = '',
  paymentType?: Opportunity['paymentType'],
): UnavailableOpportunity {
  return {
    id: opportunity.id,
    title,
    ...(paymentType ? { paymentType } : {}),
    availability:
      opportunity.status === OPPORTUNITY_STATUS.REJECTED
        ? OPPORTUNITY_AVAILABILITY.PERMANENT
        : OPPORTUNITY_AVAILABILITY.TEMPORARY,
  };
}

export const toTagRecord = (name: string): { name: string } => ({ name });

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
  const names = opportunity.proposedTags;

  if (isApprove && names.length) {
    await tx.tag.createMany({
      data: names.map(toTagRecord),
      skipDuplicates: true,
    });
  }

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
        tags: { set: names.map(toTagRecord) },
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
    | 'proposedTags'
  >,
): string {
  const content = normalizeOpportunityContent(opportunity);

  const tags = [...opportunity.proposedTags].sort((firstTag, secondTag) =>
    firstTag.localeCompare(secondTag),
  );
  const hashedContent = tags.length ? [...content, tags] : content;

  return createHash('sha256')
    .update(JSON.stringify(hashedContent))
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
