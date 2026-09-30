#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

// ANSI color helpers
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

const ROOT_DIR = process.cwd();
const ROOT_ENV_PATH = resolve(ROOT_DIR, '.env');
const ROOT_ENV_EXAMPLE = resolve(ROOT_DIR, '.env.example');
const UNI_HUB_ENV_PATH = resolve(ROOT_DIR, 'packages', 'uni-hub', '.env.local');
const BACKEND_ENV_PATH = resolve(ROOT_DIR, 'packages', 'backend', '.env');

const REMOTE_BACKENDS = {
  dev: {
    name: 'Develop Cloud API (djrwwgsr7dmx.code.run)',
    url: 'https://p01--backend-stage--djrwwgsr7dmx.code.run',
    tag: 'Recommended for Frontend Devs',
  },
  stage: {
    name: 'Staging Cloud API (4y9d57mwx2gx.code.run)',
    url: 'https://p01--backend-stage--4y9d57mwx2gx.code.run',
    tag: 'Testing & Staging features',
  },
  local: {
    name: 'Local Backend (http://localhost:3001)',
    url: 'http://localhost:3001',
    tag: 'Fullstack development with NestJS',
  },
};

const DATABASE_OPTIONS = {
  local: {
    name: 'Local PostgreSQL (localhost:5432)',
    url: 'postgresql://postgres:postgres@localhost:5432/universe?schema=public',
  },
  stage: {
    name: 'Remote Stage PostgreSQL (stage-db on Northflank)',
    url: 'postgresql://_384ba963925defa3:_c9be7ea2af9ed6af166bd6f63816d9@primary.stage-db--4y9d57mwx2gx.addon.code.run:5432/_7a1e7a197e94?sslmode=require&schema=public',
  },
};

