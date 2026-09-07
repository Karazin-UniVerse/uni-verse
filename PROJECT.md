# Project: UniHub E-Dean's Office & Moodle Integration Layer

## Architecture

Monorepo workspace (pnpm + Turborepo) consisting of 7 active packages:

- `@universe/types` (`packages/types`): Single source of truth for cross-package contracts, models, and grade scales.
- `@universe/ui` (`packages/ui`): Una UI design system public components and SCSS tokens.
- `@universe/backend` (`packages/backend`): NestJS gateway proxying and adapting Moodle LMS REST endpoints (`https://moodle.universemvp.tech`).
- `@universe/uni-hub` (`packages/uni-hub`): Next.js 16 App Router student portal transformed into Karazin E-Dean's Office.
- `@universe/database` (`packages/database`): Prisma ORM data layer.
- `@universe/eslint-config` (`configs/config-eslint`): Workspace ESLint configuration.
- `@universe/typescript-config` (`configs/config-typescript`): Base and package tsconfig presets.

Data Flow:
Browser (UniHub Next.js) ──► `packages/uni-hub/src/services/api.ts` ──► `@universe/backend` NestJS Gateway ──► Moodle LMS (`https://moodle.universemvp.tech`)
Both frontend and backend share types from `@universe/types`. Frontend consumes UI components from `@universe/ui`.

## Feature Inventory

| #   | Feature                                             | Description                                                                                                                                                | Milestone | Source                                |
| --- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------- |
| 1   | F1: Shared Core Domain Models                       | StudentProfile, CurriculumItem, StudentRecordBookItem/GradeRecord, AssignmentItem, ScheduleItem, LmsConnectionStatus                                       | M1        | ORIGINAL_REQUEST §R1                  |
| 2   | F2: Grade & ECTS Scale Calculation Utilities        | calculateEctsGrade (A-F) & calculateTraditionalGrade (відмінно/добре/задовільно/зараховано)                                                                | M1        | ORIGINAL_REQUEST §R1                  |
| 3   | F3: Types Package Exports & Workspace Wiring        | package.json exports, tsconfig.json, typecheck scripts for @universe/types                                                                                 | M1        | ORIGINAL_REQUEST §R1                  |
| 4   | F4: Design System 11 Component Public Exports       | Button, Modal, ProgressBar, Tag, Select, Input, Form, Spinner, Skeleton, Toast, Empty exported from packages/ui/index.ts                                   | M2        | ORIGINAL_REQUEST §R2                  |
| 5   | F5: SCSS Design Tokens Public Exports               | vars.scss, breakpoints.scss exposed for workspace consumers                                                                                                | M2        | ORIGINAL_REQUEST §R2                  |
| 6   | F6: Backend Moodle Gateway Host Alignment           | Default host changed to https://moodle.universemvp.tech in MoodleClientService, files service, utils, and envs                                             | M3        | ORIGINAL_REQUEST §R4                  |
| 7   | F7: Backend DTOs Alignment with @universe/types     | DTOs aligned with shared contracts for /moodle/courses, /moodle/assignments, /moodle/grades, /moodle/events                                                | M3        | ORIGINAL_REQUEST §R4                  |
| 8   | F8: UniHub Package Dependencies & Imports Alignment | Add @universe/types, consume @universe/ui from package root, replace alias imports where appropriate                                                       | M4        | ORIGINAL_REQUEST §R2, §R3             |
| 9   | F9: UniHub API Service Alignment                    | Refactor api.ts to use @universe/types contracts and verified endpoints                                                                                    | M4        | ORIGINAL_REQUEST §R4                  |
| 10  | F10: E-Dean 5 Canonical Ukrainian Tabs              | Overview («Картка студента / Огляд»), Courses («Індивідуальний план»), Grades («Заліковка та бали»), Schedule («Розклад занять»), Assignments («Завдання») | M4        | ORIGINAL_REQUEST §R3                  |
| 11  | F11: Sidebar Footer Moodle Status Indicator         | 🔗 moodle.universemvp.tech with active green dot in siderFooter                                                                                            | M4        | ORIGINAL_REQUEST §R3                  |
| 12  | F12: Digital Gradebook 3-Tier Grade Display         | 100-point score + ECTS letter (A-F) + traditional mark («відмінно», «добре», «задовільно», «зараховано»)                                                   | M4        | ORIGINAL_REQUEST §R3                  |
| 13  | F13: Fix Hardcoded Legacy URLs in UniHub            | Replace moodle.karazin.ua with moodle.universemvp.tech in AssignmentModal etc.                                                                             | M4        | ORIGINAL_REQUEST §R4                  |
| 14  | F14: E2E Test Harness & Tier 1-4 Test Suite         | Opaque-box requirement-driven verification test suite covering features F1-F13                                                                             | E2E_TRACK | Project Pattern                       |
| 15  | F15: Monorepo Full Verification & Git Branch Commit | typecheck, oxlint, turbo build pass 100%, changes committed to feature/unihub-moodle-shell                                                                 | M_FINAL   | ORIGINAL_REQUEST §Acceptance Criteria |

