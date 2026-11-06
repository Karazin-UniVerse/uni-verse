import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loginDevice } from './device-login.mjs';
import { runHostedPush } from './hosted-hook.mjs';
import { collectPushManifest } from './push-manifest.mjs';
import {
  loadSettings,
  removeSettings,
  saveSettings,
  validateGatewayUrl,
  validateTokenFormat,
  validateRepository,
  migrateSettings,
  GRIP_REPOSITORY,
} from './settings.mjs';

/**
 * Parses command line arguments into a dictionary of options and positional args.
 * @param {string[]} argv
 */
function parseArgs(argv) {
  const options = {};
  const positional = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg.startsWith('--')) {
      const name = arg.slice(2);
      const nextArg = argv[i + 1];

      if (nextArg && !nextArg.startsWith('--')) {
        options[name] = nextArg;
        i++;
      } else {
        options[name] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return { options, positional };
}

export const DEFAULT_GATEWAY_URL = 'https://api.universemvp.tech';
export const DEFAULT_CLIENT_ID = 'Ov23liayY7Qv5aVPEomK';
export const DEFAULT_FRONTEND_ORIGIN =
  'https://universe-frontend-1038900190823.europe-west3.run.app';

async function handleSetup(args) {
  const { options } = parseArgs(args);
  const gatewayRaw = options.gateway || process.env.GRIP_GATEWAY_URL || DEFAULT_GATEWAY_URL;
  const clientId =
    options['client-id'] || process.env.GRIP_GITHUB_OAUTH_CLIENT_ID || DEFAULT_CLIENT_ID;

  if (options.executable)
    throw new Error('Hosted Grip does not use --executable. Run setup without it.');

  if (!clientId) {
    console.error('Usage: pnpm grip:setup [--client-id <id>] [--gateway <url>] [--migrate]');
    process.exit(1);
  }

  const gatewayOrigin = validateGatewayUrl(gatewayRaw);
  const frontendOrigin = validateGatewayUrl(options['frontend-origin'] || DEFAULT_FRONTEND_ORIGIN);

  validateRepository();

  if (options.migrate) {
    const settings = await migrateSettings({
      gatewayOrigin,
      clientId,
      ...(options['frontend-origin'] ? { frontendOrigin } : {}),
    });

    console.info('✓ Migrated Grip enrollment for all local UniVerse checkouts and worktrees.');
    console.info(`Gateway: ${gatewayOrigin}`);
    console.info(`Expires: ${settings.expiresAt}`);

    return;
  }

  console.info(`Connecting to gateway: ${gatewayOrigin}`);

  const githubToken = await loginDevice({
    clientId,
    logger: console.info,
  });

  console.info('Exchanging GitHub credentials for Grip gateway token...');

  const sessionRes = await fetch(`${gatewayOrigin}/dev-tools/grip/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/json',
    },
  });

  if (sessionRes.status === 403) {
    throw new Error(
      'Access denied: You must have write or admin permissions in Karazin-UniVerse/uni-verse to enroll.',
    );
  }

  if (!sessionRes.ok) {
    const errorBody = await sessionRes.text().catch(() => '');

    throw new Error(`Gateway session exchange failed (HTTP ${sessionRes.status}): ${errorBody}`);
  }

  const sessionData = await sessionRes.json();
  const { token, expiresAt } = sessionData;

  if (!validateTokenFormat(token)) {
    throw new Error('Gateway returned an invalid token format.');
  }

  await saveSettings({
    version: 2,
    repository: GRIP_REPOSITORY,
    gatewayOrigin,
    frontendOrigin,
    clientId,
    token,
    expiresAt,
  });

  console.info('\n✓ Grip gateway enrollment successful!');
  console.info(`Repository: ${GRIP_REPOSITORY} (all local checkouts and worktrees)`);
  console.info(`Gateway:    ${gatewayOrigin}`);
  console.info(`Frontend:   ${frontendOrigin}`);
  console.info('Whiteboard: Hosted browser (GitHub login)');
  console.info(`Expires:    ${expiresAt}`);
}

async function handleRemove(args) {
  const { options } = parseArgs(args);
  const force = Boolean(options.force);
  let settings;

  try {
    settings = await loadSettings();
  } catch (error) {
    if (force) {
      await removeSettings();
      console.info('✓ Removed corrupt/expired local Grip settings (--force).');

      return;
    }

    console.error(`[grip] Cannot read settings: ${error.message}`);
    console.error('Run "pnpm grip:remove -- --force" to delete the invalid local settings.');
    process.exit(1);
  }

  if (!settings) {
    console.info('No shared Grip enrollment found for this OS user.');

    return;
  }

  console.info('Revoking session on gateway...');

  let revoked = false;

  try {
    const revokeRes = await fetch(`${settings.gatewayOrigin}/dev-tools/grip/sessions/current`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${settings.token}`,
      },
    });

    if (revokeRes.ok || revokeRes.status === 401 || revokeRes.status === 404) {
      revoked = true;
    } else {
      console.error(`Remote revocation failed with status HTTP ${revokeRes.status}`);
    }
  } catch (error) {
    console.error(`Network error during remote revocation: ${error.message}`);
  }

  if (revoked || force) {
    await removeSettings();
    console.info('✓ Grip enrollment removed for all local UniVerse checkouts and worktrees.');
  } else {
    console.error(
      'Remote session could not be revoked. Local settings were kept to prevent orphaned credentials.\nUse "pnpm grip:remove -- --force" to remove local settings anyway.',
    );
    process.exit(1);
  }
}

