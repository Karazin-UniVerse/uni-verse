/**
 * Default allowed Google Workspace domains for university users.
 */
export const DEFAULT_ALLOWED_DOMAINS: readonly string[] = [
  'karazin.ua',
  'student.karazin.ua',
];

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

/**
 * Parses comma-separated allowed domains, falling back to canonical university domains.
 */
export function parseAllowedDomains(raw?: string): string[] {
  if (!raw) {
    return [...DEFAULT_ALLOWED_DOMAINS];
  }

  return raw
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Validates that an authenticated Google user belongs to an allowed university domain.
 * Verifies both the cryptographically signed `hd` (hosted domain) claim and the normalized email suffix.
 */
export function isAllowedCorporateDomain(
  email: string,
  hostedDomain?: string,
  allowedDomains: string[] = [...DEFAULT_ALLOWED_DOMAINS],
): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedHd = hostedDomain?.trim().toLowerCase();

  const isEmailValid = allowedDomains.some((domain) =>
    normalizedEmail.endsWith(`@${domain}`),
  );
  const isHdValid = normalizedHd
    ? allowedDomains.includes(normalizedHd)
    : allowedDomains.includes('gmail.com');

  return isHdValid && isEmailValid;
}

/**
 * Safely extracts the user's display name from a Google token payload,
 * falling back to given and family names if available.
 */
export function extractGoogleUserName(payload?: {
  name?: string;
  given_name?: string;
  family_name?: string;
}): string | undefined {
  if (!payload) {
    return undefined;
  }

  const fallbackName =
    `${payload.given_name || ''} ${payload.family_name || ''}`.trim();

  return payload.name || fallbackName || undefined;
}
