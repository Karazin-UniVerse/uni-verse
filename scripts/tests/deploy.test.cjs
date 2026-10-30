const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

const workflowPath = path.resolve(__dirname, '../../.github/workflows/deploy.yml');
const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash';
const backend = 'universe-backend';
const frontend = 'universe-frontend';
const sha = 'a'.repeat(40);

function readStep(name) {
  const lines = fs.readFileSync(workflowPath, 'utf8').split(/\r?\n/);
  const start = lines.indexOf(`      - name: ${name}`);

  assert.notEqual(start, -1, `Missing workflow step: ${name}`);
  const run = lines.indexOf('        run: |', start);

  assert.notEqual(run, -1, `Missing run block: ${name}`);
  const script = [];

  for (const line of lines.slice(run + 1)) {
    if (line && !line.startsWith('          ')) break;

    script.push(line.slice(10));
  }

  return script.join('\n');
}

function runStep(name, overrides = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'universe-deploy-'));
  const statePath = path.join(directory, 'state.json');
  const initialTraffic = {
    [backend]: { 'backend-old-a': 65, 'backend-old-b': 35 },
    [frontend]: { 'frontend-old-a': 20, 'frontend-old-b': 80 },
  };

  fs.writeFileSync(statePath, JSON.stringify({ traffic: initialTraffic, calls: [], created: {} }));

  try {
    const result = spawnSync(
      bash,
      [
        '-e',
        '-o',
        'pipefail',
        '-c',
        `gcloud() { node "$DEPLOY_TEST_CLI" gcloud "$@"; }
curl() { node "$DEPLOY_TEST_CLI" curl "$@"; }
git() { printf '%s\\trefs/heads/develop\\n' "$DEPLOY_TEST_LATEST_SHA"; }
${readStep(name)}`,
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          GCP_PROJECT_ID: 'test-project',
          GCP_REGION: 'europe-west3',
          GCP_ARTIFACT_REPOSITORY: 'universe',
          GCP_BACKEND_SERVICE: backend,
          GCP_FRONTEND_SERVICE: frontend,
          GCP_WORKLOAD_IDENTITY_PROVIDER:
            'projects/123/locations/global/workloadIdentityPools/test/providers/test',
          GCP_DEPLOY_SERVICE_ACCOUNT: 'deploy@test-project.iam.gserviceaccount.com',
          NEXT_PUBLIC_API_URL: 'https://backend.example',
          FRONTEND_URL: 'https://frontend.example',
          GOOGLE_CLIENT_ID: '',
          GITHUB_SHA: sha,
          GITHUB_RUN_ID: '123456789',
          GITHUB_RUN_ATTEMPT: '2',
          GITHUB_ENV: path.join(directory, 'github-env'),
          GITHUB_STEP_SUMMARY: path.join(directory, 'summary'),
          BACKEND_IMAGE: `europe-west3-docker.pkg.dev/test-project/universe/backend:${sha}`,
          FRONTEND_IMAGE: `europe-west3-docker.pkg.dev/test-project/universe/frontend:${sha}`,
          DEPLOY_TEST_CLI: path.join(__dirname, 'fixtures/deploy-cli.cjs'),
          DEPLOY_TEST_STATE: statePath,
          DEPLOY_TEST_LATEST_SHA: sha,
          ...overrides,
        },
      },
    );
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

    return { ...result, state, initialTraffic };
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test('rejects a slash-terminated frontend origin before writing build configuration', () => {
  const result = runStep('Validate deployment configuration', {
    FRONTEND_URL: 'https://frontend.example/',
  });

  assert.equal(result.status, 1);
  assert.match(result.stdout, /FRONTEND_URL must not end with a slash/);
  assert.equal(result.state.calls.length, 0);
});

test('accepts a frontend origin without a trailing slash', () => {
  const result = runStep('Validate deployment configuration');

  assert.equal(result.status, 0, result.stderr);
});

test('routes only to the revisions created by this job even when another writer creates a later revision', () => {
  const result = runStep('Update services and check availability', {
    DEPLOY_TEST_EXTERNAL_WRITER: 'true',
  });

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.state.traffic, {
    [backend]: { [`${backend}-ci-123456789-2`]: 100 },
    [frontend]: { [`${frontend}-ci-123456789-2`]: 100 },
  });
  const updates = result.state.calls.filter((call) => call[0] === 'gcloud' && call[3] === 'update');

  assert.equal(updates.length, 2);
  assert.ok(updates.every((call) => call.includes('--no-traffic')));
});

for (const failure of ['backend-probe', 'frontend-update', 'frontend-probe', 'frontend-switch']) {
  test(`restores both original traffic splits after ${failure}`, () => {
    const result = runStep('Update services and check availability', {
      DEPLOY_TEST_FAILURE: failure,
    });

    assert.notEqual(result.status, 0);
    assert.deepEqual(result.state.traffic, result.initialTraffic);
    const switches = result.state.calls.filter((call) => call.includes('update-traffic'));

    assert.ok(switches.length > 0);
  });
}

test('does not mutate either service when traffic snapshot fails', () => {
  const result = runStep('Update services and check availability', {
    DEPLOY_TEST_FAILURE: 'snapshot',
  });

  assert.notEqual(result.status, 0);
  assert.deepEqual(result.state.traffic, result.initialTraffic);
  assert.equal(result.state.calls.filter((call) => call.includes('update')).length, 0);
});

test('attempts backend recovery even when frontend recovery fails and keeps the deployment failed', () => {
  const result = runStep('Update services and check availability', {
    DEPLOY_TEST_FAILURE: 'frontend-probe',
    DEPLOY_TEST_RECOVERY_FAILURE: frontend,
  });

  assert.notEqual(result.status, 0);
  assert.deepEqual(result.state.traffic[backend], result.initialTraffic[backend]);
  assert.match(result.stdout + result.stderr, /Failed to restore traffic.*universe-frontend/);
});

test('skips obsolete commits without calling any cloud command', () => {
  const result = runStep('Update services and check availability', {
    DEPLOY_TEST_LATEST_SHA: 'b'.repeat(40),
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.state.calls.length, 0);
});
