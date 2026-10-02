# Domain: E-Dean Portal and Moodle Gateway

Applies when working on the student portal (UniHub), shared domain contracts, grades, or gateway endpoints.

## Moodle gateway (`@universe/backend`)

- The default Moodle host MUST be `https://moodle.universemvp.tech` (not `moodle.karazin.ua`).
- DTOs in controllers and services must match the contracts in `@universe/core/types`.

## Shared domain types

- Domain entities (`StudentProfile`, `CurriculumItem`, `GradeRecord`, …) come from `@universe/core/types`.
- Grade constants and calculation contracts (`CONTROL_TYPES`, `TRADITIONAL_GRADES`, `TraditionalGrade`, `ControlType`, `EctsGrade`, `GradeAccumulationParams`, `GradeAccumulationResult`) come from `@universe/core/constants/grades` (or `@universe/core/utils/grades` for calculations).
- Alias and re-export rules: [code-style](code-style.md).

## Portal navigation (`packages/uni-hub`)

Use these 5 canonical Ukrainian navigation tabs:

- «Картка студента / Огляд»
- «Індивідуальний план»
- «Заліковка та бали» — 3-tier display: 100-point score, ECTS letter A–F, traditional mark
- «Розклад занять»
- «Завдання»

Sidebar footer: a Moodle status indicator with an active link to `https://moodle.universemvp.tech`.

## Grading scale (Karazin University, 100 points)

| Band           | Points | ECTS                      | Wording                                   |
| -------------- | ------ | ------------------------- | ----------------------------------------- |
| `EXCELLENT`    | 90–100 | `A`                       | exam: відмінно                            |
| `GOOD`         | 70–89  | `B` (82–89) / `C` (70–81) | exam: добре                               |
| `SATISFACTORY` | 50–69  | `D` / `E`                 | exam: задовільно; credit: зараховано      |
| `FAIL`         | 0–49   | `Fx` / `F`                | exam: незадовільно; credit: не зараховано |

Threshold constants live in `GRADES_THRESHOLD`: `EXCELLENT = 90`, `GOOD = 70`, `SATISFACTORY = 50` (`packages/core/constants/grades.ts`). Use the constants; never hardcode the numbers.
