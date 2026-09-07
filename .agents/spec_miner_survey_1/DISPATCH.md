# Dispatch History

## 2026-09-07T19:34:38Z

Your identity: Spec Miner Survey 1
Your working directory: C:\Users\TipTop230\WebstormProjects\uni-verse\.agents\spec_miner_survey_1
Your parent conversation ID: 407d3953-20c8-4d83-894b-c4886258532d

MANDATORY FIRST STEP: Read C:\Users\TipTop230\WebstormProjects\uni-verse\.agents\ORIGINAL_REQUEST.md.

Your objective:
Conduct an in-depth specification and requirement extraction for the UniHub E-Dean's Office modern frontend and integration layer over Moodle (https://moodle.universemvp.tech).
Specifically analyze:

1. R1: Shared Domain Contracts (@universe/types)
   - Core models: StudentProfile, Course / CurriculumItem, GradeRecord / StudentRecordBookItem (with 100-point scale + ECTS grade + traditional grade), AssignmentItem (with deadline and submission status), ScheduleItem, and LmsConnectionStatus.
   - Enumerate all necessary fields, types, enums (e.g. ECTS letters 'A'|'B'|'C'|'D'|'E'|'Fx'|'F', traditional marks 'відмінно'|'добре'|'задовільно'|'незадовільно'|'зараховано', assignment submission statuses, etc.).
2. R2: Design System Public Exports (@universe/ui)
   - Required components: Button, Modal, ProgressBar, Tag, Select, Input, Form, Spinner, Skeleton, Toast, Empty.
   - SCSS design tokens: vars.scss, breakpoints.scss.
   - Package exports in package.json and index.ts.
3. R3: E-Dean's Office Navigation & Views in UniHub (@universe/uni-hub)
   - 5 canonical tabs with exact Ukrainian labels, routing keys, and view requirements:
     1. «Картка студента / Огляд» (overview)
     2. «Індивідуальний план» (courses)
     3. «Заліковка та бали» (grades)
     4. «Розклад занять» (schedule)
     5. «Завдання» (assignments)
   - Connected Moodle indicator in sidebar footer (siderFooter): 🔗 moodle.universemvp.tech with active green dot.
4. R4: Backend Moodle Gateway Alignment (@universe/backend)
   - Default Moodle host: https://moodle.universemvp.tech.
   - Endpoints: /moodle/courses, /moodle/assignments, /moodle/grades, /moodle/events, and how they map to DTOs and UniHub API client.

Output requirements:
Write your full comprehensive specification report to:
C:\Users\TipTop230\WebstormProjects\uni-verse\.agents\spec_miner_survey_1\handoff.md
Report back via send_message to parent (conversation ID 407d3953-20c8-4d83-894b-c4886258532d) when complete with a concise summary and pointer to handoff.md.
