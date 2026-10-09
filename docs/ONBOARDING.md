# 🚀 UNiVerse - Onboarding Guide

Welcome to the **UNiVerse** project!
This guide will help you understand the project architecture, tech stack, and the logic behind the main modules, functions, and workflows.

Coding rules, architecture constraints and review standards live in [AGENTS.md](../AGENTS.md) and [docs/ai](ai). Branching and PR flow: [CONTRIBUTING.md](../CONTRIBUTING.md). Read them before your first PR.

---

## 🏗 High-Level Architecture

The project is structured as a **Monorepo** managed with **pnpm** and **Turborepo**.

- **Core** (`../packages/core`, `@universe/core`): Shared contracts, domain types, constants and grade math. Zero internal dependencies.
- **Frontend** (`../packages/uni-hub`, `@universe/uni-hub`): Next.js 16 (App Router), React 19, SCSS Modules, Zustand.
- **Backend** (`../packages/backend`, `@universe/backend`): NestJS gateway over Moodle, REST API, Swagger (`/api`).
- **Database** (`../packages/database`, `@universe/database`): Generated Prisma client only. The schema and generator live in `../packages/backend/prisma`, and the client is git-ignored.
- **UI** (`../packages/ui`, `@universe/ui`): Una design system (`@una`), complex UI-only components, SCSS tokens, Storybook.
- **E2E** (`../tests/e2e`): Standalone requirement-driven Vitest suite (`pnpm test:e2e`).

---

## 🧩 Shared Core (`../packages/core`)

- **`types`** (`@universe/core/types`): Shared domain models and DTO contracts used by both frontend and backend (student profile, assignment statuses, schedule events, etc.).
- **`constants`**: `routes.ts` (`AUTH_ROUTES`), `breakpoints.ts` (`BREAKPOINTS`, the single source of truth for responsive logic), `grades.ts` (thresholds, ECTS and traditional grades, control types), `response-codes.ts`.
- **`utils/grades.ts`**: Grade math: `calculateEctsGrade`, `calculateTraditionalGrade`, `calculateAccumulatedGrade`, `calculateExamTargets`.
- **`auth.ts`**: `isLoggedIn` — SSR-safe check for an active session in local storage.

---

## ⚙️ Backend Modules (`../packages/backend`)

The backend follows NestJS modular architecture. Controllers handle HTTP only, services hold the business logic, and Prisma is injected as a service.

### 1. `AuthModule` (Authentication)

Handles API security and access control.

- **Endpoints** (`/auth/...`, names come from `AUTH_ROUTES`): `register`, `login`, `google` (Google SSO), `moodle/link` (link a Moodle account to an existing user), `logout`, `refresh`.
- **Tokens:** Passport.js with two JWT strategies, access token (`AT_SECRET`) and refresh token (`RT_SECRET`). `AtGuard` is registered globally; mark open endpoints with `@Public()`.
- **Decorators:** `@GetUser('<field>')` extracts a field from the payload set by the guard on the route. Under `AtGuard` that is the access-token payload (`sub`, `email`, `moodleId`, `moodleToken`); under `RtGuard` (`refresh`) it is the refresh-token payload plus `refreshToken` taken from the cookie (`sub`, `refreshToken`).

### 2. `UserModule` (User Management)

Manages user accounts and role-based access (`USER`, `STUDENT`, `INSTRUCTOR`, `ADMIN`, `OPPORTUNITIES_MODERATOR`; a user can hold several roles).

### 3. `MoodleModule` (Moodle LMS Integration)

The largest module, acting as a proxy and aggregator for Moodle API data. `moodle-client` wraps all HTTP calls to Moodle. The feature submodules are:

- **`moodle-courses`**: Fetches user courses (`/moodle/courses`).
  - _Filter conditions:_ Supports filtering by status (`status`: `completed`, `not_completed`, `in_progress`, `not_started`), academic year (`year`), and semester (`semester`) via the `filterCourses` utility.
