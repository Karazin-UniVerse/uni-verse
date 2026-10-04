/**
 * @universe/core/utils/boolean
 * Canonical boolean parsing utility.
 */

export const parseBoolean = (value: unknown): boolean | undefined => {
  if (value === true || value === 1) {
    return true;
  }

  if (value === false || value === 0) {
    return false;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();

    if (trimmed === 'true' || trimmed === '1' || trimmed === 'yes' || trimmed === 'on') {
      return true;
    }

    if (trimmed === 'false' || trimmed === '0' || trimmed === 'no' || trimmed === 'off') {
      return false;
    }
  }

  return undefined;
};
