## 2026-09-07T19:45:23Z

Your identity: Worker M4
Your working directory: C:\Users\TipTop230\WebstormProjects\uni-verse\.agents\worker_m4
Your parent conversation ID: 407d3953-20c8-4d83-894b-c4886258532d

MANDATORY FIRST STEP:
Read C:\Users\TipTop230\WebstormProjects\uni-verse\.agents\ORIGINAL_REQUEST.md and C:\Users\TipTop230\WebstormProjects\uni-verse\PROJECT.md.
Also read C:\Users\TipTop230\WebstormProjects\uni-verse\.agents\spec_miner_survey_1\handoff.md, C:\Users\TipTop230\WebstormProjects\uni-verse\.agents\explorer_survey_1\handoff.md, C:\Users\TipTop230\WebstormProjects\uni-verse\.agents\worker_m1\handoff.md, and C:\Users\TipTop230\WebstormProjects\uni-verse\.agents\worker_m2\handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Exclusive Ownership:
You own packages/uni-hub/** exclusively. Do NOT touch packages/backend, packages/types, or packages/ui.

Objective (Milestone M4 — R3. E-Dean's Office Navigation & Views in UniHub):

1. Update packages/uni-hub/package.json:
   - Add "@universe/types": "workspace:*" to dependencies.
   - Confirm "@universe/ui": "workspace:*" is present.
2. Consume @universe/ui and @universe/types:
   - In packages/uni-hub/src/services/api.ts and view components, import domain models from @universe/types (StudentProfile, CurriculumItem, StudentRecordBookItem, GradeRecord, AssignmentItem, ScheduleItem, LmsConnectionStatus, calculateEctsGrade, calculateTraditionalGrade).
   - In components/views, consume design system exports from @universe/ui (Button, Modal, ProgressBar, Tag, Select, Input, Form, Spinner, Skeleton, Toast, Empty).
3. Transform packages/uni-hub/src/views/DashboardPage.tsx into the E-Dean's Office portal:
   - Navigation: Exactly 5 canonical Ukrainian tabs:
     1. «Картка студента / Огляд» (overview)
     2. «Індивідуальний план» (courses)
     3. «Заліковка та бали» (grades)
     4. «Розклад занять» (schedule)
     5. «Завдання» (assignments)
   - Sidebar Footer (siderFooter):
     Display clean, unobtrusive quick link: 🔗 moodle.universemvp.tech with an active green status dot (linking to https://moodle.universemvp.tech). In collapsed mode, render compact icon with active green indicator dot.
   - Gradebook view:
     Present grades with:
     - 100-point score
     - ECTS letter (A–F)
     - Traditional mark («відмінно», «добре», «задовільно», «зараховано»)
     - Keep GradeSimulator and chart functional and aligned with the 100-point and ECTS scale.
   - Overview view:
     Student profile card (specialty 122 Computer Science, group, academic standing, credits, GPA, nearest deadline with countdown).
   - Individual Plan (Courses):
     Disciplines, ECTS credits, instructors, course content links.
   - Schedule view:
     Weekly timetable grid with Karazin time slots and lecture/lab indicators.
   - Assignments view:
     Filterable assignment feed with countdowns and submission status.
4. Replace any hardcoded moodle.karazin.ua links in packages/uni-hub (e.g. in src/components/AssignmentModal.tsx) with moodle.universemvp.tech.
5. Test and verify:
   Run: pnpm.cmd --filter @universe/uni-hub run typecheck
   Run: pnpm.cmd run lint
6. Write your full handoff report to:
   C:\Users\TipTop230\WebstormProjects\uni-verse\.agents\worker_m4\handoff.md
7. Send a completion message via send_message to parent (407d3953-20c8-4d83-894b-c4886258532d).
