# 🚀 UNiVerse - Onboarding Guide

Welcome to the **UNiVerse** project!
This guide will help you understand the project architecture, technology stack, and core module logic, functions, and conditions.

---

## 🏗 High-Level Architecture

The project is structured as a **Monorepo** using **pnpm** and **Turborepo**.

- **Frontend** (`../packages/uni-hub`): Next.js, React 19, Tailwind CSS, Zustand.
- **Backend** (`../packages/backend`): NestJS, REST API, Prisma.
- **Database** (`../packages/database`): PostgreSQL, Prisma.
- **UI** (`../packages/ui`): Shared UI components (una design system).

---

## ⚙️ Backend Modules (`../packages/backend/src`)

The backend is built on the NestJS modular architecture.

### 1. `AuthModule` (Authentication)

Responsible for security and API access control.

- **Functions:** Login (`/auth/login`), logout, JWT token validation.
- **Tools:** Passport.js with JWT strategy. Custom decorators (e.g., `@GetUser`) that extract user data (including `moodleId`, `moodleToken`) from requests.

### 2. `UserModule` (Users)

Manages user accounts, profiles, and roles (`STUDENT`, `INSTRUCTOR`, `ADMIN`).

### 3. `MoodleModule` (Moodle Integration)

The largest module, acting as a proxy and data aggregator for the Moodle API. Comprises multiple sub-modules:

- **`moodle-courses`**: Fetches user courses (`/moodle/courses`).
  - _Filter conditions:_ Supports filtering by status (`status`: `completed`, `not_completed`, `in_progress`, `not_started`), year (`year`), and semester (`semester`). Filtering is handled by the `filterCourses` utility.
- **`moodle-grades`**: Retrieves overall grades across all courses (`/moodle/grades`).
- **`moodle-assignments`**: Assignment operations.
  - _Functions:_ Fetch assignment lists (`/moodle/assignments`), check completion status (`/status`), and submit solutions (`/submission`).
  - _Sorting & filtering:_ Accepts `sortByDate` (`asc`/`desc`), `dateFrom`, `dateTo`, and completion status filters.
- **`moodle-events`**: Fetches calendar and events (`/moodle/events`).
- **`moodle-course-contents`**: Fetches detailed course contents (`/moodle/courses/:id/contents`).
- **`moodle-files`**: Uploads files to Moodle (`/moodle/files/upload`).
- **`moodle-notifications` & `moodle-statistics`**: Notifications and aggregated student performance statistics.

---

## 🎨 Frontend Modules (`../packages/uni-hub/src`)

The client application follows a clear directory-based architecture.

### 1. `services/api.ts` (API Client)

An Axios wrapper for backend communication.

- **Functions:** `authApi` (login/logout) and `moodleApi` (requests to backend Moodle endpoints).
- **Conditions (Interceptors):**
  - _Request Interceptor:_ Automatically appends the `Authorization: Bearer <token>` header to every request.
  - _Response Interceptor:_ Implements retry logic on errors (up to 2 retry attempts with exponential backoff).

### 2. `views` (Pages)

- **`DashboardPage`**: Main student portal page. Aggregates the class schedule, grade progression chart, upcoming deadlines (assignments), and summary metric cards.
- **`CourseContents`**: Detailed view of modules, sections, and resources for a specific course.
- **`LoginPage`**: User authentication and credential input screen.

### 3. `components` (UI Components)

- **Charts:** `AssignmentsDonut` and `GradesChart` — data visualization components built with `recharts`.
- **Interactions:** `AssignmentModal` — modal dialog for viewing assignment details and submitting files/text solutions.
- **Display:** `ScheduleView` — calendar view for academic events, `DashboardSkeleton` — placeholder loaders for pending data states.

### 4. `store` & `gamification` (State & Gamification)

- **`useGamificationStore.ts`**: Zustand store managing student gamification state (XP points, current level, unlocked badges).
- **`badges.ts`**: Badge definitions and unlock criteria.

### 5. `hooks` (Custom Hooks)

- **`useCountUp`**: Smooth numerical animation hook (e.g. for score increments and grade updates).
- **`useNow`**: Clock hook providing current timestamp at configurable intervals (used for live countdowns and deadline tickers).

---

## 🧰 Utilities (Utils)

The project leverages utilities to encapsulate domain-specific logic and reusable helpers.

### Backend Utils (`../packages/backend/src/utils`)

- **`get-creds.ts` (`GetCreds`)**: Service for obtaining credentials from Moodle. Queries `/login/token.php` for user authentication tokens and `core_webservice_get_site_info` to retrieve Moodle `userid`.
- **`moodle-params-builder.ts` (`buildMoodleParams`)**: Serializes nested objects and arrays into flat key-value pairs required by Moodle REST API conventions.
- **`moodleFilters.ts`**: Utilities for parsing and filtering Moodle payloads:
  - `normalizeMoodleText` — single-pass HTML tag stripping and entity decoding to guard against injection vulnerabilities.
  - Parsing functions (`extractAcademicYear`, `matchesYearAndSemester`) — regex extractors for academic year (e.g. "2025/2026") and semester from course titles.
  - `filterCourses` — filters courses by completion status (`progress`) and time boundaries.
- **`wsfunctions.ts`**: Constants containing Moodle Web Services function names (e.g., `core_enrol_get_users_courses`).

### Frontend Utils (`../packages/uni-hub/src/utils`)

- **`confetti.ts`**: `fireConfetti` trigger for celebration animations upon milestone or badge achievement.
- **`gradeMath.ts` (`computeSimulatedFinal`)**: Mathematical modeling for "What-If" grade simulation. Projects overall scores (70% current progress, 30% remaining potential) with boundary clamping.
- **`soundEffects.ts` (`playSuccess`, `playClick`)**: Web Audio API synthesizer (`AudioContext`, `OscillatorNode`) creating success chimes and interactive click effects without external asset dependencies.
- **`grades.ts`**: Helpers for parsing, converting, and formatting grade points and letter scales.

---

## 🗄 Database (Prisma Schema)

Relations defined in `schema.prisma`:

- **`User`**: Account metadata (email, password hash, role) and Moodle integration tokens (`moodleId`, `moodleToken`).
- **`Course`**: Internal courses created by instructors (`INSTRUCTOR` role).
- **`Enrollment`**: Many-to-many relationship linking users to enrolled courses.

---

## 🚀 Local Development Setup

1. Install dependencies: `pnpm install`
2. Configure `.env` (specify `DATABASE_URL`)
3. Setup database: `pnpm db:generate && pnpm db:migrate`
4. Start development server: `pnpm dev` (runs frontend and backend concurrently).
