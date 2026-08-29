jest.mock('../../utils/moodle-params-builder', () => ({
  buildMoodleParams: (params: Record<string, unknown>) =>
    Object.entries(params).map(([key, value]) => [key, String(value)]),
}));

import { MoodleClientService } from './moodle.client.service';

describe('MoodleClientService', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('constructor throws when MOODLE_BASEURL not http/https', () => {
    process.env.MOODLE_BASEURL = 'ftp://insecure.example.com';
    process.env.MOODLE_TIMEOUT = '1000';
    expect(() => new MoodleClientService()).toThrow(
      'MOODLE_BASEURL must be a valid URL (http:// or https://)',
    );
  });

  it('client sends request and returns parsed JSON', async () => {
    process.env.MOODLE_BASEURL = 'https://example.com';
    process.env.MOODLE_TIMEOUT = '1000';

    const svc = new MoodleClientService();
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: true })));

    const res = await svc.client<{ ok: boolean }>(
      'token',
      '1',
      'someFunction',
      { a: 1 },
    );
    expect(res).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalled();
  });

  it('client throws RequestTimeoutException on timeout', async () => {
    process.env.MOODLE_BASEURL = 'https://example.com';
    process.env.MOODLE_TIMEOUT = '1';
    const svc = new MoodleClientService();
    const error = new Error('Timeout');
    error.name = 'TimeoutError';
    jest.spyOn(global, 'fetch').mockRejectedValue(error);

    await expect(svc.client('t', '1', 'f', {})).rejects.toThrow(
      'Moodle request timeout',
    );
  });
});
