export const BCRYPT_SALT_ROUNDS = 12;

export const JWT_ALGORITHM = 'HS256';

// shortcut: in-memory storage makes this a per-instance limit; see "Credential rate limit" in docs/tech-debt.md.
export const CREDENTIALS_THROTTLE = { ttl: 60_000, limit: 10 } as const;
