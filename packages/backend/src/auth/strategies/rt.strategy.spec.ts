import { Request } from 'express';
import { RtStrategy } from './rt.strategy';

describe('RtStrategy', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should throw an error if RT_SECRET is not set', () => {
    delete process.env.RT_SECRET;

    expect(() => new RtStrategy()).toThrow(
      'RT_SECRET environment variable is not set securely',
    );
  });

  it('should throw an error if RT_SECRET is the default insecure placeholder', () => {
    process.env.RT_SECRET = 'your-refresh-token-secret-key';

    expect(() => new RtStrategy()).toThrow(
      'RT_SECRET environment variable is not set securely',
    );
  });

  it('should instantiate successfully with a secure secret', () => {
    process.env.RT_SECRET = 'a-secure-refresh-token-secret-key-12345';

    const strategy = new RtStrategy();

    expect(strategy).toBeDefined();
  });

  it('validate() should attach refreshToken from request cookies to payload', () => {
    process.env.RT_SECRET = 'a-secure-refresh-token-secret-key-12345';

    const strategy = new RtStrategy();
    const mockReq = {
      cookies: {
        refreshToken: 'mock-refresh-token-value',
      },
    } as unknown as Request;

    const payload = { sub: 'user-id-456', email: 'user@example.com' };

    const result = strategy.validate(mockReq, payload);

    expect(result).toEqual({
      sub: 'user-id-456',
      email: 'user@example.com',
      refreshToken: 'mock-refresh-token-value',
    });
  });
});
