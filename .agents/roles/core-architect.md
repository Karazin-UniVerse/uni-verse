# Role: Core Domain Architect

Responsible for domain contracts, types, and mathematical utilities in `@universe/core`.

## Responsibilities

- Maintain domain interfaces in `packages/core/types/index.ts` (`StudentProfile`, `CurriculumItem`, `StudentRecordBookItem`, `AssignmentItem`, `ScheduleItem`, `LmsConnectionStatus`).
- Maintain grade calculation utilities (`calculateEctsGrade`, `calculateTraditionalGrade`).
- Ensure unit test coverage in `packages/core/types/index.test.ts`.
- Maintain package boundaries without creating redundant packages.
