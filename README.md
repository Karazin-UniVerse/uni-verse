# UniVerse

> **Modern Digital Academic Ecosystem for V. N. Karazin Kharkiv National University**

[![CI](https://github.com/Karazin-UniVerse/uni-verse/actions/workflows/ci.yml/badge.svg)](https://github.com/Karazin-UniVerse/uni-verse/actions/workflows/ci.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=Karazin-UniVerse_uni-verse&metric=alert_status)](https://sonarcloud.io/dashboard?id=Karazin-UniVerse_uni-verse)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=Karazin-UniVerse_uni-verse&metric=coverage)](https://sonarcloud.io/dashboard?id=Karazin-UniVerse_uni-verse)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=Karazin-UniVerse_uni-verse&metric=code_smells)](https://sonarcloud.io/dashboard?id=Karazin-UniVerse_uni-verse)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

UniVerse is a full-stack, monorepo-based platform that unifies academic services, Moodle LMS data, student electronic gradebooks, timetable scheduling, and institutional Google Workspace SSO into a fast, modern digital hub (UniHub).

---

## Architecture & Monorepo Structure

The project is structured as a Turborepo + pnpm workspace:

```text
uni-verse/
├── packages/
│   ├── backend/         # NestJS API Gateway & Moodle integration engine
│   ├── uni-hub/         # Next.js 16 (Turbopack) frontend & E-Dean's Office UI
│   ├── ui/              # Una UI design system (React components & SCSS tokens)
│   ├── database/        # Prisma ORM client & database access layer
│   ├── types/           # Shared TypeScript domain contracts & DTOs
│   └── core/            # Shared cross-package utilities & validation
├── configs/             # Shared linting, Oxlint, Stylelint & formatting configs
└── .env.example         # Template for environment configuration
```

---

## Prerequisites

Ensure the following tools are installed on your system:

- **Node.js**: `v22.x` or `v24.x` (LTS)
- **pnpm**: `v10.x` (`corepack enable && corepack prepare pnpm@10.0.0 --activate` or `npm i -g pnpm`)
- **PostgreSQL**: `v16.x` or newer (running locally or via cloud/Docker)
- **Git**: `v2.40+`

---

## Quickstart: Step-by-Step Setup & Running

### ⚡ Interactive Setup Wizard (Develop & Staging)

The fastest way to configure your local development environment is using the interactive CLI wizard (available on `develop` and `staging` branches):

```bash
pnpm dev:select
# or
pnpm dev:setup
```

The wizard guides you through your configuration:

1. **Install Dependencies**: automatically runs `pnpm install`.
2. **Backend Selection**:
   - **Remote Develop API** (`https://p01--backend-stage--djrwwgsr7dmx.code.run`) — **Recommended for Frontend Developers**. Develop UI with live cloud backend and test Moodle data without needing local PostgreSQL or NestJS running!
   - **Remote Staging API** (`https://p01--backend-stage--4y9d57mwx2gx.code.run`) — Connects to staging cloud deployment.
   - **Local Backend** (`http://localhost:3001`) — For fullstack developers working on NestJS and API endpoints.
3. **Database Selection** (if Local Backend): configure local PostgreSQL or custom connection string, and automatically runs Prisma client generation.
4. **Instant Launch**: automatically starts your development servers.

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

All standard configuration variables and local development defaults (ports, local database connection, Moodle LMS endpoints, development JWT secrets) are pre-configured in `.env.example`.

> **Note:** For private or institutional credentials (such as Google OAuth Client ID & Secret, or staging/production JWT secrets), please ask the **Project Coordinator**.

If developing packages independently:

- **Frontend (`packages/uni-hub`)**: Optionally create `packages/uni-hub/.env.local`:

  ```bash
  NEXT_PUBLIC_API_URL="http://localhost:3001"
  ```

  > **Tip for Frontend Developers:** Set `NEXT_PUBLIC_API_URL="https://p01--backend-stage--djrwwgsr7dmx.code.run"` in `packages/uni-hub/.env.local` to develop the UI without needing local PostgreSQL or NestJS running!

- **Backend (`packages/backend`)**: Copy `packages/backend/.env.example` to `packages/backend/.env` before running backend or database commands:
  ```bash
  # Linux/macOS: cp packages/backend/.env.example packages/backend/.env
  # Windows:     Copy-Item packages/backend/.env.example packages/backend/.env
  ```

#### 3. Initialize Database & Generate Prisma Client (Fullstack only)

If developing the backend locally, make sure PostgreSQL is running, then generate the client and push database schema:

```bash
# Generate Prisma Client
pnpm db:generate

# Push schema changes to your database
pnpm db:migrate
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

> ⚠️ **Important on Authentication:** UniVerse user authentication delegates directly to Moodle LMS (`https://moodle.universemvp.tech`). Password validation is performed against Moodle, NOT arbitrary local database rows. To log in during development, you must use valid credentials from the test Moodle instance (ask the Project Coordinator for test credentials).

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
   - Personal accounts (`@gmail.com`) or foreign university domains are automatically rejected with **HTTP 403 Forbidden**.
   - Allowed domains are configurable via `GOOGLE_ALLOWED_DOMAINS="karazin.ua,student.karazin.ua"`.

2. **Dual-Factor Domain Verification**:
   - Cross-checks both the signed `hd` (Hosted Domain) claim and the normalized email suffix to prevent domain spoofing.

3. **Moodle Account Linking**:
   - First-time Google SSO users are prompted to link their existing Moodle account credentials to unify LMS course enrollment and grades into their UniHub profile.

---

## Scripts & Quality Checks

Run linters, style checks, type checks, and automated tests across all monorepo packages:

```bash
# Static analysis with Oxlint (0 warnings policy)
pnpm lint

# Automatically fix linting and formatting issues
pnpm lint:fix
pnpm format

# Strict TypeScript type check across all packages
pnpm typecheck

# Run backend unit tests with code coverage
pnpm --filter @universe/backend test:cov

# Run configured package tests across the monorepo
pnpm test

# Production build across all packages
pnpm build
```

---

## Tech Stack

| Layer               | Technologies                                                                                                                 |
| :------------------ | :--------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**        | [Next.js 16](https://nextjs.org/) (Turbopack, App Router), [React 19](https://react.dev/), Sass / CSS Modules                |
| **Backend**         | [NestJS](https://nestjs.com/), Node.js 24, `@nestjs/jwt`, Passport                                                           |
| **Database & ORM**  | [PostgreSQL 16](https://www.postgresql.org/), [Prisma ORM 5](https://www.prisma.io/)                                         |
| **Design System**   | `@universe/ui` (Una UI, custom SCSS design tokens, responsive mixins)                                                        |
| **LMS Integration** | [Moodle REST Web Services](https://docs.moodle.org/dev/Web_services)                                                         |
| **Tooling & CI/CD** | [Turborepo](https://turbo.build/), [pnpm](https://pnpm.io/), [Oxlint](https://oxc.rs/), [SonarCloud](https://sonarcloud.io/) |