async function handleStatus() {
  let settings;

  try {
    settings = await loadSettings();
  } catch (error) {
    console.error(`[grip] Status check failed: ${error.message}`);
    console.info('Run "pnpm grip:setup" to re-enroll.');

    return;
  }

  if (!settings) {
    console.info('Grip gateway is NOT enrolled for this OS user.');
    console.info('Enrollment is mandatory to push code. Run "pnpm grip:setup" to enroll.');
    console.info(
      'For a previous checkout enrollment, run setup with --migrate from that checkout.',
    );

    return;
  }

  const remainingMs = new Date(settings.expiresAt).getTime() - Date.now();
  const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));

  console.info('Grip Gateway Status: Enrolled');
  console.info(`Repository:     ${settings.repository} (all local checkouts and worktrees)`);
  console.info(`Gateway Origin: ${settings.gatewayOrigin}`);
  console.info(`Client ID:      ${settings.clientId}`);
  console.info('Whiteboard:     Hosted browser (GitHub login)');
  console.info(`Expires At:     ${settings.expiresAt} (${remainingDays} days remaining)`);
}

async function handleHook(args) {
  const hookType = args[0];
  const hookArgs = args.slice(1);

  if (hookType !== 'pre-push') {
    console.error(`Unsupported hook type: ${hookType}`);
    process.exit(1);
  }

  const isCi = ['true', '1'].includes((process.env.CI ?? '').toLowerCase());

  if (isCi) {
    console.info('[grip] CI environment detected. Skipping Grip pre-push check.');
    process.exit(0);
  }

  let settings;

  try {
    settings = await loadSettings({ remoteUrl: hookArgs[1] });
  } catch (error) {
    console.error(`[grip] Error: ${error.message}`);
    process.exit(1);
  }

  if (!settings) {
    console.error(
      '[grip] Error: Grip pre-push check is mandatory for this repository, but you are not enrolled.',
    );
    console.error('[grip] To enroll, run: pnpm grip:setup\n');
    process.exit(1);
  }

  try {
    const controller = new AbortController();
    const abort = () => controller.abort();

    process.once('SIGINT', abort);
    process.once('SIGTERM', abort);

    try {
      let stdin = '';

      for await (const chunk of process.stdin) {
        stdin += chunk.toString();

        if (Buffer.byteLength(stdin) > 256 * 1024)
          throw new Error('Push records exceed the input limit.');
      }

      process.exitCode = await runPrePush({
        settings,
        remoteUrl: hookArgs[1],
        stdin,
        signal: controller.signal,
      });
    } finally {
      process.removeListener('SIGINT', abort);
      process.removeListener('SIGTERM', abort);
    }
  } catch (error) {
    console.error(`[grip] Error executing pre-push check: ${error.message}`);
    process.exit(1);
  }
}

export async function runPrePush({
  settings,
  remoteUrl,
  stdin,
  signal,
  collect = collectPushManifest,
  run = runHostedPush,
  logger = console.info,
}) {
  const collected = await collect({ repoRoot: process.cwd(), remoteUrl, stdin, signal });

  if (collected.kind === 'noContent') {
    logger('[grip] No reviewable content in the pushed objects.');

    return 0;
  }

  const frontendOrigin = settings.frontendOrigin ?? DEFAULT_FRONTEND_ORIGIN;

  return run({ settings: { ...settings, frontendOrigin }, collected, signal, logger });
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const commandArgs = args.slice(1);

  if (!command) {
    console.info('Usage: node scripts/grip/cli.mjs <setup|remove|status|hook> [options]');
    process.exit(1);
  }

  try {
    switch (command) {
      case 'setup':
        await handleSetup(commandArgs);
        break;
      case 'remove':
        await handleRemove(commandArgs);
        break;
      case 'status':
        await handleStatus();
        break;
      case 'hook':
        await handleHook(commandArgs);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  main();
}
