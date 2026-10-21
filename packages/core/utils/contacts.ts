const TELEGRAM_REGEX =
  /^(@[a-zA-Z][a-zA-Z0-9_]{3,31}|(https?:\/\/)?(www\.)?(t|telegram)\.me\/[a-zA-Z][a-zA-Z0-9_]{3,31}\/?)$/i;

const PHONE_CHARS_REGEX = /^\+?[0-9\s\-()]+$/;

function isValidPhoneNumber(trimmed: string): boolean {
  if (!PHONE_CHARS_REGEX.test(trimmed)) {
    return false;
  }

  // Ensure '+' only appears at index 0 if present
  if (trimmed.includes('+') && !trimmed.startsWith('+')) {
    return false;
  }

  const digitsOnly = trimmed.replaceAll(/\D/g, '');

  // Reject numbers with all identical digits (e.g., 0000000000, 1111111111)
  if (/^(\d)\1+$/.test(digitsOnly)) {
    return false;
  }

  // Reject numbers where the subscriber portion is all identical digits (e.g. +3705555555555, +380000000000)
  if (/^\d{1,4}(\d)\1{5,}$/.test(digitsOnly)) {
    return false;
  }

  if (trimmed.startsWith('+')) {
    // Country code cannot start with 0; total digits between 8 and 15
    if (digitsOnly.length < 8 || digitsOnly.length > 15 || digitsOnly.startsWith('0')) {
      return false;
    }

    // Ukrainian international format: +380XXXXXXXXX (12 digits, operator code starting with 1-9)
    if (digitsOnly.startsWith('380')) {
      return /^380[1-9]\d{8}$/.test(digitsOnly) && !/^380[1-9]\d0{7}$/.test(digitsOnly);
    }

    return true;
  }

  // Ukrainian national format: 0XXXXXXXXX (10 digits, operator code starting with 1-9)
  if (/^0[1-9]\d{8}$/.test(digitsOnly) && !/^0[1-9]\d0{7}$/.test(digitsOnly)) {
    return true;
  }

  // Ukrainian format without leading plus: 380XXXXXXXXX (12 digits)
  if (/^380[1-9]\d{8}$/.test(digitsOnly) && !/^380[1-9]\d0{7}$/.test(digitsOnly)) {
    return true;
  }

  return false;
}

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

  return isValidPhoneNumber(trimmed);
}
