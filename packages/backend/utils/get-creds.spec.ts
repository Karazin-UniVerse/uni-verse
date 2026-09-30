import { GetCreds } from './get-creds';

describe('GetCreds Utility Service', () => {
  let service: GetCreds;
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      MOODLE_BASEURL: 'https://moodle.karazin.ua/',
    };
    service = new GetCreds();
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('getBaseUrl', () => {
    it('should throw when MOODLE_BASEURL does not use https://', () => {
      process.env.MOODLE_BASEURL = 'http://insecure-moodle.karazin.ua';

      expect(() =>
        (service as unknown as { getBaseUrl: () => string }).getBaseUrl(),
      ).toThrow('MOODLE_BASEURL must use the secure https:// protocol');
    });

    it('should strip trailing slash from base url', () => {
      process.env.MOODLE_BASEURL = 'https://moodle.karazin.ua/';

      const url = (
        service as unknown as { getBaseUrl: () => string }
      ).getBaseUrl();

      expect(url).toBe('https://moodle.karazin.ua');
    });
  });

  describe('getToken', () => {
    it('should throw when email or password are empty', async () => {
      await expect(service.getToken('', 'pass')).rejects.toThrow(
        'Email and password are required',
      );
      await expect(service.getToken('email@karazin.ua', '')).rejects.toThrow(
        'Email and password are required',
      );
    });

    it('should fetch and return moodle token successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        text: async () => JSON.stringify({ token: 'moodle-access-token-xyz' }),
      } as Response);

      const token = await service.getToken('student@karazin.ua', 'Password123');

      expect(token).toBe('moodle-access-token-xyz');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://moodle.karazin.ua/login/token.php',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });

    it('should throw when moodle returns an error or no token', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        text: async () =>
          JSON.stringify({ error: 'Invalid login credentials' }),
      } as Response);

      await expect(
        service.getToken('student@karazin.ua', 'WrongPassword'),
      ).rejects.toThrow('Moodle error: Invalid login credentials');
    });
  });

  describe('getUserId', () => {
    it('should throw when token is empty', async () => {
      await expect(service.getUserId('')).rejects.toThrow('Token is required');
    });

    it('should return userId as string when response is valid', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: async () => ({ userid: 4021 }),
      } as Response);

      const userId = await service.getUserId('valid-token');

      expect(userId).toBe('4021');
    });

    it('should throw when moodle returns error or errorcode in site info', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: async () => ({ errorcode: 'invalidtoken' }),
      } as Response);

      await expect(service.getUserId('invalid-token')).rejects.toThrow(
        'Moodle error: invalidtoken',
      );
    });
  });
});