- **`moodle-grades`**: Retrieves overall course grades (`/moodle/grades`).
- **`moodle-assignments`**: Assignment operations.
  - _Functions:_ Fetch assignment list (`/moodle/assignments`), check submission status (`/moodle/assignments/:assignId/status`), and submit assignment solutions (`/moodle/assignments/:assignId/submission`).
  - _Sorting & filtering:_ Accepts `sortByDate` (`asc`/`desc`), `dateFrom`, `dateTo`, and completion status filters.
- **`moodle-events`**: Fetches calendar events and deadlines (`/moodle/events`).
- **`moodle-course-contents`**: Fetches detailed course content and sections (`/moodle/courses/:courseId/contents`).
- **`moodle-files`**: Uploads files to Moodle (`/moodle/files/upload`).
- **`moodle-profile`**: Student profile data (`/moodle/profile`).
- **`moodle-notifications`** (`/moodle/notifications`) and **`moodle-statistics`** (`/moodle/statistics`): Student notifications and aggregated performance statistics.

---

## 🎨 Frontend Modules (`../packages/uni-hub`)

The client-side architecture is organized into clear domain directories. Pages prefer React Server Components; client components are used only where interactivity is required.

### 1. `app` (Routing)

Next.js App Router: `app/page.tsx` (dashboard entry), `app/login`, `app/courses/[courseId]/contents`, plus `layout.tsx` and `providers.tsx`. Route files stay thin and render the corresponding `views`.

### 2. `services` (API Client)

A `fetch`-based client for backend communication. `services/api.ts` is a barrel over:

- **`api.auth.ts`** (`authApi`): login, register, Google SSO, Moodle linking, logout.
- **`api.moodle.ts`** (`moodleApi`): backend Moodle endpoints.
- **`api.request.ts`** (`request`): the shared request function.
  - _Auth:_ Automatically adds the `Authorization: Bearer <token>` header.
  - _Retry:_ Retries on transient errors (up to 2 retries) and respects `AbortSignal`.
- **`api.storage.ts`** (`safeStorage`, `API_BASE_URL`): SSR-safe storage access and backend URL.

### 3. `views` (Pages)

- **`DashboardPage`** with `views/dashboard/`: Main student portal. Tabs (`OverviewTab`, `AssignmentsTab`, `GradesTab`, `CoursesTab`), sections such as `StudentCard`, `StatCardGrid`, `UpcomingEventsList`, and the `useDashboardData` hook that aggregates schedule, grades, assignments and metrics.
- **`CourseContents`**: Course sections and learning materials viewer.
- **`LoginPage`**: User login and authentication view.

### 4. `components` (Application Components)

Components with business logic, grouped by domain:

- **`assignments`**: `AssignmentCard`, `AssignmentModal` (inspect details, submit files/text), `AssignmentsDonut` (chart), `AssignmentsEmptyState`, and the `useAssignmentStatuses` hook.
- **`auth`**: `AuthField`, `GoogleLoginButton`, `LinkMoodleModal`.
- **`dashboard`**: `DashboardSkeleton`, `DeanContactModal` (`DeanContactInfo`, `DeanTopicChips`), `QuickActions`, `RecentGradesFeed`, `MobileBottomNav`.
- **`gamification`**: `GradeSimulator` ("What-if?" simulator), `BadgeSystem`, `StreakBadge`, `ExamTargetsGrid`, `AdmissionBanner`, `LiveCountdown`, `ContextualGreeting`.
- **`grades`**: `GradesChart`.
- **`schedule`**: `ScheduleView` — academic timetable and calendar event renderer.
- **`common`**: `LanguageSwitcher`.

Presentational building blocks come from `@universe/ui` (`@una` primitives and `complex` components); do not embed composite presentation layouts here.

### 5. `store` & `constants` (State & Gamification)

- **`store/useGamificationStore.ts`**: Zustand store managing gamification state (daily check-in streak, unlocked badges, sound toggle, celebration trigger).
- **`constants/gamification.ts`**: Gamification constants and badge definitions.
- **`utils/gamification.ts`**: Date-key helpers, `isSemesterMaster` and `evaluateBadgeUnlocks` — badge awarding conditions.

### 6. `hooks`, `i18n` and `theme`

