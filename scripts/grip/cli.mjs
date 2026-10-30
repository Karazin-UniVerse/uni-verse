import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loginDevice } from './device-login.mjs';
import { runGripHook } from './launcher.mjs';
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
 * Searches for a usable grip executable.
 * @param {string} [candidatePath]
 * @returns {string} Absolute path to executable
 */
function resolveExecutable(candidatePath) {
  if (candidatePath) {
    const resolved = path.resolve(candidatePath);

    if (!fs.existsSync(resolved)) {
      throw new Error(`Specified Grip executable does not exist: ${resolved}`);
    }

    verifyExecutable(resolved);

    return resolved;
  }

  // 1. Check system path via where.exe (Windows) or which (POSIX)
  const lookupCmd = process.platform === 'win32' ? 'where.exe' : 'which';
  const lookupResult = spawnSync(lookupCmd, ['grip'], { encoding: 'utf8' });

  if (lookupResult.status === 0 && lookupResult.stdout) {
    const lines = lookupResult.stdout
      .trim()
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    for (const line of lines) {
      let exeCandidate = line;

      if (
        process.platform === 'win32' &&
        (exeCandidate.endsWith('.cmd') || exeCandidate.endsWith('.bat'))
      ) {
        const directExe = exeCandidate.replace(/\.(cmd|bat)$/i, '.exe');

        if (fs.existsSync(directExe)) {
          exeCandidate = directExe;
        }
      }

      try {
        verifyExecutable(exeCandidate);

        return exeCandidate;
      } catch {
        // Continue searching
      }
    }
  }

  // 2. On Windows, check python user scripts directory
  if (process.platform === 'win32') {
    const pyScript = spawnSync(
      'python',
      [
        '-c',
        "import site, os, sys; print(os.path.join(site.USER_BASE, f'Python{sys.version_info.major}{sys.version_info.minor}', 'Scripts'))",
      ],
      { encoding: 'utf8' },
    );

    if (pyScript.status === 0 && pyScript.stdout) {
      const userScriptsDir = pyScript.stdout.trim();
      const gripExe = path.join(userScriptsDir, 'grip.exe');

      if (fs.existsSync(gripExe)) {
        try {
          verifyExecutable(gripExe);

          return gripExe;
        } catch {
          // Continue
        }
      }
    }
  }

  throw new Error(
    'Could not locate a working grip executable.\nPlease install grip (e.g. "pipx install grip-hook==0.5.0" or "pip install grip-hook==0.5.0") or supply --executable <path>.',
  );
}

/**
 * Verifies that the executable exists and returns 0 on --version.
 * @param {string} executablePath
 */
function verifyExecutable(executablePath) {
  const result = spawnSync(executablePath, ['--version'], { encoding: 'utf8' });

  if (result.status !== 0) {
    throw new Error(
      `Executable at ${executablePath} failed verification (exit code ${result.status}): ${result.stderr || result.error}`,
    );
  }

  if (!/\b0\.5\.0\b/.test(result.stdout ?? '')) {
    throw new Error(
      `Executable at ${executablePath} is not Grip 0.5.0 (got: ${(result.stdout ?? '').trim()}). Please install grip-hook 0.5.0 ("pip install grip-hook==0.5.0").`,
    );
  }
}

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

async function handleSetup(args) {
  const { options } = parseArgs(args);
  const gatewayRaw = options.gateway;
  const clientId = options['client-id'];
  const executablePath = options.executable;

  if (!gatewayRaw || !clientId) {
    console.error(
      'Usage: pnpm grip:setup --gateway <url> --client-id <id> [--executable <path> | --migrate]',
    );
    process.exit(1);
  }

  const gatewayOrigin = validateGatewayUrl(gatewayRaw);

  validateRepository();

  if (options.migrate) {
    if (executablePath) {
      throw new Error(
        '--migrate retains the existing executable; do not combine it with --executable.',
      );
    }

    const settings = await migrateSettings({ gatewayOrigin, clientId });

    console.info('✓ Migrated Grip enrollment for all local UniVerse checkouts and worktrees.');
    console.info(`Gateway: ${gatewayOrigin}`);
    console.info(`Expires: ${settings.expiresAt}`);

    return;
  }

  const executable = resolveExecutable(executablePath);

  console.info(`Using Grip executable: ${executable}`);
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
    clientId,
    token,
    expiresAt,
    executable,
  });

  console.info('\n✓ Grip gateway enrollment successful!');
  console.info(`Repository: ${GRIP_REPOSITORY} (all local checkouts and worktrees)`);
  console.info(`Gateway:    ${gatewayOrigin}`);
  console.info(`Executable: ${executable}`);
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
    console.info('Run "pnpm grip:setup --gateway <url> --client-id <id>" to re-enroll.');

    return;
  }

  if (!settings) {
    console.info('Grip gateway is NOT enrolled for this OS user.');
    console.info(
      'Enrollment is mandatory to push code. Run "pnpm grip:setup --gateway <url> --client-id <id>" to enroll.',
    );
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
  console.info(`Executable:     ${settings.executable}`);
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
    console.error('[grip] To enroll, run: pnpm grip:setup --gateway <url> --client-id <id>\n');
    process.exit(1);
  }

  try {
    const exitCode = await runGripHook({
      settings,
      args: ['hook', hookType, ...hookArgs],
    });

    process.exit(exitCode);
  } catch (error) {
    console.error(`[grip] Error executing pre-push check: ${error.message}`);
    process.exit(1);
  }
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