## Milestones

| #       | Name                                                                 | Scope                                                                                         | Dependencies        | Status      |
| ------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------- | ----------- |
| M1      | R1. Shared Domain Contracts (@universe/types)                        | F1, F2, F3: Populate packages/types/src/index.ts, tsconfig.json, package.json                 | none                | DONE        |
| M2      | R2. Design System Public Exports (@universe/ui)                      | F4, F5: Expose 11 components and SCSS tokens from packages/ui/index.ts                        | none                | DONE        |
| M3      | R4. Backend Moodle Gateway Alignment (@universe/backend)             | F6, F7: Default to https://moodle.universemvp.tech, align DTOs with @universe/types           | M1                  | DONE        |
| M4      | R3. E-Dean's Office Navigation & Views in UniHub (@universe/uni-hub) | F8, F9, F10, F11, F12, F13: Ukrainian tabs, sidebar Moodle link, 3-tier gradebook, api.ts     | M1, M2, M3          | IN_PROGRESS |
| E2E     | E2E Testing Track                                                    | F14: Standalone test suite verifying requirements R1-R4 independently                         | none                | DONE        |
| M_FINAL | Final Verification & Commit                                          | F15: Pass 100% E2E tests, typecheck, lint, turbo build, commit to feature/unihub-moodle-shell | M1, M2, M3, M4, E2E | PLANNED     |

## Interface Contracts

### `@universe/types` ↔ Workspace Consumers

