const fs = require('node:fs');

const [command, ...args] = process.argv.slice(2);
const file = process.env.DEPLOY_TEST_STATE;
const state = JSON.parse(fs.readFileSync(file, 'utf8'));
const failure = process.env.DEPLOY_TEST_FAILURE;
const frontend = process.env.GCP_FRONTEND_SERVICE;
const value = (flag) => args.find((arg) => arg.startsWith(`${flag}=`))?.slice(flag.length + 1);

state.calls.push([command, ...args]);

function finish(code = 0, output = '') {
  fs.writeFileSync(file, JSON.stringify(state));
  process.stdout.write(output);
  process.exit(code);
}

if (command === 'curl') {
  const service = args.at(-1).startsWith(process.env.NEXT_PUBLIC_API_URL) ? 'backend' : 'frontend';

  finish(failure === `${service}-probe` ? 22 : 0);
}

if (args.slice(0, 4).join(' ') === 'artifacts docker images describe') {
  finish(0, `sha256:${'c'.repeat(64)}\n`);
}

if (args[0] === 'run' && args[1] === 'services') {
  const action = args[2];
  const service = args[3];

  if (action === 'describe') {
    if (failure === 'snapshot') finish(1);

    finish(
      0,
      JSON.stringify({
        status: {
          traffic: Object.entries(state.traffic[service]).map(([revisionName, percent]) => ({
            revisionName,
            percent,
          })),
        },
      }),
    );
  }

  if (action === 'update') {
    if (failure === 'frontend-update' && service === frontend) finish(1);

    state.created[service] = `${service}-${value('--revision-suffix') || 'untracked'}`;
    state.latest =
      process.env.DEPLOY_TEST_EXTERNAL_WRITER === 'true'
        ? `${service}-external-writer`
        : state.created[service];

    if (!args.includes('--no-traffic')) {
      state.traffic[service] = { [state.created[service]]: 100 };
    }

    finish();
  }

  if (action === 'update-traffic') {
    const targets = value('--to-revisions');
    const isRecovery = targets?.includes('-old-');

    if (isRecovery && process.env.DEPLOY_TEST_RECOVERY_FAILURE === service) finish(1);

    state.traffic[service] = args.includes('--to-latest')
      ? { [state.latest]: 100 }
      : Object.fromEntries(
          targets.split(',').map((target) => {
            const [revision, percent] = target.split('=');

            return [revision, Number(percent)];
          }),
        );

    if (!isRecovery && failure === 'frontend-switch' && service === frontend) finish(1);

    finish();
  }
}

finish(1, `Unexpected external command: ${command} ${args.join(' ')}\n`);
