import {
  DEFAULT_ALLOWED_DOMAINS,
  normalizeEmail,
  buildEmailWithDomain,
  isPrismaUniqueConstraintError,
  parseAllowedDomains,
  isAllowedCorporateDomain,
  extractGoogleUserName,
} from './auth.utils';

describe('auth.utils', () => {
  describe('normalizeEmail', () => {
    it('should trim whitespace and lowercase email', () => {
      expect(normalizeEmail('  Student@Karazin.UA  ')).toBe(
        'student@karazin.ua',
      );
    });
  });

  describe('buildEmailWithDomain', () => {
    it('should append domain when no @ symbol exists', () => {
      expect(buildEmailWithDomain('john.doe', 'student.karazin.ua')).toBe(
        'john.doe@student.karazin.ua',
      );
    });

    it('should keep raw string when @ symbol exists', () => {
      expect(
        buildEmailWithDomain('john@custom.com', 'student.karazin.ua'),
      ).toBe('john@custom.com');
    });
  });

  describe('isPrismaUniqueConstraintError', () => {
    it('should return true for P2002 error', () => {
      expect(isPrismaUniqueConstraintError({ code: 'P2002' })).toBe(true);
    });

    it('should return false for non-P2002 errors or primitives', () => {
      expect(isPrismaUniqueConstraintError({ code: 'P2025' })).toBe(false);
      expect(isPrismaUniqueConstraintError(new Error('Generic error'))).toBe(
        false,
      );
      expect(isPrismaUniqueConstraintError(null)).toBe(false);
      expect(isPrismaUniqueConstraintError(undefined)).toBe(false);
      expect(isPrismaUniqueConstraintError('error')).toBe(false);
    });
  });

  describe('parseAllowedDomains', () => {
    it('should return DEFAULT_ALLOWED_DOMAINS when raw input is undefined or empty', () => {
      expect(parseAllowedDomains()).toEqual([...DEFAULT_ALLOWED_DOMAINS]);
      expect(parseAllowedDomains('')).toEqual([...DEFAULT_ALLOWED_DOMAINS]);
    });

    it('should parse comma-separated domains and trim whitespace', () => {
      const result = parseAllowedDomains(
        ' karazin.ua,  student.karazin.ua , custom.edu ',
      );

      expect(result).toEqual([
        'karazin.ua',
        'student.karazin.ua',
        'custom.edu',
      ]);
    });
  });

  describe('isAllowedCorporateDomain', () => {
    it('should allow valid student domain with matching hd', () => {
      const isAllowed = isAllowedCorporateDomain(
        'student@student.karazin.ua',
        'student.karazin.ua',
      );

      expect(isAllowed).toBe(true);
    });

    it('should allow valid faculty domain with matching hd', () => {
      const isAllowed = isAllowedCorporateDomain(
        'professor@karazin.ua',
        'karazin.ua',
      );

      expect(isAllowed).toBe(true);
    });

    it('should reject personal gmail account with no hd', () => {
      const isAllowed = isAllowedCorporateDomain(
        'personal@gmail.com',
        undefined,
      );

      expect(isAllowed).toBe(false);
    });

    it('should reject other university domain', () => {
      const isAllowed = isAllowedCorporateDomain(
        'user@other-uni.edu',
        'other-uni.edu',
      );

      expect(isAllowed).toBe(false);
    });

    it('should reject forged hd when email domain does not match', () => {
      const isAllowed = isAllowedCorporateDomain(
        'attacker@external.com',
        'student.karazin.ua',
      );

      expect(isAllowed).toBe(false);
    });

    it('should permit gmail when explicitly configured in allowed domains', () => {
      const isAllowed = isAllowedCorporateDomain('dev@gmail.com', undefined, [
        'karazin.ua',
        'gmail.com',
      ]);

      expect(isAllowed).toBe(true);
    });
  });

  describe('extractGoogleUserName', () => {
    it('should return undefined when payload is not provided', () => {
      expect(extractGoogleUserName()).toBeUndefined();
    });

    it('should return payload.name when available', () => {
      expect(
        extractGoogleUserName({
          name: 'Jane Doe',
          given_name: 'Jane',
          family_name: 'Doe',
        }),
      ).toBe('Jane Doe');
    });

    it('should fallback to given_name and family_name when name is absent', () => {
      expect(
        extractGoogleUserName({
          given_name: 'Jane',
          family_name: 'Doe',
        }),
      ).toBe('Jane Doe');
    });

    it('should return undefined when all names are empty strings', () => {
      expect(
        extractGoogleUserName({
          name: '',
          given_name: '',
          family_name: '',
        }),
      ).toBeUndefined();
    });
  });
});
