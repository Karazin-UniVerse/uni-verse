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

### 1. Clone Repository & Install Dependencies

```bash
git clone https://github.com/Karazin-UniVerse/uni-verse.git
cd uni-verse
pnpm install
```

### 2. Environment Configuration

Copy the sample environment file to `.env`:

```bash
# On Linux/macOS
cp .env.example .env

# On Windows (PowerShell)
Copy-Item .env.example .env
```

Ensure the key environment variables in `.env` are configured:

```ini
# Backend API Port & Node Environment
PORT=3001
NODE_ENV=development

# Database Connection (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/universe?schema=public"

# JWT Authentication Secrets (Must be random strings in production)
AT_SECRET="your-access-token-secret-key-at-least-32-chars"
RT_SECRET="your-refresh-token-secret-key-at-least-32-chars"

# Moodle LMS Integration
MOODLE_BASEURL="https://moodle.universemvp.tech"
MOODLE_TIMEOUT=15000

# CORS / Frontend origin
FRONTEND_URL="http://localhost:3000"

# Google OAuth 2.0 & Corporate Domain Restriction
GOOGLE_CLIENT_ID="your-google-oauth-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
NEXT_PUBLIC_GOOGLE_CLIENT_ID="your-google-oauth-client-id.apps.googleusercontent.com"
GOOGLE_ALLOWED_DOMAINS="karazin.ua,student.karazin.ua"
```

For the frontend package (`packages/uni-hub`), ensure `packages/uni-hub/.env.local` contains:

```ini
PORT=3000
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

### 3. Initialize Database & Generate Prisma Client

Make sure PostgreSQL is running, then generate the client and push database schema:

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

### 4. Run the Development Servers

Run the entire monorepo concurrently via Turborepo:

```bash
pnpm dev
```

Or run packages independently:

```bash
# Start NestJS backend only (http://localhost:3001)
pnpm --filter @universe/backend start:dev

# Start UniHub Next.js frontend only (http://localhost:3000)
pnpm --filter @universe/uni-hub dev
```

### 5. Access the Applications

- **UniHub Web Portal**: [http://localhost:3000](http://localhost:3000)
- **Backend API Gateway**: [http://localhost:3001](http://localhost:3001)
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

# Run backend unit tests with code coverage (100% threshold on new code)
pnpm --filter @universe/backend test:cov

# Run all tests across the monorepo
pnpm test

# Production build across all packages
pnpm build
```

---

## Tech Stack

| Layer               | Technologies                                                                                                                 |
| :------------------ | :--------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**        | [Next.js 16](https://nextjs.org/) (Turbopack, App Router), [React 19](https://react.dev/), Sass / CSS Modules                |
| **Backend**         | [NestJS](https://nestjs.com/), Node.js 24, `@nestjs/jwt`, `google-auth-library`                                              |
| **Database & ORM**  | [PostgreSQL 16](https://www.postgresql.org/), [Prisma ORM 7](https://www.prisma.io/)                                         |
| **Design System**   | `@universe/ui` (Una UI, custom SCSS design tokens, responsive mixins)                                                        |
| **LMS Integration** | [Moodle REST Web Services](https://docs.moodle.org/dev/Web_services)                                                         |
| **Tooling & CI/CD** | [Turborepo](https://turbo.build/), [pnpm](https://pnpm.io/), [Oxlint](https://oxc.rs/), [SonarCloud](https://sonarcloud.io/) |
