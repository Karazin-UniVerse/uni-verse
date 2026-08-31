/**
 * Safely extracts the error code from a Prisma or database error.
 */
export function getPrismaErrorCode(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as { code: unknown }).code;
    return typeof code === 'string' ? code : '';
  }
  return '';
}

/**
 * Safely extracts the error name from an error object.
 */
export function getPrismaErrorName(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'name' in err) {
    const name = (err as { name: unknown }).name;
    return typeof name === 'string' ? name : '';
  }
  return '';
}
