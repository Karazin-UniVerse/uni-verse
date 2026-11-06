import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { test } from 'node:test';

const requireUi = createRequire(new URL('../../packages/ui/package.json', import.meta.url));
const { chromium } = requireUi('playwright');
const origin = process.env.GRIP_BROWSER_TEST_ORIGIN ?? 'http://127.0.0.1:3017';

test('hosted page handles fixture grading, escapes diff and stays within mobile width', async () => {
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    const errors = [];

    page.on('pageerror', (error) => errors.push(error.message));
    let submitted = 0;
    let state = 'READY';
    const checkId = 'a'.repeat(43);
    const status = {
      checkId,
      bindingDigest: 'f'.repeat(64),
      policyVersion: 'hosted-v1',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      passValidUntil: new Date(Date.now() + 86_400_000).toISOString(),
    };
    const board = {
      revision: 'e'.repeat(64),
      summary: 'Fixture change map',
      nodes: [
        {
          id: 'hook',
          label: 'Git hook',
          role: 'Collect exact objects',
          kind: 'component',
          trust: 'trusted',
          files: ['cli.mjs'],
        },
        {
          id: 'server',
          label: 'Gateway',
          role: 'Fence persisted results',
          kind: 'component',
          trust: 'trusted',
          files: ['service.ts'],
        },
      ],
      edges: [{ source: 'hook', target: 'server', label: 'Bound push' }],
      questions: Array.from({ length: 5 }, (_, index) => ({
        id: `q${index + 1}`,
        on: 'server',
        kind: 'how it works',
        question: `Fixture question ${index + 1}`,
      })),
    };

    await page.route('**/dev-tools/grip/api/**', async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      let body;

      if (pathname.endsWith('/auth/session'))
        body = {
          githubId: '123',
          login: 'fixture-developer',
          csrfToken: 'c'.repeat(43),
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        };
      else if (pathname.endsWith('/submissions')) {
        const input = route.request().postDataJSON();

        assert.equal(input.answers.length, 5);
        assert.equal(route.request().headers()['x-grip-csrf'], 'c'.repeat(43));
        submitted += 1;
        state = 'PASSED';
        body = { ...status, state, score: 70 };
      } else
        body = {
          ...status,
          state,
          ...(state === 'PASSED' ? { score: 70 } : {}),
          manifest: {
            repository: 'Karazin-UniVerse/uni-verse',
            updates: [],
            policyVersion: 'hosted-v1',
            diffDigest: 'd'.repeat(64),
          },
          diff: '<script>window.fixtureInjected = true</script>',
          truncated: false,
          board,
        };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    });
    await page.goto(`${origin}/dev-tools/grip/boards/${checkId}`);
    await page.getByText('Fixture change map').waitFor();
    assert.equal(await page.getByRole('textbox').count(), 5);
    assert.equal(await page.locator('main script').count(), 0);
    const submit = page.getByRole('button', { name: 'Перевірити відповіді' });

    assert.equal(await submit.isDisabled(), true);

    for (let index = 1; index <= 5; index += 1)
      await page
        .getByRole('textbox', { name: `Відповідь ${index}`, exact: true })
        .fill('Synthetic fixture explanation, not a real defense.');

    assert.equal(await submit.isEnabled(), true);
    mkdirSync('screenshots/grip-hosted', { recursive: true });
    await page.screenshot({ path: 'screenshots/grip-hosted/desktop.png', fullPage: true });
    await submit.click();
    await page.getByText('Результат: 70 / 100. Прохідний бал — 70.').waitFor();
    assert.equal(submitted, 1);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
    );
    await page.screenshot({ path: 'screenshots/grip-hosted/mobile.png', fullPage: true });
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
