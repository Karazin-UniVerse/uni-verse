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
    ['Thursday, 29-Oct-26 00:02:00 GMT', 120_000],
    ['Thu Oct 29 00:02:00 2026', 120_000],
    ['30', 60_000],
    ['0', 60_000],
    ['Wed, 28 Oct 2026 00:00:00 GMT', 60_000],
    ['invalid', 60_000],
    ['-2', 60_000],
    ['1.5', 60_000],
    ['Infinity', 60_000],
    ['2026-10-29T00:02:00Z', 60_000],
    ['Thu Oct 29 00:02:00 2026 EST', 60_000],
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

  it('accepts the space-padded asctime day as UTC', () => {
    now = Date.UTC(2026, 10, 6);
    const pool = new GeminiKeyPool(['first']);

    pool.coolDown({
      slot: 0,
      status: 429,
      retryAfter: 'Fri Nov  6 00:02:00 2026',
    });
    now += 119_999;
    expect(pool.hasAvailable(excluded)).toBe(false);
    now += 1;
    expect(pool.hasAvailable(excluded)).toBe(true);
  });

  it.each([
    'Tue, 31 Feb 2027 00:02:00 GMT',
    'Tuesday, 31-Feb-27 00:02:00 GMT',
    'Tue Feb 31 00:02:00 2027',
    'Mon, 29 Feb 2027 00:02:00 GMT',
    'Wed, 31 Apr 2027 00:02:00 GMT',
  ])(
    'uses minimum cooldown for impossible calendar dates: %s',
    (retryAfter) => {
      const pool = new GeminiKeyPool(['first']);

      pool.coolDown({ slot: 0, status: 429, retryAfter });
      now += 59_999;
      expect(pool.hasAvailable(excluded)).toBe(false);
      now += 1;
      expect(pool.hasAvailable(excluded)).toBe(true);
    },
  );

  it.each([
    'Tue, 29 Feb 2028 00:02:00 GMT',
    'Tuesday, 29-Feb-28 00:02:00 GMT',
    'Tue Feb 29 00:02:00 2028',
  ])('preserves valid leap days: %s', (retryAfter) => {
    now = Date.UTC(2028, 1, 29);
    const pool = new GeminiKeyPool(['first']);

    pool.coolDown({ slot: 0, status: 429, retryAfter });
    now += 119_999;
    expect(pool.hasAvailable(excluded)).toBe(false);
    now += 1;
    expect(pool.hasAvailable(excluded)).toBe(true);
  });

  it.each([
    ['Thursday, 29-Oct-76 00:00:00 GMT', Date.UTC(2076, 9, 29)],
    ['Thursday, 29-Oct-76 00:00:01 GMT', Date.UTC(2026, 9, 29, 0, 1)],
    ['Thursday, 29-Oct-75 00:00:00 GMT', Date.UTC(2075, 9, 29)],
    ['Thursday, 29-Oct-77 00:00:00 GMT', Date.UTC(2026, 9, 29, 0, 1)],
  ])(
    'interprets RFC850 years using the 50-year future boundary: %s',
    (retryAfter, availableAt) => {
      const pool = new GeminiKeyPool(['first']);

      pool.coolDown({ slot: 0, status: 429, retryAfter });
      now = availableAt - 1;
      expect(pool.hasAvailable(excluded)).toBe(false);
      now += 1;
      expect(pool.hasAvailable(excluded)).toBe(true);
    },
  );

  it('interprets RFC850 years across a century boundary', () => {
    now = Date.UTC(2090, 0, 1);
    const pool = new GeminiKeyPool(['first']);

    pool.coolDown({
      slot: 0,
      status: 429,
      retryAfter: 'Thursday, 01-Jan-05 00:00:00 GMT',
    });
    now = Date.UTC(2105, 0, 1) - 1;
    expect(pool.hasAvailable(excluded)).toBe(false);
    now += 1;
    expect(pool.hasAvailable(excluded)).toBe(true);
  });

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