- **`useCountUp`**: Smoothly animates numeric transitions (e.g. points accrual or grade score changes).
- **`useNow`**: Provides reactive current timestamp with a configurable update interval (used for deadline counters and timers).
- **`useMediaQuery`**: Breakpoint observer built on `useSyncExternalStore` (SSR-safe). Use it with `BREAKPOINTS` from `@universe/core`.
- **`i18n`**: `LanguageContext` / `useLanguage().formatMessage('some.key')`. Every UI string needs a key in both `locales/uk.ts` and `locales/en.ts`.
- **`theme`**: `ThemeContext` and the theme switcher.

---

## 🧰 Utilities (Utils)

The project encapsulates domain logic and reusable helpers into utility functions.

### Backend Utils (`../packages/backend/utils`)

- **`get-creds.ts` (`GetCreds`)**: Service to retrieve user credentials from Moodle. Queries `/login/token.php` for user token and `core_webservice_get_site_info` to extract Moodle `userid`.
- **`moodle-params-builder.ts` (`buildMoodleParams`)**: Serializes nested objects and arrays into flat key-value pairs required by Moodle REST Web Services.
- **`moodleFilters.ts`**: Moodle data processing tools:
  - `normalizeMoodleText` — strips HTML tags and decodes entities safely in a single pass.
  - Parsing helpers (`extractAcademicYear`, `matchesYearAndSemester`) — extract academic years (e.g. "2025/2026") and semesters from course titles using regex.
  - `filterCourses` — filters courses according to completion progress and academic timeline.
- **`wsfunctions.ts`**: Constants containing Moodle Web Service function names (e.g., `core_enrol_get_users_courses`).
- **`cors.config.ts`** and **`prisma-error.ts`**: CORS setup and Prisma error mapping.

### Frontend Utils (`../packages/uni-hub/utils`)

- **`confetti.ts`**: `fireConfetti` triggers visual confetti particle effects for achievement rewards.
- **`gradeMath.ts`** (`computeSimulatedFinal`, `projectSemesterWithAssignments`, `clampScore`): Formulas for the "What-if?" grade simulator, calculating hypothetical final grades with clamping.
- **`soundEffects.ts`** (`playSuccess`, `playClick`): Synthesizes UI audio via the `Web Audio API` (`AudioContext`, `OscillatorNode`) without requiring external audio assets.
- **`grades.ts`**: Helper utilities for parsing, normalizing, and formatting academic grades and scores (`getGradeTone`, `getGradeBarColor`, etc.).

---

## 🗄 Database (Prisma Schema)

The schema lives in `packages/backend/prisma/schema.prisma` and generates the client into `packages/database/client` (`pnpm db:generate`). Core models:

- **`User`**: Account identity (email, password, roles) and Moodle integration data (`moodleId`, `token` for the Moodle token, `refreshToken`).
- **`Course`**: Internal courses created by users with the `INSTRUCTOR` role.
- **`Enrollment`**: Many-to-many junction model linking users to enrolled courses (unique per `userId` + `courseId`).

---

## 🚀 Local Development Setup

1. Install dependencies: `pnpm install`
2. Create `.env` from `.env.example` and fill in `DATABASE_URL`, `AT_SECRET`, `RT_SECRET`, `MOODLE_BASEURL`, `FRONTEND_URL` and, for Google SSO, `GOOGLE_CLIENT_ID`. The backend refuses to start if `AT_SECRET` is missing or still equals the placeholder `your-access-token-secret-key` (`RT_SECRET` has the same check against `your-refresh-token-secret-key`); no minimum length is enforced, so use a long random value.
3. Prepare database: `pnpm db:generate && pnpm db:migrate`
4. Start development servers: `pnpm dev` (runs frontend and backend concurrently), or `pnpm dev:select` to choose between a local and a remote backend interactively.

Before opening a PR, `pnpm lint`, `pnpm lint:style`, `pnpm typecheck`, `pnpm test` and `pnpm build` must pass with zero warnings, and prettier must pass on the files you changed (see [docs/ai/workflow.md](ai/workflow.md)).
