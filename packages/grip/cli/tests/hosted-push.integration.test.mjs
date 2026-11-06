import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { runPrePush } from '../cli.mjs';
import { collectPushManifest } from '../push-manifest.mjs';
import { runHostedPush } from '../hosted-hook.mjs';
import { createGripBindingDigest } from '../../../core/utils/grip-hosted.ts';

test('real pushed objects traverse hosted HTTP and wait for their persisted matching result', async (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'grip-hosted-flow-'));
  const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();

  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  git('init', '-b', 'main');
  git('config', 'user.name', 'Fixture');
  git('config', 'user.email', 'fixture@example.com');
  git('config', 'core.hooksPath', path.join(root, 'fixture-no-hooks'));
  git('remote', 'add', 'origin', 'https://github.com/Karazin-UniVerse/uni-verse.git');
  fs.copyFileSync(
    new URL('../../../../.grip.toml', import.meta.url),
    path.join(root, '.grip.toml'),
  );
  fs.writeFileSync(path.join(root, 'handler.ts'), 'export const accepted = false;\n');
  git('add', '.');
  git('commit', '-m', 'baseline');
  const base = git('rev-parse', 'HEAD');

  fs.writeFileSync(path.join(root, 'handler.ts'), 'export const accepted = true;\n');
  fs.writeFileSync(path.join(root, '.env.private'), 'NEVER_UPLOAD_THIS');
  git('add', '.');
  git('commit', '-m', 'pushed');
  const pushed = git('rev-parse', 'HEAD');
  let status;
  let generationCalls = 0;
  let readCalls = 0;
  const events = [];
  const server = createServer(async (request, response) => {
    assert.equal(request.headers.authorization, 'Bearer fixture-opaque');

    if (request.url.endsWith('/checks')) {
      let body = '';

      for await (const chunk of request) body += chunk;

      assert.doesNotMatch(body, /NEVER_UPLOAD_THIS/);
      const input = JSON.parse(body);

      assert.equal(input.manifest.updates[0].localOid, pushed);
      status = {
        checkId: 'a'.repeat(43),
        state: 'CREATED',
        bindingDigest: await createGripBindingDigest(input.manifest),
        policyVersion: 'hosted-v1',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        passValidUntil: new Date(Date.now() + 86_400_000).toISOString(),
      };
      response.setHeader('Content-Type', 'application/json');
      response.end(
        JSON.stringify({
          ...status,
          boardUrl: `https://portal.example/dev-tools/grip/boards/${status.checkId}`,
        }),
      );

      return;
    }

    if (request.url.endsWith('/generation')) {
      generationCalls += 1;
      events.push('generation');
      status.state = 'READY';
    } else {
      readCalls += 1;

      if (readCalls > 1) Object.assign(status, { state: 'PASSED', score: 70 });
    }

    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(status));
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  context.after(
    () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  );
  const result = await runPrePush({
    settings: {
      gatewayOrigin: `http://127.0.0.1:${server.address().port}`,
      token: 'fixture-opaque',
      frontendOrigin: 'https://portal.example',
    },
    remoteUrl: 'https://github.com/Karazin-UniVerse/uni-verse.git',
    stdin: `refs/heads/main ${pushed} refs/heads/main ${base}\n`,
    collect: (input) => collectPushManifest({ ...input, repoRoot: root }),
    run: (input) =>
      runHostedPush({ ...input, openBrowser: () => events.push('link'), wait: async () => {} }),
    logger: () => {},
  });

  assert.equal(result, 0);
  assert.equal(generationCalls, 1);
  assert.equal(readCalls, 2);
  assert.deepEqual(events, ['link', 'generation']);
});
