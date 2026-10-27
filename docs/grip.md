# Grip: Interactive Browser Push Checks with Team Gateway

[Grip](https://github.com/guilyx/grip) quizzes the **human developer** on their committed changes before allowing a local `git push` to complete. UniVerse uses Grip in **whiteboard mode** (`.grip.toml`) backed by an authenticated, quota-limited **team Gemini gateway** in NestJS (`/dev-tools/grip`).

Grip pre-push checks are **mandatory** for all contributors pushing to this repository. Pushes are blocked until you enroll via `pnpm grip:setup` and defend your changes on the whiteboard (scoring $\ge 70$).

---

## Architecture & Privacy

- **Local interactive whiteboard**: Grip opens a browser tab on your computer where you review your diff and answer questions.
- **Team Gateway**: A restricted endpoint in `@universe/backend` proxies structured questions and answers to Google Gemini (`gemini-3.5-flash-lite`).
- **No shared API keys**: Collaborators never receive or handle Gemini API keys. Authentication is handled through a one-time GitHub OAuth Device Flow exchange.
- **Repository permission check**: Only GitHub users with **write** or **admin** permissions to `Karazin-UniVerse/uni-verse` qualify for gateway tokens.
- **Token storage**: Gateway tokens (`ugr_<43-chars>`) are stored locally in your OS app-data directory (`APPDATA` on Windows, `XDG_CONFIG_HOME` on POSIX) hashed by repository root. The gateway stores only SHA-256 digests.
- **Gateway privacy**: The gateway does not persist prompts, rubrics, diffs, answers or upstream keys in its database. Local Grip keeps quiz reports, answers and cached boards under `.git/grip/`; do not publish those files or have a coding agent read them. Google receives the permitted diff and answers under your project's Gemini API terms. For Gemini API requests made under an unpaid service, Google uses submitted content and generated responses to improve its products, and human reviewers may read, annotate and process the API input and output. Do not submit sensitive, confidential or personal information through an unpaid service. In the European Economic Area, Switzerland and the United Kingdom, Google states that its paid-service data terms apply even to unpaid Gemini API quota.
- **Quotas**:
  - Per user: 10 requests / minute, 100 requests / UTC day.
  - Global: 500 requests / UTC day, max 2 concurrent calls.
  - Session exchange: 5 / minute per source IP, 100 / minute globally.

---

## Prerequisites

1. **Python 3.11+** installed and available on `PATH`.
2. **Grip 0.5.0**:
   ```sh
   pipx install grip-hook==0.5.0
   # Or using pip in your Python environment:
   pip install grip-hook==0.5.0
   ```
   Verify installation:
   ```sh
   grip --version
   # Expected: grip, version 0.5.0
   ```
   > [!NOTE]
   > On Windows with Python from the Microsoft Store or standard installer, `grip.exe` is located in your Python user Scripts folder (e.g. `%LOCALAPPDATA%\Packages\PythonSoftwareFoundation...\LocalCache\local-packages\Python313\Scripts\grip.exe`).

> [!WARNING]
> **Do NOT run `grip init`, `grip agents`, or `grip install --append`!**
> UniVerse uses Husky 9.1.7 (`.husky/pre-push`) to invoke Grip through `scripts/grip/cli.mjs`. Running native Grip installer commands modifies `core.hooksPath` or overwrites Husky hooks.

---

## Quick Setup (Local Enrollment)

Enroll this repository checkout in the Grip gateway:

```sh
pnpm grip:setup --gateway <gateway-url> --client-id <github-oauth-client-id>
```

For local backend development:

```sh
pnpm grip:setup --gateway http://localhost:3001 --client-id <your-dev-client-id>
```

### What happens during setup:

1. Validates that `grip.exe` (or `grip`) is installed and runnable.
2. Prompts you with a GitHub one-time code and link (GitHub Device Flow).
3. Authorizes your GitHub account without requesting any repository write permissions.
4. Exchanges the GitHub token with the gateway for a 30-day revocable token.
5. Saves local configuration in a private file keyed to this repository checkout.

Check your enrollment status at any time:

```sh
pnpm grip:status
```

---

## What Happens on `git push`

When you run `git push origin <branch>`:

1. **Unenrolled checkout**:
   Fails closed with exit code 1, requiring enrollment before pushing:
   ```
   [grip] Error: Grip pre-push check is mandatory for this repository, but you are not enrolled.
   [grip] To enroll, run: pnpm grip:setup --gateway <url> --client-id <id>
   ```
2. **CI Environment (`CI=true`)**:
   Automatically skips interactive checks.
3. **Enrolled checkout**:
   - Launches Grip in whiteboard mode.
   - Your default browser opens the local whiteboard interface.
   - You answer the conceptual questions regarding your changes.
   - Upon scoring $\ge 70$, Grip passes, and the original `git push` **immediately completes**.
   - A pass for the **same diff** is remembered for **24 hours** (`remember_passes_hours = 24.0`). Additional commits or amendments that change the diff require a new check.

---

## Disenrollment / Removal

To remove your local enrollment and revoke your gateway session:

```sh
pnpm grip:remove
```

If the gateway is unreachable and you want to remove local configuration anyway:

```sh
pnpm grip:remove -- --force
```

---

## Exclusions & Ignored Files

The visible diff is capped at **30,000 UTF-8 bytes** so instructions, questions,
rubrics and answers have room within the gateway's 200,000-byte message and
256 KiB HTTP limits, including Grip's JSON escaping of Ukrainian text. Grip
marks truncated diffs; the quiz covers only the visible portion. Unusually long
file lists, rubrics or answers can still exceed the limits; split large pushes
or shorten answers rather than bypassing the check.

`.grip.toml` configures automatic exclusions so private keys, dependencies, build artifacts, lockfiles, and generated documentation are not included in diffs sent to the gateway:

- Secrets: `.env`, `.env.*`, `*.pem`, `*.key`, `*.crt`
- Lockfiles: `pnpm-lock.yaml`, `package-lock.json`, etc.
- Build & Cache: `node_modules/*`, `.next/*`, `dist/*`, `coverage/*`, `.turbo/*`, `*.tsbuildinfo`
- Generated artifacts: `packages/database/client/*`, `packages/ui/storybook-static/*`, `.claude/skills/*`, `GEMINI.md`
- Local testing outputs: `screenshots/*`, `graphify-out/*`, `.lighthouseci/*`, `.playwright/*`

---

## Troubleshooting

- **`Grip executable not found`**: Ensure Python's Scripts directory is on your system `PATH`, or pass `--executable <path-to-grip.exe>` during `pnpm grip:setup`.
- **`Access denied (403)`**: Only GitHub users with write/admin permissions on `Karazin-UniVerse/uni-verse` are permitted.
- **`Enrollment has expired`**: Gateway sessions expire after 30 days. Run `pnpm grip:setup` to refresh.
- **`SSH / Headless environment`**: Grip whiteboard requires an interactive browser session. For headless or automated pushes, set `CI=true` or run `grip skip` if installed.

---

## Verification & Deployment Runbook

### Automated Verification

Run the complete automated validation suite locally:

```sh
pnpm lint            # Oxlint (0 warnings)
pnpm lint:style      # Stylelint
pnpm typecheck       # Turbo TypeScript typecheck
pnpm test            # Monorepo unit & integration tests
pnpm test:grip       # Local Grip settings, login, launcher, and hook tests
pnpm build           # Turbo production build
```

Dedicated concurrency verification against disposable PostgreSQL:

Keep local CLI tests in `scripts/grip/tests/` and backend unit, HTTP, and PostgreSQL integration specs in `packages/backend/grip/tests/`. Other backend modules retain their existing test layout. The default backend suite excludes the PostgreSQL integration spec; the dedicated command below selects it explicitly.

```sh
GRIP_TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/disposable_db" pnpm --filter @universe/backend test:grip:postgres
```

### Manual E2E Verification Completed

The live authentication and pre-push loop was verified end-to-end:

- Device Flow authentication against the local NestJS gateway.
- Repository permissions check via GitHub API (`admin` role verified).
- Bounded model completion forwarded to Gemini 3.5 Flash Lite via OpenAI-compatible endpoint.
- Interactive Grip whiteboard check launched on push.

### Production Deployment Prerequisites (Human Operations)

1. **GitHub OAuth Application**: Create an OAuth application under the organization with Device Flow enabled; note the Client ID.
2. **Permission Token**: Provision a fine-grained personal access token or GitHub App installation token with `Administration: Read` on `Karazin-UniVerse/uni-verse`.
3. **Gemini API Key**: Obtain a Google Gemini API key with access to `gemini-3.5-flash-lite`.
4. **Environment Variables**: Configure the backend environment:
   ```env
   GRIP_GATEWAY_ENABLED=true
   GEMINI_API_KEY=<gemini-api-key>
   GRIP_GITHUB_OAUTH_CLIENT_ID=<oauth-client-id>
   GRIP_GITHUB_PERMISSION_TOKEN=<github-permission-token>
   GRIP_TRUSTED_PROXY_ADDRESSES="127.0.0.1,::1" # adjust for load balancer / ingress
   ```
5. **Database Migration**: Run `pnpm db:migrate` to push `GripSession`, `GripQuotaBucket`, and `GripLease` tables to PostgreSQL.
6. **Rollout Policy**: The production gateway must be enabled (`GRIP_GATEWAY_ENABLED=true`) alongside deployment. Because the pre-push check is mandatory across the repository, all contributors must enroll via `pnpm grip:setup --gateway <production-url> --client-id <client-id>` before pushing new code.
