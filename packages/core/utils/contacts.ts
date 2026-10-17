const TELEGRAM_REGEX =
  /^(@[a-zA-Z0-9_]{4,32}|(https?:\/\/)?(www\.)?t\.me\/[a-zA-Z0-9_]{4,32}\/?)$/i;
const PHONE_CHARS_REGEX = /^\+?[0-9\s\-()]{10,20}$/;
const MIN_PHONE_DIGITS = 10;
const MAX_PHONE_DIGITS = 15;

/**
 * Validates that the provided contact string is either a valid Telegram handle/link
 * or a valid phone number.
 */
export function isValidContactInfo(value?: string | null): boolean {
  const trimmed = value?.trim();

  if (!trimmed) {
    return false;
  }

  if (TELEGRAM_REGEX.test(trimmed)) {
    return true;
  }

  if (PHONE_CHARS_REGEX.test(trimmed)) {
    const digitsOnly = trimmed.replaceAll(/\D/g, '');

    return digitsOnly.length >= MIN_PHONE_DIGITS && digitsOnly.length <= MAX_PHONE_DIGITS;
  }

  return false;
}
