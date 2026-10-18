import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { isValidContactInfo } from '@universe/core/utils/contacts';

@ValidatorConstraint({ name: 'isContactInfo', async: false })
export class IsContactInfoConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && isValidContactInfo(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a valid Telegram username (@username, t.me/...) or phone number (+380...)`;
  }
}
