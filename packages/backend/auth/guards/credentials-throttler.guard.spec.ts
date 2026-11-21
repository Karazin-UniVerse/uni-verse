import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { CredentialsThrottlerGuard } from './credentials-throttler.guard';

type GuardInternals = {
  getTracker: (request: Request) => Promise<string>;
  generateKey: (
    context: ExecutionContext,
    tracker: string,
    throttlerName: string,
  ) => string;
};

const guard = Object.create(
  CredentialsThrottlerGuard.prototype,
) as GuardInternals;

function trackerFor(path: string, body: unknown): Promise<string> {
  return guard.getTracker({ path, body } as Request);
}

describe('CredentialsThrottlerGuard', () => {
  it('keys login attempts by normalized email', async () => {
    await expect(
      trackerFor('/auth/login', { email: '  Student@Karazin.UA ' }),
    ).resolves.toBe('student@karazin.ua');
  });

  it('keys Moodle link attempts by username and ignores an injected email', async () => {
    await expect(
      trackerFor('/auth/moodle/link', {
        username: 'Victim',
        email: 'random-per-request@example.com',
      }),
    ).resolves.toBe('victim');
  });

  it.each(['/auth/moodle/link/', '/Auth/Moodle/LINK'])(
    'treats route variant %j as Moodle link and ignores an injected email',
    async (path) => {
      await expect(
        trackerFor(path, { username: 'victim', email: 'random@example.com' }),
      ).resolves.toBe('victim');
    },
  );

  it('keeps logins made only of non-ASCII characters in separate buckets', async () => {
    const first = await trackerFor('/auth/login', { email: 'Іван' });
    const second = await trackerFor('/auth/login', { email: 'петро' });

    expect(first).toBe('іван');
    expect(second).toBe('петро');
  });

  it('keys login attempts by email and ignores an injected username', async () => {
    await expect(
      trackerFor('/auth/login', { email: 'victim', username: 'random' }),
    ).resolves.toBe('victim');
  });

  it.each(['victim!', 'vic#tim', ' VICTIM\u0000\u0000', 'victim!!', 'vic tim'])(
    'folds %j into the bucket Moodle authenticates as "victim"',
    async (spelling) => {
      await expect(
        trackerFor('/auth/login', { email: spelling }),
      ).resolves.toBe('victim');
    },
  );

  it('strips appended non-ASCII characters by default, as Moodle does', async () => {
    await expect(
      trackerFor('/auth/login', { email: 'victimжж' }),
    ).resolves.toBe('victim');
  });

  describe('with MOODLE_EXTENDED_USERNAME_CHARS=true', () => {
    const originalFlag = process.env.MOODLE_EXTENDED_USERNAME_CHARS;

    beforeEach(() => {
      process.env.MOODLE_EXTENDED_USERNAME_CHARS = 'true';
    });

    afterEach(() => {
      if (originalFlag === undefined) {
        delete process.env.MOODLE_EXTENDED_USERNAME_CHARS;
      } else {
        process.env.MOODLE_EXTENDED_USERNAME_CHARS = originalFlag;
      }
    });

    it('keeps mixed Cyrillic and ASCII logins in separate buckets', async () => {
      const first = await trackerFor('/auth/login', {
        email: ' Іван.Петренко ',
      });
      const second = await trackerFor('/auth/login', {
        email: 'олена.коваль',
      });

      expect(first).toBe('іван.петренко');
      expect(second).toBe('олена.коваль');
    });

    it('still folds case, outer whitespace and NUL variants of one login', async () => {
      await expect(
        trackerFor('/auth/login', { email: ' ІВАН\u0000.петренко ' }),
      ).resolves.toBe('іван.петренко');
    });

    it('keeps internal spaces so distinct Moodle logins stay in separate buckets', async () => {
      const spaced = await trackerFor('/auth/login', {
        email: ' ivan .petrenko ',
      });
      const compact = await trackerFor('/auth/login', {
        email: 'ivan.petrenko',
      });

      expect(spaced).toBe('ivan .petrenko');
      expect(compact).toBe('ivan.petrenko');
      expect(spaced).not.toBe(compact);
    });
  });

  it('ignores spoofable client IP headers', async () => {
    const tracker = await guard.getTracker({
      path: '/auth/login',
      body: { email: 'victim@karazin.ua' },
      headers: { 'x-forwarded-for': '1.2.3.4' },
      ip: '5.6.7.8',
    } as unknown as Request);

    expect(tracker).toBe('victim@karazin.ua');
  });

  it('caps the tracker length', async () => {
    const tracker = await trackerFor('/auth/login', {
      email: 'ж'.repeat(10_000),
    });

    expect(tracker).toHaveLength(256);
  });

  it('puts requests without a usable login into one shared bucket', async () => {
    await expect(trackerFor('/auth/login', { email: 42 })).resolves.toBe(
      'anonymous',
    );
    await expect(
      trackerFor('/auth/login', { email: ' \u0000 ' }),
    ).resolves.toBe('anonymous');
    await expect(trackerFor('/auth/login', undefined)).resolves.toBe(
      'anonymous',
    );
  });

  it('shares one bucket per login across all credential routes', () => {
    const loginContext = { getHandler: () => 'login' };
    const linkContext = { getHandler: () => 'linkMoodle' };

    expect(
      guard.generateKey(
        loginContext as unknown as ExecutionContext,
        'victim',
        'default',
      ),
    ).toBe(
      guard.generateKey(
        linkContext as unknown as ExecutionContext,
        'victim',
        'default',
      ),
    );
  });
});
