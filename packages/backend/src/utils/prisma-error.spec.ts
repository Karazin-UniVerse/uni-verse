import { getPrismaErrorCode, getPrismaErrorName } from './prisma-error';

describe('prisma-error utils', () => {
  it('extracts error code from object with code property', () => {
    expect(getPrismaErrorCode({ code: 'P2002' })).toBe('P2002');
    expect(getPrismaErrorCode({ code: 'P2025' })).toBe('P2025');
  });

  it('returns empty string when error is null or has no code', () => {
    expect(getPrismaErrorCode(null)).toBe('');
    expect(getPrismaErrorCode(undefined)).toBe('');
    expect(getPrismaErrorCode('some error string')).toBe('');
    expect(getPrismaErrorCode({})).toBe('');
    expect(getPrismaErrorCode({ code: 123 })).toBe('');
  });

  it('extracts error name from object with name property', () => {
    expect(getPrismaErrorName({ name: 'PrismaClientValidationError' })).toBe(
      'PrismaClientValidationError',
    );
  });

  it('returns empty string when error is null or has no name', () => {
    expect(getPrismaErrorName(null)).toBe('');
    expect(getPrismaErrorName(undefined)).toBe('');
    expect(getPrismaErrorName({})).toBe('');
  });
});
