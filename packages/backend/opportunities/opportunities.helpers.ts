import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { isValidContactInfo } from '@universe/core/utils/contacts';
import { createHash } from 'node:crypto';
import type { Opportunity } from '@universe/database';
import {
  OPPORTUNITY_PAYMENT_TYPE,
  OPPORTUNITY_AVAILABILITY,
  OPPORTUNITY_STATUS,
} from '@universe/core/constants/opportunities';

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
  const content = [
    opportunity.title.trim(),
    opportunity.description.trim(),
    opportunity.ownerContactInfo.trim(),
    opportunity.paymentType,
    opportunity.paymentType === OPPORTUNITY_PAYMENT_TYPE.PAID
      ? opportunity.paymentDetails?.trim() || null
      : null,
  ];

  return createHash('sha256').update(JSON.stringify(content)).digest('hex');
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
