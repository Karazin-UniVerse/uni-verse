# UniVerse

> **Modern Digital Academic Ecosystem for V. N. Karazin Kharkiv National University**

[![CI](https://github.com/Karazin-UniVerse/uni-verse/actions/workflows/ci.yml/badge.svg)](https://github.com/Karazin-UniVerse/uni-verse/actions/workflows/ci.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=Karazin-UniVerse_uni-verse&metric=alert_status)](https://sonarcloud.io/dashboard?id=Karazin-UniVerse_uni-verse)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=Karazin-UniVerse_uni-verse&metric=coverage)](https://sonarcloud.io/dashboard?id=Karazin-UniVerse_uni-verse)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=Karazin-UniVerse_uni-verse&metric=code_smells)](https://sonarcloud.io/dashboard?id=Karazin-UniVerse_uni-verse)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

UniVerse is a full-stack, monorepo-based platform that unifies academic services, Moodle LMS data, student electronic gradebooks, the student opportunities catalog, timetable scheduling, and institutional Google Workspace SSO into a fast, modern digital hub (UniHub).

---

## Architecture & Monorepo Structure

The project is structured as a Turborepo + pnpm workspace:

```text
uni-verse/
├── packages/
│   ├── core/            # @universe/core — shared domain contracts (types/), constants, grade logic & utilities
│   ├── ui/              # @universe/ui — Una UI design system (@una), composite components, SCSS tokens & Storybook
│   ├── uni-hub/         # @universe/uni-hub — Next.js 16 (App Router, Turbopack) student portal
│   ├── backend/         # @universe/backend — NestJS API Gateway, Moodle integration & Grip gateway
│   └── database/        # @universe/database — Prisma ORM 7 client & PostgreSQL data layer
├── tests/
│   └── e2e/             # Standalone requirement-driven Vitest E2E suite
├── scripts/             # Interactive dev wizard, Grip CLI, Lighthouse CI, Graphify & AI context/skills sync
├── configs/             # Shared Oxlint, ESLint, Stylelint & TypeScript presets
├── docs/                # Onboarding, AI rules, deployment, Grip, Graphify, Knip & Context7 guides
└── .env.example         # Template for environment configuration
```

---

## Prerequisites

Ensure the following tools are installed on your system:

- **Node.js**: `v22.x` or `v24.x` (LTS)
- **pnpm**: `v10.x` (`corepack enable && corepack prepare pnpm@10.0.0 --activate` or `npm i -g pnpm`)
- **PostgreSQL**: `v16.x` or newer (running locally or via cloud/Docker; only required for local backend development)
- **Git**: `v2.40+`
- **Python 3.11+ & Grip 0.5.0**: required for pushing commits through the mandatory pre-push quiz ([Grip setup guide](docs/grip.md))

---

## Quickstart: Step-by-Step Setup & Running

### ⚡ Interactive Setup Wizard (Develop & Staging)

The fastest way to configure your local development environment without manually copying `.env` files is using the interactive CLI wizard:

```bash
pnpm dev:select
```

The wizard prompts you step-by-step, automatically configures environment files, and starts the development server:

1. **Workspace Dependencies**:
   - Prompts `Run 'pnpm install' before starting? (Y/n)` — press `Enter` to verify and install dependencies across the workspace.
2. **Backend API Target**:
   - `[1] Develop Cloud API` (`https://api.universemvp.tech`) — **Recommended for Frontend Developers**. Writes `packages/uni-hub/.env.local` with `NEXT_PUBLIC_API_URL` so you can develop UI features with live Moodle LMS data without running NestJS or PostgreSQL locally.
   - `[2] Direct Cloud Run API` (`https://universe-backend-1038900190823.europe-west3.run.app`) — Direct Google Cloud Run endpoint (bypassing Cloudflare proxy).
   - `[3] Local Backend` (`http://localhost:3001`) — For backend and fullstack developers running NestJS locally.
3. **Database Selection** (only if Local Backend `[3]` is selected):
   - `[1] Local PostgreSQL` (`localhost:5432`)
   - `[2] Remote Cloud PostgreSQL` (Supabase; prompts for connection string if not in environment)
   - `[3] Custom PostgreSQL Connection String`
   - Automatically writes `.env` and `packages/backend/.env`, generates Prisma Client (`pnpm db:generate`), and optionally syncs schema (`pnpm db:migrate`).
4. **Google OAuth Configuration** (optional):
   - Automatically detects existing `NEXT_PUBLIC_GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_ID` across `.env` files or prompts to enter one.
5. **SSL / HTTPS Protocol** (only for remote backend):
   - Prompts to enable self-signed HTTPS via Next.js (`--experimental-https`) or pass `--https` directly (`pnpm dev:https`). Local backend always uses standard HTTP (`http://localhost:3000`).
6. **Grip Pre-Push Check**:
   - Checks if Grip is enrolled on this machine and offers to run `pnpm grip:setup` if needed.
7. **Moodle Authentication Notice**:
   - Displays a reminder that Moodle login delegates to `https://moodle.universemvp.tech`.
8. **Instant Launch**:
   - Prompts `Launch development server now? (Y/n)`:
     - **Frontend**: starts `pnpm --filter @universe/uni-hub dev` (or `dev:https` for [https://localhost:3000](https://localhost:3000)).
     - **Fullstack**: starts the full Turborepo monorepo (`pnpm dev`).

---

### Manual Setup (Step-by-Step)

#### 1. Clone Repository & Install Dependencies

```bash
git clone https://github.com/Karazin-UniVerse/uni-verse.git
cd uni-verse
pnpm install
```

#### 2. Environment Configuration

Copy the sample environment file to `.env`:

```bash
# On Linux/macOS
cp .env.example .env

# On Windows (PowerShell)
Copy-Item .env.example .env
```

Standard configuration variables and local development defaults (ports, local database connection, Moodle LMS endpoints, development JWT secrets) are pre-configured in `.env.example`.

> **Note:** For private or institutional credentials (such as Google OAuth Client ID & Secret, or staging/production JWT secrets), ask the **Project Coordinator**.

If developing packages independently:

- **Frontend (`packages/uni-hub`)**: Optionally create `packages/uni-hub/.env.local`:

  ```bash
  NEXT_PUBLIC_API_URL="http://localhost:3001"
  ```

  > **Tip for Frontend Developers:** Set `NEXT_PUBLIC_API_URL="https://api.universemvp.tech"` in `packages/uni-hub/.env.local` to develop the UI without running local PostgreSQL or NestJS.

- **Backend (`packages/backend`)**: Copy `packages/backend/.env.example` to `packages/backend/.env` before running backend or database commands:

  ```bash
  # Linux/macOS: cp packages/backend/.env.example packages/backend/.env
  # Windows:     Copy-Item packages/backend/.env.example packages/backend/.env
  ```

#### 3. Initialize Database & Generate Prisma Client (Fullstack only)

Make sure PostgreSQL is running, then generate the client and push the schema (includes required backfill scripts):

```bash
# Generate Prisma Client
pnpm db:generate

# Run backfill scripts and push schema changes
pnpm db:migrate

# Force push when data-loss changes are intentional (local dev only)
pnpm db:migrate:force
```

_(Optional)_ Launch Prisma Studio Web GUI to inspect local database records:

```bash
pnpm db:studio
# Opens at http://localhost:5555
```

#### 4. Run the Development Servers

Run the entire monorepo concurrently via Turborepo:

```bash
pnpm dev
```

Or run packages independently:

```bash
# Start UniHub Next.js frontend only (http://localhost:3000)
pnpm --filter @universe/uni-hub dev

# Start NestJS backend only (http://localhost:3001)
pnpm --filter @universe/backend start:dev

# Start Una UI Storybook component catalog (http://localhost:6006)
pnpm --filter @universe/ui storybook
```

> ⚠️ **Important on Authentication:** UniVerse Moodle login delegates directly to Moodle LMS (`https://moodle.universemvp.tech`). Password validation is performed against Moodle, not arbitrary local database rows. To log in during development, use valid credentials from the test Moodle instance (ask the Project Coordinator for test credentials).

#### 5. Access the Applications

- **UniHub Web Portal**: [http://localhost:3000](http://localhost:3000)
- **Backend API Gateway**: [http://localhost:3001](http://localhost:3001)
- **Una UI Storybook**: [http://localhost:6006](http://localhost:6006) _(available on develop and staging at `/storybook/`)_
- **Prisma Studio (Database GUI)**: [http://localhost:5555](http://localhost:5555)

---

## Google SSO & Corporate Domain Restriction

UniVerse enforces strict institutional security policies:

1. **Corporate Domain Whitelisting**:
   - Only Google accounts from approved university domains (`@student.karazin.ua` for students, `@karazin.ua` for staff) are permitted.
   - Personal accounts (`@gmail.com`) or external domains are rejected with **HTTP 403 Forbidden**.
   - Allowed domains are configurable via `GOOGLE_ALLOWED_DOMAINS="karazin.ua,student.karazin.ua"`.
2. **Dual-Factor Domain Verification**:
   - Cross-checks both the signed `hd` (Hosted Domain) claim and the normalized email suffix to prevent domain spoofing.
3. **Moodle Account Linking**:
   - First-time Google SSO users can link their existing Moodle account credentials to unify LMS course enrollments and grades into their UniHub profile.

---

## Development Workflow & Processes

- **Branching & PRs**: All working PRs target `develop` (never `main`), use Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`), include the ticket code in the PR title (e.g. `RS-258: ...`), link the corresponding Notion task in the description, and attach visual evidence (screenshots/video) for visible UI changes. Large features ship as stacked PRs managed with `gh stack`. See [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/ai/workflow.md](docs/ai/workflow.md).
- **Pre-Commit Hooks**: Husky + `lint-staged` automatically run Oxlint, Stylelint, and Prettier on staged files, and keep `GEMINI.md` and `.claude/skills/` in sync.
- **Mandatory Grip Pre-Push Quiz**: `.husky/pre-push` runs [Grip](docs/grip.md) in interactive quiz mode backed by the team Gemini gateway before pushing upstream. Enroll once per OS user (`pnpm grip:setup`); the profile is shared across local clones and worktrees and supports SSH host aliases.
- **CI/CD & Quality Gates**: GitHub Actions runs CI checks (`ci.yml`), CodeQL security scanning (`codeql.yml`), SonarCloud analysis, Code Freeze enforcement (`code-freeze.yml`), automatic Notion/Discord PR notifications, and Cloud Run deployments ([deployment guide](docs/deployment.md)). Quality thresholds are documented in [CONSTRAINTS.md](CONSTRAINTS.md).
- **AI Agent Tooling**:
  - Canonical engineering rules live in [AGENTS.md](AGENTS.md) and `docs/ai/` (synced to `GEMINI.md` via `pnpm gemini:sync`).
  - Shared agent skills live in `.agents/skills/` (synced to `.claude/skills/` via `pnpm skills:sync`).
  - Library docs via [Context7 MCP](docs/context7.md); zero-token local codebase graphs via [Graphify](docs/graphify.md).

---

## Scripts & Quality Checks

### Linting, Formatting & Type Checking

```bash
# Static analysis with Oxlint (0 warnings policy)
pnpm lint

# Style linting with Stylelint (CSS & SCSS)
pnpm lint:style
pnpm lint:style:fix

# Auto-fix Oxlint, Stylelint, and Prettier across the repo
pnpm lint:fix   # alias: pnpm fix

# Prettier formatting and verification
pnpm format
pnpm format:check

# Strict TypeScript type check across all packages
pnpm typecheck

# Advisory unused-code and dependency audit (docs/knip.md)
pnpm knip
```

### Testing, Performance & Build

```bash
# Run unit tests across all packages (Vitest, Jest, node:test)
pnpm test

# Run standalone requirement-driven E2E suite
pnpm test:e2e

# Run backend unit tests with code coverage
pnpm --filter @universe/backend test:cov

# Run Lighthouse CI Core Web Vitals checks
pnpm lhci

# Production build across all packages
pnpm build
```

### Grip, Graphify & Agent Context Scripts

```bash
# Grip pre-push enrollment & status (docs/grip.md)
pnpm grip:setup
pnpm grip:status
pnpm grip:remove

# Local codebase knowledge graph (docs/graphify.md)
pnpm graphify:extract
pnpm graphify:query

# Sync / verify AI skills and GEMINI.md context
pnpm skills:sync
pnpm skills:check
pnpm gemini:sync
pnpm gemini:check

# Script unit tests
pnpm test:grip
pnpm test:lhci
pnpm test:graphify
pnpm test:skills
pnpm test:deploy
```

---

## Documentation Index

| Document                                   | Topic                                                            |
| :----------------------------------------- | :--------------------------------------------------------------- |
| [docs/ONBOARDING.md](docs/ONBOARDING.md)   | New contributor onboarding checklist                             |
| [CONTRIBUTING.md](CONTRIBUTING.md)         | Branching, merge criteria, Code Freeze & release cycle           |
| [CONSTRAINTS.md](CONSTRAINTS.md)           | Enforced repository quality bars and test thresholds             |
| [docs/ai/workflow.md](docs/ai/workflow.md) | Git workflow, stacked PRs, PR metadata & pre-commit checklist    |
| [docs/deployment.md](docs/deployment.md)   | Google Cloud Run deployment & GitHub Actions setup               |
| [docs/grip.md](docs/grip.md)               | Mandatory Grip interactive pre-push quiz setup & troubleshooting |
| [docs/graphify.md](docs/graphify.md)       | Local codebase structural knowledge graphs                       |
| [docs/knip.md](docs/knip.md)               | Unused-code and dependency auditing                              |
| [docs/context7.md](docs/context7.md)       | Context7 MCP setup for up-to-date library documentation          |

---

## Tech Stack

| Layer               | Technologies                                                                                                                                                                            |
| :------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**        | [Next.js 16](https://nextjs.org/) (Turbopack, App Router), [React 19](https://react.dev/), [TypeScript 6](https://www.typescriptlang.org/), TanStack Query, Zustand, SCSS               |
| **Backend**         | [NestJS](https://nestjs.com/), Node.js 24, `@nestjs/jwt`, Passport                                                                                                                      |
| **Database & ORM**  | [PostgreSQL 16](https://www.postgresql.org/), [Prisma ORM 7](https://www.prisma.io/)                                                                                                    |
| **Design System**   | `@universe/ui` (Una UI, [Storybook 10](https://storybook.js.org/), custom SCSS design tokens, responsive mixins)                                                                        |
| **LMS Integration** | [Moodle REST Web Services](https://docs.moodle.org/dev/Web_services)                                                                                                                    |
| **Testing**         | [Vitest](https://vitest.dev/), [Jest](https://jestjs.io/), React Testing Library, [Playwright](https://playwright.dev/), `node:test`                                                    |
| **Tooling & CI/CD** | [Turborepo](https://turbo.build/), [pnpm 10](https://pnpm.io/), [Oxlint](https://oxc.rs/), Stylelint, Prettier, Lighthouse CI, Knip, Grip, CodeQL, [SonarCloud](https://sonarcloud.io/) |