async function runCommand(command, args) {
  return new Promise((resolvePromise, reject) => {
    const isWindows = process.platform === 'win32';
    const cmd = isWindows && command === 'pnpm' ? 'pnpm.cmd' : command;

    console.log(`\n${c.dim}> ${cmd} ${args.join(' ')}${c.reset}\n`);

    const proc = spawn(cmd, args, {
      stdio: 'inherit',
      shell: true,
      cwd: ROOT_DIR,
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    proc.on('error', (err) => reject(err));
  });
}

function updateEnvFile(filePath, updates) {
  let content = '';
  if (existsSync(filePath)) {
    content = readFileSync(filePath, 'utf-8');
  } else if (existsSync(ROOT_ENV_EXAMPLE)) {
    content = readFileSync(ROOT_ENV_EXAMPLE, 'utf-8');
  }

  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    const line = `${key}="${value}"`;
    if (regex.test(content)) {
      content = content.replace(regex, line);
    } else {
      content += `\n${line}`;
    }
  }

  writeFileSync(filePath, content.trim() + '\n', 'utf-8');
}

async function main() {
  const rl = createInterface({ input, output });

  try {
    console.log(
      `\n${c.bold}${c.cyan}====================================================${c.reset}`,
    );
    console.log(`${c.bold}${c.cyan}       UniVerse Interactive Dev Environment Wizard  ${c.reset}`);
    console.log(
      `${c.bold}${c.cyan}====================================================${c.reset}\n`,
    );

    // 1. Dependency installation
    const installAnswer = await rl.question(
      `${c.bold}1. Run 'pnpm install' before starting?${c.reset} (Y/n): `,
    );
    const shouldInstall = installAnswer.trim().toLowerCase() !== 'n';

    if (shouldInstall) {
      console.log(`${c.cyan}Installing workspace dependencies...${c.reset}`);
      await runCommand('pnpm', ['install']);
    }

    // 2. Select Backend target
    console.log(`\n${c.bold}2. Select Backend API Target:${c.reset}`);
    console.log(
      `  ${c.green}[1] Remote Develop API${c.reset} (${c.dim}https://p01--backend-stage--djrwwgsr7dmx.code.run${c.reset}) ${c.magenta}★ [Best for Frontend]${c.reset}\n` +
        `      ${c.dim}No local backend or database required.${c.reset}`,
    );
    console.log(
      `  ${c.cyan}[2] Remote Staging API${c.reset} (${c.dim}https://p01--backend-stage--4y9d57mwx2gx.code.run${c.reset})\n` +
        `      ${c.dim}Connect to staging environment.${c.reset}`,
    );
    console.log(
      `  ${c.yellow}[3] Local Backend${c.reset} (${c.dim}http://localhost:3001${c.reset})\n` +
        `      ${c.dim}Runs NestJS API locally (requires database).${c.reset}`,
    );

    let backendChoice = await rl.question(`\nSelect backend [1-3] (default: 1): `);
    backendChoice = backendChoice.trim() || '1';

    let selectedBackend;
    let isLocalBackend = false;

    if (backendChoice === '2') {
      selectedBackend = REMOTE_BACKENDS.stage;
    } else if (backendChoice === '3') {
      selectedBackend = REMOTE_BACKENDS.local;
      isLocalBackend = true;
    } else {
      selectedBackend = REMOTE_BACKENDS.dev;
    }

    console.log(`${c.green}✔ Selected backend: ${c.bold}${selectedBackend.name}${c.reset}`);

    // 3. Database selection (only if Local Backend is chosen)
    let selectedDbUrl = DATABASE_OPTIONS.local.url;

    if (isLocalBackend) {
      console.log(`\n${c.bold}3. Select Database Connection for Local Backend:${c.reset}`);
      console.log(
        `  ${c.yellow}[1] Local PostgreSQL${c.reset} (${c.dim}localhost:5432${c.reset})\n` +
          `      ${c.dim}Requires local PostgreSQL server or Docker container running.${c.reset}`,
      );
      console.log(
        `  ${c.cyan}[2] Remote Stage Database${c.reset} (${c.dim}stage-db on Northflank${c.reset})\n` +
          `      ${c.dim}Connects local backend directly to the cloud stage database.${c.reset}`,
      );
      console.log(`  ${c.magenta}[3] Custom PostgreSQL Connection String${c.reset}`);

      let dbChoice = await rl.question(`\nSelect database [1-3] (default: 1): `);
      dbChoice = dbChoice.trim() || '1';

      if (dbChoice === '2') {
        selectedDbUrl = DATABASE_OPTIONS.stage.url;
      } else if (dbChoice === '3') {
        const customUrl = await rl.question(`Enter DATABASE_URL: `);
        selectedDbUrl = customUrl.trim() || DATABASE_OPTIONS.local.url;
      } else {
        selectedDbUrl = DATABASE_OPTIONS.local.url;
      }

      console.log(
        `${c.green}✔ Selected database: ${c.bold}${selectedDbUrl.includes('@') ? selectedDbUrl.split('@')[1] : selectedDbUrl}${c.reset}`,
      );
    }

    // 4. Configure environment files
    console.log(`\n${c.cyan}Configuring environment variables...${c.reset}`);

    // Update frontend .env.local
    updateEnvFile(UNI_HUB_ENV_PATH, {
      PORT: '3000',
      NEXT_PUBLIC_API_URL: selectedBackend.url,
    });
    console.log(
      `${c.green}✔ Updated ${c.bold}packages/uni-hub/.env.local${c.reset} (NEXT_PUBLIC_API_URL=${selectedBackend.url})`,
    );

    // If local backend, update root and backend .env
    if (isLocalBackend) {
      updateEnvFile(ROOT_ENV_PATH, {
        PORT: '3001',
        DATABASE_URL: selectedDbUrl,
        FRONTEND_URL: 'http://localhost:3000',
        MOODLE_BASEURL: 'https://moodle.universemvp.tech',
      });
      updateEnvFile(BACKEND_ENV_PATH, {
        PORT: '3001',
        DATABASE_URL: selectedDbUrl,
        FRONTEND_URL: 'http://localhost:3000',
        MOODLE_BASEURL: 'https://moodle.universemvp.tech',
      });
      console.log(
        `${c.green}✔ Updated ${c.bold}.env${c.reset} and ${c.bold}packages/backend/.env${c.reset}`,
      );

      // Run prisma generate
      console.log(`\n${c.cyan}Generating Prisma client...${c.reset}`);
      await runCommand('pnpm', ['db:generate']);

      const runMigrate = await rl.question(
        `\n${c.bold}Push schema to database ('pnpm db:migrate')?${c.reset} (Y/n): `,
      );
      if (runMigrate.trim().toLowerCase() !== 'n') {
        try {
          await runCommand('pnpm', ['db:migrate']);
          console.log(`${c.green}✔ Database schema synced successfully.${c.reset}`);
        } catch (dbErr) {
          console.log(
            `${c.yellow}⚠ Notice: Could not sync database. Ensure PostgreSQL is running.${c.reset}`,
          );
        }
      }
    }

    // 5. Auth notice & Launch prompt
    console.log(
      `\n${c.bold}${c.yellow}================== [ Moodle Auth Notice ] ==================${c.reset}`,
    );
    console.log(`${c.yellow}• UniVerse authentication delegates to Moodle LMS.${c.reset}`);
    console.log(`${c.yellow}• For logging in, use real student/instructor credentials${c.reset}`);
    console.log(`${c.yellow}  registered on: ${c.bold}https://moodle.universemvp.tech${c.reset}`);
    console.log(
      `${c.yellow}• Local table passwords in PostgreSQL are NOT checked by the API.${c.reset}`,
    );
    console.log(
      `${c.bold}${c.yellow}============================================================${c.reset}\n`,
    );

    const launchAnswer = await rl.question(
      `${c.bold}Ready! Launch development server now?${c.reset} (Y/n): `,
    );

    if (launchAnswer.trim().toLowerCase() !== 'n') {
      rl.close();
      if (isLocalBackend) {
        console.log(`\n${c.green}Starting fullstack workspace (Turborepo)...${c.reset}`);
        await runCommand('pnpm', ['dev']);
      } else {
        console.log(
          `\n${c.green}Starting UniHub frontend (pointing to ${selectedBackend.url})...${c.reset}`,
        );
        await runCommand('pnpm', ['--filter', '@universe/uni-hub', 'dev']);
      }
      return;
    }

    console.log(`\n${c.green}Configuration saved!${c.reset}`);
    if (isLocalBackend) {
      console.log(`To start manually, run: ${c.bold}pnpm dev${c.reset}`);
    } else {
      console.log(`To start frontend, run: ${c.bold}pnpm --filter @universe/uni-hub dev${c.reset}`);
    }
  } catch (error) {
    console.error(
      `\n${c.red}Error: ${error instanceof Error ? error.message : String(error)}${c.reset}`,
    );
  } finally {
    rl.close();
  }
}

main();