```typescript
export type EctsGrade = 'A' | 'B' | 'C' | 'D' | 'E' | 'Fx' | 'F';
export type TraditionalGrade =
  'відмінно' | 'добре' | 'задовільно' | 'незадовільно' | 'зараховано' | 'не зараховано';
export type ControlType = 'exam' | 'credit' | 'differentiated_credit';
export type AssignmentSubmissionStatus = 'new' | 'draft' | 'submitted' | 'graded' | 'overdue';
export type ScheduleEventType =
  'lecture' | 'lab' | 'practice' | 'seminar' | 'consultation' | 'exam';

export interface StudentProfile {
  id: string | number;
  moodleId: number | string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  studentCardNumber: string;
  recordBookNumber: string;
  faculty: string;
  department: string;
  specialty: string;
  educationalProgram: string;
  degree: 'bachelor' | 'master' | 'phd';
  course: number;
  group: string;
  studyForm: 'full-time' | 'part-time';
  financing: 'budget' | 'contract';
  status: 'active' | 'academic_leave' | 'expelled' | 'graduated';
  gpa: number;
  totalCreditsEarned: number;
  academicStanding: 'honors' | 'good' | 'warning' | 'probation';
}

export interface CurriculumItem {
  id: number;
  code: string;
  name: string;
  shortName: string;
  description?: string;
  credits: number;
  semester: number;
  academicYear: string;
  cycle?: 'general' | 'professional' | 'elective';
  controlType: ControlType;
  instructors: Array<{ name: string; email?: string; role?: string }>;
  status: 'not_started' | 'in_progress' | 'completed';
  progress?: number;
  moodleCourseId?: number;
  moodleUrl?: string;
}

export interface StudentRecordBookItem {
  id: string | number;
  courseId: number;
  courseName: string;
  courseCode?: string;
  credits: number;
  semester: number;
  academicYear: string;
  controlType: ControlType;
  currentScore: number | null;
  examScore?: number | null;
  totalScore: number;
  ectsGrade: EctsGrade;
  traditionalGrade: TraditionalGrade;
  date?: string;
  instructorName?: string;
  isPassed: boolean;
}
export type GradeRecord = StudentRecordBookItem;

export interface AssignmentItem {
  id: number;
  courseId: number;
  courseName: string;
  name: string;
  description?: string;
  duedate: number;
  submissionStatus: AssignmentSubmissionStatus;
  gradingStatus?: 'not_graded' | 'graded';
  grade?: string | number | null;
  maxGrade?: number;
  feedback?: string;
  year?: string | null;
  semester?: number | null;
}

export interface ScheduleItem {
  id: string | number;
  courseId?: number;
  title: string;
  type: ScheduleEventType;
  instructor: string;
  location: string;
  onlineLink?: string;
  startTime: string;
  endTime: string;
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  weekType?: 'all' | 'numerator' | 'denominator';
}

export interface LmsConnectionStatus {
  host: string;
  isConnected: boolean;
  status: 'online' | 'offline' | 'degraded' | 'syncing';
  lastSyncTimestamp: number | string;
  latencyMs?: number;
  userId?: string | number;
  userTokenValid: boolean;
}

export function calculateEctsGrade(score: number): EctsGrade;
export function calculateTraditionalGrade(
  score: number,
  controlType?: ControlType,
): TraditionalGrade;
```

### `@universe/ui` ↔ `packages/uni-hub`

```typescript
export { Button } from './components/una/Button';
export { Modal } from './components/una/Modal';
export { ProgressBar } from './components/una/ProgressBar';
export { Tag } from './components/una/Tag';
export { Select } from './components/una/Select';
export { TextInput as Input, TextInput } from './components/una/inputs/TextInput';
export { SimpleForm as Form, SimpleForm } from './components/una/Form';
export { Spinner } from './components/una/Spinner';
export { Skeleton } from './components/una/Skeleton';
export { Toast, ToastProvider, useToast } from './components/una/Toast';
export { Empty } from './components/una/Empty';
```

## Code Layout

- `packages/types/src/index.ts`: Domain models and calculation utilities.
- `packages/types/package.json`: Exports field, types field, workspace configuration.
- `packages/types/tsconfig.json`: TypeScript compiler options extending base config.
- `packages/ui/index.ts`: Public exports of Una UI components.
- `packages/backend/src/moodle/moodle-client/moodle.client.service.ts`: Moodle client service with https://moodle.universemvp.tech default.
- `packages/backend/src/moodle/moodle-files/moodle-files.service.ts`: Files service with Moodle URL fallback.
- `packages/backend/src/utils/get-creds.ts`: Credentials helper with Moodle URL fallback.
- `packages/uni-hub/src/views/DashboardPage.tsx`: E-Dean dashboard with 5 Ukrainian tabs, siderFooter Moodle link, and 3-tier gradebook.
- `packages/uni-hub/src/services/api.ts`: API client consuming backend endpoints with @universe/types contracts.
- `packages/uni-hub/src/components/AssignmentModal.tsx`: Updated Moodle URL link.
- `tests/e2e/`: E2E test suite created by E2E Testing Track.
