# Original User Request

## 2026-09-07T19:33:07Z

Build and wire the UniHub E-Dean's Office modern frontend and integration layer as a headless wrapper over Moodle (https://moodle.universemvp.tech) inside the Karazin-UniVerse/uni-verse monorepo, following the KSE Hub blueprint and utilizing @universe/ui design system and @universe/types shared contracts.

Working directory: C:\Users\TipTop230\WebstormProjects\uni-verse
Integrity mode: development
Branch: feature/unihub-moodle-shell

## Requirements

### R1. Shared Domain Contracts (@universe/types)

Populate packages/types as the single source of truth for cross-package contracts between Moodle, the NestJS Gateway, and the UniHub Next.js frontend:

- Core models: StudentProfile, Course / CurriculumItem, GradeRecord / StudentRecordBookItem (with 100-point scale + ECTS grade + traditional grade), AssignmentItem (with deadline and submission status), ScheduleItem, and LmsConnectionStatus.
- Export TypeScript declarations and package metadata so @universe/types can be consumed via workspace:* across the monorepo.

### R2. Design System Public Exports (@universe/ui)

Expose the complete Una UI design system from packages/ui/index.ts:

- Public component exports: Button, Modal, ProgressBar, Tag, Select, Input, Form, Spinner, Skeleton, Toast, Empty.
- Export SCSS design tokens (vars.scss, breakpoints.scss).
- Link @universe/ui into packages/uni-hub dependencies.

### R3. E-Dean's Office Navigation & Views in UniHub (@universe/uni-hub)

Transform the UniHub student dashboard into an E-Dean's Office portal:

- Canonical Ukrainian navigation tabs:
  1. «Картка студента / Огляд» (overview): Student profile, academic standing, course progress, nearest deadlines.
  2. «Індивідуальний план» (courses): Enrolled disciplines, ECTS credits, instructors, real Karazin courses from Notion/Moodle.
  3. «Заліковка та бали» (grades): Digital gradebook with current continuous assessment, exam/credit score, 100-point scale, ECTS letter (A–F), and traditional marks («відмінно», «добре», «задовільно», «зараховано»).
  4. «Розклад занять» (schedule): Weekly timetable grid with lecture/lab indicators.
  5. «Завдання» (assignments): Filterable assignment feed with countdowns and submission status.
- Connected Moodle indicator: In the sidebar footer (siderFooter), display a clean, unobtrusive status link: 🔗 moodle.universemvp.tech with an active green indicator.

### R4. Backend Moodle Gateway Alignment (@universe/backend)

Verify and configure packages/backend/src/moodle:

- Ensure MoodleClientService defaults to https://moodle.universemvp.tech.
- Ensure endpoints (/moodle/courses, /moodle/assignments, /moodle/grades, /moodle/events) conform to @universe/types DTOs.
- Connect packages/uni-hub/src/services/api.ts to seamlessly consume these endpoints.

## Acceptance Criteria

### Package Integration & Build

- [ ] @universe/types successfully builds and exports all TypeScript types without errors.
- [ ] @universe/ui index exports are accessible and consumed in packages/uni-hub.
- [ ] pnpm.cmd run typecheck passes with 0 errors across all 7 monorepo packages.
- [ ] pnpm.cmd run lint (oxlint) passes with 0 errors and 0 warnings.
- [ ] pnpm.cmd run build (turbo build) succeeds across all workspace packages.

### UI/UX & E-Dean Requirements

- [ ] Dashboard displays all 5 canonical E-Dean tabs with correct Ukrainian labels and icons.
- [ ] Sidebar footer displays the quick link 🔗 moodle.universemvp.tech with active status dot.
- [ ] Gradebook presents grades with 100-point score, ECTS letter (A–F), and traditional mark.
- [ ] All code changes are committed to the feature/unihub-moodle-shell branch.
