/**
 * Normalizes a raw email string: trims whitespace and converts to lowercase.
 */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Appends the university domain suffix when the input has no `@` symbol.
 */
export function buildEmailWithDomain(raw: string, domain: string): string {
  return raw.includes('@') ? raw : `${raw}@${domain}`;
}

/**
 * Returns true when the given error is a Prisma unique-constraint violation (P2002).
 */
export function isPrismaUniqueConstraintError(err: unknown): boolean {
  return Boolean(
    err &&
    typeof err === 'object' &&
    'code' in err &&
    (err as { code: string }).code === 'P2002',
  );
}
