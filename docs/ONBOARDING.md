# 🚀 UNiVerse - Onboarding Guide

Welcome to the **UNiVerse** project!
This guide will help you understand the project architecture, tech stack, and the logic behind the main modules, functions, and workflows.

---

## 🏗 High-Level Architecture

The project is structured as a **Monorepo** managed with **pnpm** and **Turborepo**.

- **Frontend** (`../packages/uni-hub`): Next.js, React 19, SCSS Modules, Zustand.
- **Backend** (`../packages/backend`): NestJS, REST API, Prisma.
- **Database** (`../packages/database`): PostgreSQL, Prisma.
- **UI** (`../packages/ui`): Shared UI component library (`@una`).

---

## ⚙️ Backend Modules (`../packages/backend/src`)

The backend follows NestJS modular architecture.

### 1. `AuthModule` (Authentication)

Handles API security and access control.

- **Endpoints:** Login (`/auth/login`), logout, JWT verification.
- **Tools:** Passport.js with JWT strategy. Includes custom decorators (e.g., `@GetUser`) to extract authenticated user credentials (including `moodleId`, `moodleToken`) from the request.

### 2. `UserModule` (User Management)

Manages user accounts, profiles, and role-based access (`STUDENT`, `INSTRUCTOR`, `ADMIN`).

### 3. `MoodleModule` (Moodle LMS Integration)

The largest module, acting as a proxy and aggregator for Moodle API data. It includes the following submodules:

- **`moodle-courses`**: Fetches user courses (`/moodle/courses`).
  - _Filter conditions:_ Supports filtering by status (`status`: `completed`, `not_completed`, `in_progress`, `not_started`), academic year (`year`), and semester (`semester`) via the `filterCourses` utility.
- **`moodle-grades`**: Retrieves overall course grades (`/moodle/grades`).
- **`moodle-assignments`**: Assignment operations.
  - _Functions:_ Fetch assignment list (`/moodle/assignments`), check submission status (`/status`), and submit assignment solutions (`/submission`).
  - _Sorting & filtering:_ Accepts `sortByDate` (`asc`/`desc`), `dateFrom`, `dateTo`, and completion status filters.
- **`moodle-events`**: Fetches calendar events and deadlines (`/moodle/events`).
- **`moodle-course-contents`**: Fetches detailed course content and sections (`/moodle/courses/:id/contents`).
- **`moodle-files`**: Uploads files to Moodle (`/moodle/files/upload`).
- **`moodle-notifications` & `moodle-statistics`**: Student notifications and aggregated performance statistics.

---

## 🎨 Frontend Modules (`../packages/uni-hub/src`)

The client-side architecture is organized into clear domain directories.

### 1. `services/api.ts` (API Client)

An Axios wrapper for backend communication.

- **Services:** `authApi` (login/logout) and `moodleApi` (backend Moodle endpoints).
- **Interceptors:**
  - _Request Interceptor:_ Automatically injects the `Authorization: Bearer <token>` header into every outgoing request.
  - _Response Interceptor:_ Implements retry logic on transient errors (up to 2 retries with exponential backoff).

### 2. `views` (Pages)

- **`DashboardPage`**: Main student portal dashboard. Aggregates schedule, grade trends, upcoming assignments, and performance metrics.
- **`CourseContents`**: Course sections and learning materials viewer.
- **`LoginPage`**: User login and authentication view.

### 3. `components` (UI Components)

- **Charts:** `AssignmentsDonut` and `GradesChart` — data visualization components built with `recharts`.
- **Modals & Dialogs:** `AssignmentModal` — modal window for inspecting assignment details and submitting files/text solutions.
- **Views & States:** `ScheduleView` — academic timetable and calendar event renderer, `DashboardSkeleton` — placeholder skeleton for loading states.

### 4. `store` & `gamification` (State & Gamification)

- **`useGamificationStore.ts`**: Zustand store managing gamification state (user points, levels, and earned badges).
- **`badges.ts`**: Awarding conditions and badge evaluation logic.

### 5. `hooks` (Custom Hooks)

- **`useCountUp`**: Smoothly animates numeric transitions (e.g. points accrual or grade score changes).
- **`useNow`**: Provides reactive current timestamp with a configurable update interval (used for deadline counters and timers).

---

## 🧰 Utilities (Utils)

The project encapsulates domain logic and reusable helpers into utility functions.

### Backend Utils (`../packages/backend/src/utils`)

- **`get-creds.ts` (`GetCreds`)**: Service to retrieve user credentials from Moodle. Queries `/login/token.php` for user token and `core_webservice_get_site_info` to extract Moodle `userid`.
- **`moodle-params-builder.ts` (`buildMoodleParams`)**: Serializes nested objects and arrays into flat key-value pairs required by Moodle REST Web Services.
- **`moodleFilters.ts`**: Moodle data processing tools:
  - `normalizeMoodleText` — strips HTML tags and decodes entities safely in a single pass.
  - Parsing helpers (`extractAcademicYear`, `matchesYearAndSemester`) — extract academic years (e.g. "2025/2026") and semesters from course titles using regex.
  - `filterCourses` — filters courses according to completion progress and academic timeline.
- **`wsfunctions.ts`**: Constants containing Moodle Web Service function names (e.g., `core_enrol_get_users_courses`).

### Frontend Utils (`../packages/uni-hub/src/utils`)

- **`confetti.ts`**: `fireConfetti` triggers visual confetti particle effects for achievement rewards.
- **`gradeMath.ts` (`computeSimulatedFinal`)**: Mathematical formula for the "What-if?" grade simulator, calculating hypothetical final grades with clamping.
- **`soundEffects.ts` (`playSuccess`, `playClick`)**: Synthesizes UI audio via the `Web Audio API` (`AudioContext`, `OscillatorNode`) without requiring external audio assets.
- **`grades.ts`**: Helper utilities for parsing, normalizing, and formatting academic grades and scores.

---

## 🗄 Database (Prisma Schema)

The database schema (`schema.prisma`) defines core models and relations:

- **`User`**: Account identity (email, password, role) and Moodle integration tokens (`moodleId`, `moodleToken`).
- **`Course`**: Internal courses created by users with the `INSTRUCTOR` role.
- **`Enrollment`**: Many-to-many junction model linking users to enrolled courses.

---

## 🚀 Local Development Setup

1. Install dependencies: `pnpm install`
2. Configure `.env` (set `DATABASE_URL` and required variables)
3. Prepare database: `pnpm db:generate && pnpm db:migrate`
4. Start development servers: `pnpm dev` (runs frontend and backend concurrently).
