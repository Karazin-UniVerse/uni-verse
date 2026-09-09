import { AtStrategy, JwtPayload } from './at.strategy';

describe('AtStrategy', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should throw an error if AT_SECRET is not set', () => {
    delete process.env.AT_SECRET;

    expect(() => new AtStrategy()).toThrow(
      'AT_SECRET environment variable is not set securely',
    );
  });

  it('should throw an error if AT_SECRET is the default insecure placeholder', () => {
    process.env.AT_SECRET = 'your-access-token-secret-key';

    expect(() => new AtStrategy()).toThrow(
      'AT_SECRET environment variable is not set securely',
    );
  });

  it('should instantiate successfully with a secure secret', () => {
    process.env.AT_SECRET = 'a-secure-production-ready-secret-key-12345';

    const strategy = new AtStrategy();

    expect(strategy).toBeDefined();
  });

  it('validate() should return payload unchanged', () => {
    process.env.AT_SECRET = 'a-secure-production-ready-secret-key-12345';

    const strategy = new AtStrategy();
    const payload: JwtPayload = {
      sub: 'user-123',
      email: 'student@karazin.ua',
      moodleToken: 'token-abc',
      moodleId: 'moodle-999',
    };

    const result = strategy.validate(payload);

    expect(result).toEqual(payload);
  });
});
