# Grip: Interactive Browser Push Checks with Team Gateway

[Grip](https://github.com/guilyx/grip) quizzes the **human developer** on their committed changes before allowing a local `git push` to complete. UniVerse uses Grip in **whiteboard mode** (`.grip.toml`) backed by an authenticated, quota-limited **team Gemini gateway** in NestJS (`/dev-tools/grip`).

Grip pre-push checks are **strictly optional** for contributors. If you do not enroll, your `git push` runs normally with a one-line notice. Once enrolled, passing the whiteboard releases the push immediately.

---

## Architecture & Privacy

- **Local interactive whiteboard**: Grip opens a browser tab on your computer where you review your diff and answer questions.
- **Team Gateway**: A restricted endpoint in `@universe/backend` proxies structured questions and answers to Google Gemini (`gemini-3.5-flash-lite`).
- **No shared API keys**: Collaborators never receive or handle Gemini API keys. Authentication is handled through a one-time GitHub OAuth Device Flow exchange.
- **Repository permission check**: Only GitHub users with **write** or **admin** permissions to `Karazin-UniVerse/uni-verse` qualify for gateway tokens.
- **Token storage**: Gateway tokens (`ugr_<43-chars>`) are stored locally in your OS app-data directory (`APPDATA` on Windows, `XDG_CONFIG_HOME` on POSIX) hashed by repository root. The gateway stores only SHA-256 digests.
- **Zero data persistence**: Prompts, rubrics, diffs, answers, and keys are never logged or stored in the database.
- **Quotas**:
  - Per user: 10 requests / minute, 100 requests / UTC day.
  - Global: 500 requests / UTC day, max 2 concurrent calls.
  - Session exchange: 5 / minute per source IP, 100 / minute globally.

---

## Prerequisites

1. **Python 3.11+** installed and available on `PATH`.
2. **Grip 0.5.0**:
   ```sh
   pip install --no-deps grip-hook==0.5.0
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
   Prints a brief notice and continues pushing immediately:
   ```
   [grip] Notice: Grip pre-push check is optional and not enrolled in this repository. Skipping.
   ```
2. **CI Environment (`CI=true`)**:
   Automatically skips interactive checks.
3. **Enrolled checkout**:
   - Launches Grip in whiteboard mode.
   - Your default browser opens the local whiteboard interface.
   - You answer the conceptual questions regarding your changes.
   - Upon scoring $\ge 70$, Grip passes, and the original `git push` **immediately completes**.
   - Passed checks are remembered for **24 hours** (`remember_passes_hours = 24.0`), so pushing additional commits or amending shortly after does not re-prompt unnecessarily.

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
