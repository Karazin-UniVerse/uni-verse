import { createHash } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import {
  OPPORTUNITY_MODERATE_ACTION,
  OPPORTUNITY_STATUS,
} from '@universe/core/constants/opportunities';
import { OPPORTUNITY_AVAILABILITY } from '@universe/core/constants/opportunity-availability';
import { isValidContactInfo } from '@universe/core/utils/contacts';
import {
  isRecruitmentPhase,
  normalizeOpportunityContent,
} from '@universe/core/utils/opportunities';
import {
  OpportunityStatus,
  type Opportunity,
  type Prisma,
} from '@universe/database';
import type { ModerateOpportunityDto } from './dto/moderate-opportunity.dto';
import type { UpdateOpportunityDto } from './dto/update-opportunity.dto';

import type { UnavailableOpportunity } from '@universe/core/types/opportunities';

export function buildOpportunityUpdateData(
  opportunity: Opportunity,
  dto: UpdateOpportunityDto,
  hasContentChanges: boolean,
): Prisma.OpportunityUpdateInput {
  const data: Prisma.OpportunityUpdateInput = { ...dto };
  const nextLifecycleState = dto.lifecycleState ?? opportunity.lifecycleState;

  if (
    !isRecruitmentPhase(nextLifecycleState) &&
    (dto.lifecycleState !== undefined || dto.acceptsApplications !== undefined)
  ) {
    data.acceptsApplications = false;
  }

  if (dto.ownerContactInfo !== undefined) {
    data.ownerContactInfo = dto.ownerContactInfo.trim();
  }

  if (
    opportunity.status === OpportunityStatus.REQUIRES_CHANGES &&
    !opportunity.moderationContentHash
  ) {
    data.moderationContentHash = getOpportunityContentHash(opportunity);
  }

  if (opportunity.status === OpportunityStatus.PUBLISHED && hasContentChanges) {
    data.status = OpportunityStatus.READY_FOR_REVIEW;
    data.moderationComment = null;

    if (!opportunity.publishedTitle) {
      data.publishedTitle = opportunity.title;
      data.publishedPaymentType = opportunity.paymentType;
    }
  }

  return data;
}

export type SubscriberUpdateMetaParams = {
  opportunity: Opportunity;
  dto: UpdateOpportunityDto;
  data: Prisma.OpportunityUpdateInput;
  hasContentChanges: boolean;
};

export function getSubscriberUpdateMeta({
  opportunity,
  dto,
  data,
  hasContentChanges,
}: SubscriberUpdateMetaParams): {
  shouldNotify: boolean;
  hasLifecycleChanged: boolean;
} {
  const hasLifecycleChanged =
    dto.lifecycleState !== undefined &&
    dto.lifecycleState !== opportunity.lifecycleState;

  if (opportunity.status !== OpportunityStatus.PUBLISHED || hasContentChanges) {
    return { shouldNotify: false, hasLifecycleChanged };
  }

  const hasApplicationAvailabilityChanged =
    data.acceptsApplications !== undefined &&
    data.acceptsApplications !== opportunity.acceptsApplications;
  const previousTags = new Set(opportunity.tags);
  const currentTags = new Set(dto.tags);
  const hasTagsChanged =
    dto.tags !== undefined &&
    (previousTags.size !== currentTags.size ||
      [...currentTags].some((tag) => !previousTags.has(tag)));

  return {
    shouldNotify:
      hasApplicationAvailabilityChanged ||
      hasLifecycleChanged ||
      hasTagsChanged,
    hasLifecycleChanged,
  };
}

export function resolveModerationTargetStatus(
  dto: ModerateOpportunityDto,
): OpportunityStatus {
  if (dto.action === OPPORTUNITY_MODERATE_ACTION.APPROVE) {
    return OpportunityStatus.PUBLISHED;
  }

  if (
    dto.action === OPPORTUNITY_MODERATE_ACTION.REJECT ||
    dto.action === OPPORTUNITY_MODERATE_ACTION.REQUIRE_CHANGES
  ) {
    if (!dto.comment?.trim()) {
      throw new BadRequestException(
        dto.action === OPPORTUNITY_MODERATE_ACTION.REJECT
          ? 'Comment is required when rejecting an opportunity'
          : 'Comment is required when requesting changes',
      );
    }

    return dto.action === OPPORTUNITY_MODERATE_ACTION.REJECT
      ? OpportunityStatus.REJECTED
      : OpportunityStatus.REQUIRES_CHANGES;
  }

  throw new BadRequestException('Unknown moderation action');
}

/** Builds the public summary using fields captured at publication. */
export function unavailableOpportunity(
  opportunity: Pick<
    Opportunity,
    'id' | 'status' | 'publishedTitle' | 'publishedPaymentType'
  >,
): UnavailableOpportunity {
  return {
    id: opportunity.id,
    title: opportunity.publishedTitle ?? '',
    ...(opportunity.publishedPaymentType
      ? { paymentType: opportunity.publishedPaymentType }
      : {}),
    availability:
      opportunity.status === OPPORTUNITY_STATUS.REJECTED
        ? OPPORTUNITY_AVAILABILITY.PERMANENT
        : OPPORTUNITY_AVAILABILITY.TEMPORARY,
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
