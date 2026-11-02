import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { isValidContactInfo } from '@universe/core/utils/contacts';
import { normalizeOpportunityContent } from '@universe/core/utils/opportunities';
import { createHash } from 'node:crypto';
import type { Opportunity } from '@universe/database';

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
