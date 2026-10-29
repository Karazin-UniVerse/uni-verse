import { GeminiKeyPool } from '../gemini-key-pool';

describe('GeminiKeyPool', () => {
  const excluded = new Set<number>();
  let now: number;

  beforeEach(() => {
    now = Date.UTC(2026, 9, 29);
    jest.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(() => jest.restoreAllMocks());

  it('rotates ties and reserves the least-active key before returning', () => {
    const pool = new GeminiKeyPool(['first', 'second']);

    expect(pool.reserve(excluded)).toEqual({ slot: 0, apiKey: 'first' });
    expect(pool.reserve(excluded)).toEqual({ slot: 1, apiKey: 'second' });
    pool.release(1);
    expect(pool.reserve(excluded)?.slot).toBe(1);
    pool.release(1);
    pool.release(0);
    expect(pool.reserve(excluded)?.slot).toBe(0);
    pool.release(0);
    expect(pool.reserve(excluded)?.slot).toBe(1);
  });

  it('excludes already attempted keys without reserving during availability checks', () => {
    const pool = new GeminiKeyPool(['first', 'second']);

    expect(pool.hasAvailable(new Set([0, 1]))).toBe(false);
    expect(pool.reserve(new Set([0, 1]))).toBeUndefined();
    expect(pool.hasAvailable(excluded)).toBe(true);
    expect(pool.hasAvailable(excluded)).toBe(true);
    expect(pool.reserve(new Set([0]))?.slot).toBe(1);
    expect(pool.reserve(excluded)?.slot).toBe(0);
  });

  it.each([undefined, 500, 502, 503, 504])(
    'recovers a transport/5xx key after 30 seconds: %s',
    (status) => {
      const pool = new GeminiKeyPool(['first']);

      pool.coolDown({ slot: 0, status });
      expect(pool.hasAvailable(excluded)).toBe(false);
      now += 29_999;
      expect(pool.reserve(excluded)).toBeUndefined();
      now += 1;
      expect(pool.reserve(excluded)?.apiKey).toBe('first');
    },
  );

  it.each([401, 403, 429])(
    'uses a 60-second minimum for quota/auth failures: %s',
    (status) => {
      const pool = new GeminiKeyPool(['first']);

      pool.coolDown({ slot: 0, status });
      now += 59_999;
      expect(pool.reserve(excluded)).toBeUndefined();
      now += 1;
      expect(pool.reserve(excluded)?.slot).toBe(0);
    },
  );

  it.each([
    ['120', 120_000],
    ['Thu, 29 Oct 2026 00:02:00 GMT', 120_000],
    ['30', 60_000],
    ['0', 60_000],
    ['Wed, 28 Oct 2026 00:00:00 GMT', 60_000],
    ['invalid', 60_000],
    ['-2', 60_000],
    ['1.5', 60_000],
    ['Infinity', 60_000],
    ['999999999999999999999999999', 60_000],
  ])(
    'honors only valid finite Retry-After values: %s',
    (retryAfter, duration) => {
      const pool = new GeminiKeyPool(['first']);

      pool.coolDown({ slot: 0, status: 429, retryAfter });
      now += duration - 1;
      expect(pool.hasAvailable(excluded)).toBe(false);
      now += 1;
      expect(pool.hasAvailable(excluded)).toBe(true);
    },
  );

  it('never shortens an existing cooldown when concurrent attempts fail', () => {
    const pool = new GeminiKeyPool(['first', 'second']);

    pool.coolDown({ slot: 0, status: 429, retryAfter: '120' });
    now += 1_000;
    pool.coolDown({ slot: 0, status: 503 });
    pool.coolDown({ slot: 1, status: 503 });
    expect(pool.reserve(excluded)).toBeUndefined();
    now += 30_000;
    expect(pool.reserve(excluded)?.slot).toBe(1);
    now += 88_999;
    expect(pool.reserve(new Set([1]))).toBeUndefined();
    now += 1;
    expect(pool.reserve(new Set([1]))?.slot).toBe(0);
  });
});
