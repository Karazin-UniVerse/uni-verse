# ED-176: Localization and UI Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 5 UI/UX issues identified in ticket ED-176: missing localization in assignment statuses, unstyled uppercase category pills in Opportunities, black focus border around grades chart on click, asymmetric/unbalanced overview cards (Recent Grades vs Assignment Status), and black box borders in native datepicker.

**Architecture:** Frontend UI improvements adhering to Una design system tokens and strict monorepo rules (no hardcoded strings, no backward-compat shims, language-agnostic primitives in `@una`, co-located styling in SCSS modules).

**Tech Stack:** Next.js 16 (App Router), React 19, SCSS Modules, Una Design System (`@una`), Recharts, Vitest.

**Spec:** Notion task [ED-176](https://app.notion.com/p/Fix-bugs-with-localisation-other-3f8f8cf15c6180e594eafea06c37a097) ("Fix bugs with localisation & other")

## Global Constraints

- Monorepo rules in `GEMINI.md`: Zero hardcoded user-facing strings; all translations defined in both `uk.ts` and `en.ts`.
- SCSS tokens: Use CSS variables from the design system (`--bg-card`, `--card-border`, `--card-shadow`, `--font-xs`, `--border-radius-medium`, etc.).
- Primitive tier: Components in `packages/ui` must remain language-agnostic; localized strings come via props or `Intl`.
- Verification: `pnpm lint`, `pnpm lint:style`, `pnpm typecheck`, `pnpm test` must pass with zero warnings and zero errors.

## Review Focus

- Empty state handling in balanced cards (Overview tab).
- Locale switching: confirm all assignment statuses display in English when locale is set to 'en'.
- Date formatting: ensure custom date picker outputs and accepts standard `YYYY-MM-DD` strings or `Date` objects expected by filter callbacks.
- Mobile responsiveness for the date picker and the balanced overview cards.

---

### Task 1: Assignment Status Localization (Screenshot 1)

**Files:**

- Modify: `packages/uni-hub/i18n/locales/uk.ts`
- Modify: `packages/uni-hub/i18n/locales/en.ts`
- Modify: `packages/uni-hub/views/dashboard/tabs/helpers.ts:3-50`
- Modify: `packages/uni-hub/views/dashboard/tabs/helpers.test.ts`
- Modify: `packages/uni-hub/components/assignments/AssignmentCard.tsx:70-150`
- Modify: `packages/uni-hub/components/assignments/AssignmentCard.test.ts`

**Interfaces:**

- Produces: `AssignmentStatusInfo.labelKey: TranslationKey` (replacing hardcoded `label: string`)
- Consumes: `useLanguage().formatMessage(statusInfo.labelKey)`

- [ ] **Step 1: Write failing tests in `helpers.test.ts` and `AssignmentCard.test.ts`**
      Assert that `getAssignmentStatusInfo` returns `labelKey: 'assignments.status.inProgress'` (etc.) and that `AssignmentCard` renders localized text in both English and Ukrainian.
- [ ] **Step 2: Add translation keys in `uk.ts` and `en.ts`**
      Keys:
  - `assignments.status.graded`: 'Оцінено' / 'Graded'
  - `assignments.status.awaitingReview`: 'Очікує перевірки' / 'Awaiting review'
  - `assignments.status.overdue`: 'Прострочено' / 'Overdue'
  - `assignments.status.inProgress`: 'В процесі' / 'In progress'
  - `assignments.status.submitted`: 'Здано на перевірку' / 'Submitted for review'
- [ ] **Step 3: Update `getAssignmentStatusInfo` to return `labelKey`**
- [ ] **Step 4: Update `AssignmentCard.tsx` to use `formatMessage(statusInfo.labelKey)`**
- [ ] **Step 5: Run tests and verify they pass**
      Run: `pnpm --filter @universe/uni-hub test helpers.test.ts AssignmentCard.test.ts`
- [ ] **Step 6: Commit Task 1**
      `git commit -m "fix(uni-hub): localize assignment status labels"`

---

### Task 2: Opportunities Category Pill Styling (Screenshot 2)

**Files:**

- Modify: `packages/uni-hub/views/dashboard/tabs/OpportunityCard.module.scss:96-116`

**Interfaces:**

- Produces: Modernized `.categoryPill` styles matching `compensationPill` and design tokens (clean font size, normal casing, proper borders and rounded corners).

- [ ] **Step 1: Update `.categoryPill` in `OpportunityCard.module.scss`**
      Remove `text-transform: uppercase` and `letter-spacing: 0.04em`.
      Apply:
  ```scss
  .categoryPill {
    display: inline-flex;
    align-items: center;
    gap: var(--space-6);
    font-size: var(--font-xs);
    font-weight: 500;
    padding: 4px 10px;
    border-radius: 12px;
    border: 1px solid transparent;

    &.paidCategory {
      color: var(--success-color, #10b981);
      background: color-mix(in srgb, var(--success-color, #10b981) 12%, transparent);
      border-color: color-mix(in srgb, var(--success-color, #10b981) 25%, transparent);
    }

    &.unpaidCategory {
      color: var(--accent-primary);
      background: color-mix(in srgb, var(--accent-primary) 12%, transparent);
      border-color: color-mix(in srgb, var(--accent-primary) 25%, transparent);
    }
  }
  ```
- [ ] **Step 2: Run stylelint to verify SCSS**
      Run: `pnpm lint:style`
- [ ] **Step 3: Commit Task 2**
      `git commit -m "fix(uni-hub): modernize opportunities category pill styling"`

---

### Task 3: Remove Focus Outline on Grades Chart Click (Screenshot 3)

**Files:**

- Modify: `packages/ui/components/una/Chart/Chart.module.scss:38-66`
- Modify: `packages/ui/components/una/Chart/Chart.tsx:175-185`

**Interfaces:**

- Produces: Seamless chart interaction without harsh black rectangular focus frames when clicked or focused by mouse.

- [ ] **Step 1: Update `Chart.module.scss`**
      Ensure `.recharts-wrapper`, `.recharts-surface`, `.recharts-layer`, `svg`, `rect`, and `path` explicitly have `outline: none !important;` on `:focus` and `:focus-visible`.
- [ ] **Step 2: Update `Chart.tsx`**
      Add `activeBar={false}` to horizontal layout `<Bar>` (lines 177-183) to match vertical layout line 211 and prevent Recharts from drawing active focus rects.
- [ ] **Step 3: Run UI tests and storybook build**
      Run: `pnpm --filter @universe/ui test` and `pnpm --filter @universe/ui build-storybook`
- [ ] **Step 4: Commit Task 3**
      `git commit -m "fix(ui): remove focus outline artifact on chart click"`

---

### Task 4: Align and Balance OverviewTab Cards (Screenshot 4)

**Files:**

- Modify: `packages/uni-hub/components/assignments/AssignmentsDonut.tsx`
- Create: `packages/uni-hub/components/assignments/AssignmentsDonut.module.scss`
- Modify: `packages/uni-hub/components/dashboard/RecentGradesFeed.module.scss`
- Modify: `packages/uni-hub/views/DashboardPage.module.scss:591-600`

**Interfaces:**

- Produces: Equal-height, symmetrically styled cards for `RecentGradesFeed` and `AssignmentsDonut` in the overview grid with matching padding (`var(--space-24)`), radius (`16px`), background, shadow, and header typography.

- [ ] **Step 1: Create `AssignmentsDonut.module.scss` with matching panel container styling**
      Provide `.donutPanel` matching `.recentGradesPanel`:
  - `background: var(--bg-card);`
  - `backdrop-filter: var(--card-backdrop);`
  - `border: 1px solid var(--card-border);`
  - `border-radius: 16px;`
  - `padding: var(--space-24);`
  - `box-shadow: var(--card-shadow);`
  - `display: flex; flex-direction: column; gap: var(--space-16); height: 100%;`
  - Panel header matching `RecentGradesFeed` with `h3` (`display: flex; align-items: center; gap: var(--space-8); font-size: var(--font-lg);`) and a `<PieChart size={18} />` icon.
- [ ] **Step 2: Update `AssignmentsDonut.tsx` to render the panel wrapper and header**
      Remove duplicate title from inner `<Chart>` (or pass borderless/transparent class).
- [ ] **Step 3: Ensure `RecentGradesFeed.module.scss` has `height: 100%` and flex stretch**
- [ ] **Step 4: Verify visually and run lint/stylelint**
      Run: `pnpm lint && pnpm lint:style`
- [ ] **Step 5: Commit Task 4**
      `git commit -m "fix(uni-hub): balance and align overview dashboard cards"`

---

### Task 5: Replace Native Date Picker with Themed Component (Screenshot 5)

**Files:**

- Modify: `packages/ui/components/una/inputs/DateTimePicker/CustomDateTime.tsx`
- Modify: `packages/ui/components/una/inputs/DateTimePicker/DateTimePicker.types.ts`
- Modify: `packages/uni-hub/views/dashboard/tabs/AssignmentsTab.tsx:80-98`

**Interfaces:**

- Produces: `CustomDateTime` with `showTime?: boolean` (default true) and `locale?: string`.
- Consumes: `<CustomDateTime showTime={false} locale={localeTag} selected={...} onChange={...} />` in `AssignmentsTab.tsx`.

- [ ] **Step 1: Extend `CustomDateTimeProps` in `DateTimePicker.types.ts`**
      Add `showTime?: boolean;` and `locale?: string;`.
- [ ] **Step 2: Update `CustomDateTime.tsx`**
  - If `showTime === false`, omit `<div className={css.timeContainer}>`.
  - Use `Intl.DateTimeFormat` or localized month/weekday names when `locale` is provided.
  - Format date-only output when `showTime === false`.
- [ ] **Step 3: Replace native `<TextInput type="date" />` in `AssignmentsTab.tsx`**
      Use `<CustomDateTime showTime={false} locale={localeTag} ... />` with standard styling, eliminating the native Windows Chromium date picker with black borders.
- [ ] **Step 4: Run full verification suite**
      Run: `pnpm lint`, `pnpm lint:style`, `pnpm typecheck`, `pnpm test`.
- [ ] **Step 5: Commit Task 5**
      `git commit -m "fix(ui,uni-hub): replace native date input with custom styled date picker"`
