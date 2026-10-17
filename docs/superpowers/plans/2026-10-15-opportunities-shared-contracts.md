# Opportunities Shared Contracts Implementation Plan (PR 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Opportunity types, status constants and request contracts into `@universe/core` so the frontend, the backend DTOs and the Prisma schema share one description, with a test that fails when they drift apart.

**Architecture:** Core owns the contract: `constants/opportunities.ts` (const objects plus derived unions) and `types/opportunities.ts` (interfaces and `*Request` types). The frontend imports interfaces from `@core/types/opportunities` and unions from `@core/constants/opportunities`, and its local copies are deleted. Backend DTO classes `implement` the core request types, and one backend spec compares the Prisma enums with the core constants. Behavior does not change.

**Tech Stack:** TypeScript 6, NestJS 11 + class-validator, Prisma enums from `@universe/database`, Jest (backend), Vitest (uni-hub), `node --test` (core).

**Spec:** `docs/superpowers/specs/2026-10-15-opportunities-tanstack-query-design.md` (section "PR 1: shared contracts").

## Global Constraints

- Branch `refactor/opportunities-shared-contracts`, created from `develop` (already checked out, spec commit `4cd0c31` is on it). The PR targets `develop`.
- No TS `enum`: const object plus derived type (`docs/ai/quality.md`).
- No aliases, re-export shims or compatibility wrappers: update every call site and delete the old declarations (`docs/ai/code-style.md`).
- One `import` statement per module path; use the inline `type` modifier for mixed imports (`import { X, type Y } from '...'`).
- Core file layout: constants and types never share a file, except types derived from a constant; no barrel in `constants/`; `packages/core` forbids barrel files (`oxc/no-barrel-file`, threshold 0), so `types/opportunities.ts` is imported by its own path (`@core/types/opportunities`, `@universe/core/types/opportunities`) and is not re-exported from `types/index.ts`. Core uses `.ts` extensions in relative imports.
- Frontend imports core through `@core/*`, backend through `@universe/core/*`; never the package root.
- Explicit return types, descriptive names, empty line before `return` and between logical blocks.
- Do not write unit tests for types and constants themselves; the Prisma drift spec is the only new test.
- Commit messages follow Conventional Commits and end with the trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Before every commit show the user `git diff --stat` and the diff, and wait for approval (user preference). Do not push or open the PR without being asked.
- Every command below runs from the repo root `/Users/ReDL/Documents/Programming/Projects/uni-verse`.
- Verification pipeline before the PR: `pnpm lint`, `pnpm lint:style`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and prettier on changed files, all with zero errors and zero warnings.

## Review Focus

- A value is added to a Prisma enum (for example `OpportunityStatus`) but not to core, or the reverse: the drift spec must fail and name the enum (Task 2).
- `UpdateOpportunityDto extends PartialType(CreateOpportunityDto)` now also `implements UpdateOpportunityRequest`: it must compile and keep Swagger metadata (Task 2).
- A decorated DTO property typed with a core union under `isolatedModules` + `emitDecoratorMetadata` needs a type-only import, otherwise TS1272 (Task 2).
- A leftover import of an Opportunity name from `@uni-hub/types` after the block is deleted: `typecheck` must fail loudly, and a grep must find none (Task 3).
- Vitest in `uni-hub` resolves `@core/constants/opportunities` through its alias: `api.opportunities.test.ts` and `OpportunitiesSubTabs.test.ts` must still pass (Task 3).
- The backend runtime now imports `@universe/core/constants/opportunities` from `dist`: `pnpm build` (core is built first) must succeed (Task 4).

## File Structure

| File                                                                      | Responsibility                                                                                       |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `packages/core/constants/opportunities.ts` (create)                       | Status, lifecycle, payment type, application status and moderate action const objects plus unions    |
| `packages/core/types/opportunities.ts` (create)                           | `Opportunity`, `OpportunityApplication`, `OpportunityOwner`, request types, list params              |
| `packages/backend/opportunities/dto/*.dto.ts` (modify)                    | DTO classes implement the core request types; `ModerateOpportunityDto` uses the core moderate action |
| `packages/backend/opportunities/opportunities.service.ts` (modify)        | Use `OPPORTUNITY_MODERATE_ACTION`                                                                    |
| `packages/backend/opportunities/opportunities.contracts.spec.ts` (create) | Prisma enums must equal core constants                                                               |
| `packages/uni-hub/types.ts` (modify)                                      | Delete the Opportunity block                                                                         |
| `packages/uni-hub/services/api.opportunities.ts` (modify)                 | Import request types from core                                                                       |
| `packages/uni-hub/services/api.opportunities.test.ts` (modify)            | Renamed request types                                                                                |
| ~20 files under `packages/uni-hub/views/dashboard/tabs/` (modify)         | Import path changes, `ModerationAction` replaced                                                     |

---

### Task 1: Core constants and types

**Files:**

- Create: `packages/core/constants/opportunities.ts`
- Create: `packages/core/types/opportunities.ts`

**Interfaces:**

- Produces (constants): `OPPORTUNITY_STATUS`, `OPPORTUNITY_LIFECYCLE`, `OPPORTUNITY_PAYMENT_TYPE`, `OPPORTUNITY_APP_STATUS`, `OPPORTUNITY_MODERATE_ACTION` and the types `OpportunityStatus`, `OpportunityLifecycle`, `OpportunityPaymentType`, `OpportunityAppStatus`, `OpportunityModerateAction`.
- Produces (types): `OpportunityOwner`, `Opportunity`, `OpportunityApplication`, `CreateOpportunityRequest`, `UpdateOpportunityRequest`, `ApplyOpportunityRequest`, `GetOpportunitiesParams`.

- [ ] **Step 1: Create the constants file**

`packages/core/constants/opportunities.ts`:

```ts
export const OPPORTUNITY_STATUS = {
  DRAFT: 'DRAFT',
  READY_FOR_REVIEW: 'READY_FOR_REVIEW',
  REQUIRES_CHANGES: 'REQUIRES_CHANGES',
  PUBLISHED: 'PUBLISHED',
  REJECTED: 'REJECTED',
} as const;

export type OpportunityStatus = (typeof OPPORTUNITY_STATUS)[keyof typeof OPPORTUNITY_STATUS];

export const OPPORTUNITY_LIFECYCLE = {
  START: 'START',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type OpportunityLifecycle =
  (typeof OPPORTUNITY_LIFECYCLE)[keyof typeof OPPORTUNITY_LIFECYCLE];

export const OPPORTUNITY_PAYMENT_TYPE = {
  PAID: 'PAID',
  UNPAID: 'UNPAID',
} as const;

export type OpportunityPaymentType =
  (typeof OPPORTUNITY_PAYMENT_TYPE)[keyof typeof OPPORTUNITY_PAYMENT_TYPE];

export const OPPORTUNITY_APP_STATUS = {
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
} as const;

export type OpportunityAppStatus =
  (typeof OPPORTUNITY_APP_STATUS)[keyof typeof OPPORTUNITY_APP_STATUS];

export const OPPORTUNITY_MODERATE_ACTION = {
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  REQUIRE_CHANGES: 'REQUIRE_CHANGES',
} as const;

export type OpportunityModerateAction =
  (typeof OPPORTUNITY_MODERATE_ACTION)[keyof typeof OPPORTUNITY_MODERATE_ACTION];
```

- [ ] **Step 2: Create the types file**

`packages/core/types/opportunities.ts`:

```ts
import type {
  OpportunityAppStatus,
  OpportunityLifecycle,
  OpportunityPaymentType,
  OpportunityStatus,
} from '../constants/opportunities.ts';

export interface OpportunityOwner {
  id: string;
  name?: string | null;
  email: string;
}

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  ownerContactInfo: string;
  status: OpportunityStatus;
  lifecycleState: OpportunityLifecycle;
  acceptsApplications?: boolean;
  paymentType: OpportunityPaymentType;
  paymentDetails?: string | null;
  moderationComment?: string | null;
  ownerId: string;
  owner?: OpportunityOwner;
  createdAt: string;
  updatedAt: string;
  applications?: OpportunityApplication[];
}

export interface OpportunityApplication {
  id: string;
  applicantName: string;
  contactInfo: string;
  motivation?: string | null;
  briefDescription?: string | null;
  answers?: string | null;
  status: OpportunityAppStatus;
  ownerComment?: string | null;
  opportunityId: string;
  opportunity?: Opportunity;
  applicantId: string;
  applicant?: OpportunityOwner;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOpportunityRequest {
  title: string;
  description: string;
  ownerContactInfo: string;
  paymentType: OpportunityPaymentType;
  paymentDetails?: string | null;
  acceptsApplications?: boolean;
}

export type UpdateOpportunityRequest = Partial<CreateOpportunityRequest>;

export interface ApplyOpportunityRequest {
  applicantName: string;
  contactInfo: string;
  motivation?: string;
  briefDescription?: string;
  answers?: string;
}

export interface GetOpportunitiesParams {
  status?: OpportunityStatus;
  paymentType?: OpportunityPaymentType | '';
  ownerId?: string;
  search?: string;
}
```

- [ ] **Step 3: Verify core builds, typechecks and tests pass**

Run: `pnpm --filter @universe/core typecheck && pnpm --filter @universe/core build && pnpm --filter @universe/core test`
Expected: all three succeed; `packages/core/dist/constants/opportunities.js` and `packages/core/dist/types/opportunities.d.ts` exist.

- [ ] **Step 4: Commit** (after showing the diff and getting approval)

```bash
git add packages/core/constants/opportunities.ts packages/core/types/opportunities.ts
git commit -m "feat(core): add shared Opportunity constants and contracts"
```

---

### Task 2: Backend uses the core contracts and a drift spec guards them

**Files:**

- Create: `packages/backend/opportunities/opportunities.contracts.spec.ts`
- Modify: `packages/backend/opportunities/dto/create-opportunity.dto.ts`
- Modify: `packages/backend/opportunities/dto/update-opportunity.dto.ts`
- Modify: `packages/backend/opportunities/dto/apply-opportunity.dto.ts`
- Modify: `packages/backend/opportunities/dto/find-opportunities.dto.ts`
- Modify: `packages/backend/opportunities/dto/moderate-opportunity.dto.ts`
- Modify: `packages/backend/opportunities/opportunities.service.ts:10-27` and the three `ModerateAction` usages near line 463

**Interfaces:**

- Consumes: everything produced by Task 1.
- Produces: backend DTO classes with unchanged names and shapes; `ModerateAction` no longer exported from `./dto`.

- [ ] **Step 1: Write the drift spec**

`packages/backend/opportunities/opportunities.contracts.spec.ts`:

```ts
import {
  ApplicationStatus,
  OpportunityLifecycleState,
  OpportunityStatus,
  PaymentType,
} from '@universe/database';
import {
  OPPORTUNITY_APP_STATUS,
  OPPORTUNITY_LIFECYCLE,
  OPPORTUNITY_PAYMENT_TYPE,
  OPPORTUNITY_STATUS,
} from '@universe/core/constants/opportunities';

describe('opportunity contracts match the Prisma schema', () => {
  it.each([
    ['OpportunityStatus', OpportunityStatus, OPPORTUNITY_STATUS],
    ['OpportunityLifecycleState', OpportunityLifecycleState, OPPORTUNITY_LIFECYCLE],
    ['PaymentType', PaymentType, OPPORTUNITY_PAYMENT_TYPE],
    ['ApplicationStatus', ApplicationStatus, OPPORTUNITY_APP_STATUS],
  ])('%s has the same values as the core constant', (_enumName, prismaEnum, coreConstant) => {
    expect(Object.values(prismaEnum).sort()).toEqual(Object.values(coreConstant).sort());
  });
});
```

- [ ] **Step 2: Run it and make sure it passes**

Run: `pnpm --filter @universe/backend test -- opportunities.contracts`
Expected: 4 tests PASS (the core constants from Task 1 already match the schema).

- [ ] **Step 3: Prove the spec can fail**

Temporarily delete the line `WITHDRAWN: 'WITHDRAWN',` from `OPPORTUNITY_APP_STATUS` in `packages/core/constants/opportunities.ts` and run the command from Step 2.
Expected: the `ApplicationStatus` case FAILS showing `WITHDRAWN` as the difference. Restore the line and run again; Expected: PASS.

- [ ] **Step 4: Make the DTO classes implement the core request types**

`packages/backend/opportunities/dto/create-opportunity.dto.ts`: add the import after the `@universe/database` import and change the class line.

```ts
import type { CreateOpportunityRequest } from '@universe/core/types/opportunities';
```

```ts
export class CreateOpportunityDto implements CreateOpportunityRequest {
```

`packages/backend/opportunities/dto/update-opportunity.dto.ts` becomes:

```ts
import { PartialType } from '@nestjs/swagger';
import type { UpdateOpportunityRequest } from '@universe/core/types/opportunities';
import { CreateOpportunityDto } from './create-opportunity.dto';

export class UpdateOpportunityDto
  extends PartialType(CreateOpportunityDto)
  implements UpdateOpportunityRequest {}
```

`packages/backend/opportunities/dto/apply-opportunity.dto.ts`: add `import type { ApplyOpportunityRequest } from '@universe/core/types/opportunities';` and change the class line to `export class ApplyOpportunityDto implements ApplyOpportunityRequest {`.

`packages/backend/opportunities/dto/find-opportunities.dto.ts`: add `import type { GetOpportunitiesParams } from '@universe/core/types/opportunities';` and change the class line to `export class FindOpportunitiesDto implements GetOpportunitiesParams {`.

- [ ] **Step 5: Move the moderate action to core**

Replace `packages/backend/opportunities/dto/moderate-opportunity.dto.ts` with:

```ts
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  OPPORTUNITY_MODERATE_ACTION,
  type OpportunityModerateAction,
} from '@universe/core/constants/opportunities';

export class ModerateOpportunityDto {
  @ApiProperty({ enum: OPPORTUNITY_MODERATE_ACTION })
  @IsEnum(OPPORTUNITY_MODERATE_ACTION)
  action: OpportunityModerateAction;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  comment?: string;
}
```

In `packages/backend/opportunities/opportunities.service.ts` remove `ModerateAction,` from the `./dto` import list, add a new import line below the `@universe/database` import:

```ts
import { OPPORTUNITY_MODERATE_ACTION } from '@universe/core/constants/opportunities';
```

and replace the three usages (`ModerateAction.APPROVE`, `ModerateAction.REJECT`, `ModerateAction.REQUIRE_CHANGES`) with `OPPORTUNITY_MODERATE_ACTION.APPROVE`, `.REJECT`, `.REQUIRE_CHANGES`.

- [ ] **Step 6: Check nothing else used the removed export**

Run: `grep -rn "ModerateAction" packages/backend --include='*.ts' --exclude-dir=node_modules --exclude-dir=dist`
Expected: no output.

- [ ] **Step 7: Typecheck and run the opportunities specs**

Run: `pnpm --filter @universe/core build && pnpm --filter @universe/backend typecheck && pnpm --filter @universe/backend test -- opportunities`
Expected: typecheck clean (no TS1272 on `moderate-opportunity.dto.ts`), all opportunities specs PASS.

- [ ] **Step 8: Commit** (after diff approval)

```bash
git add packages/backend/opportunities
git commit -m "refactor(backend): implement shared Opportunity contracts in DTOs"
```

---

### Task 3: Frontend imports the core contracts

**Files:**

- Modify: `packages/uni-hub/types.ts` (delete lines 118 to the end)
- Modify: `packages/uni-hub/services/api.opportunities.ts` (full replacement below)
- Modify: `packages/uni-hub/services/api.opportunities.test.ts`
- Modify: the import lines listed in Step 3
- Modify: `packages/uni-hub/views/dashboard/tabs/opportunities/types.ts` (drop `ModerationAction`)

**Interfaces:**

- Consumes: Task 1 exports.
- Produces: no new names; `@uni-hub/types` no longer exports any `Opportunity*` name.

- [ ] **Step 1: Delete the Opportunity block from `types.ts`**

Run: `sed -n '116,119p' packages/uni-hub/types.ts`
Expected: line 117 is `}`, line 118 is empty, line 119 is `export type OpportunityStatus =`.
Then run: `sed -i '' '118,$d' packages/uni-hub/types.ts && tail -3 packages/uni-hub/types.ts`
Expected: the file now ends with the `}` that closes `CourseSection`.

- [ ] **Step 2: Replace `api.opportunities.ts`**

Write `packages/uni-hub/services/api.opportunities.ts` with:

```ts
import type {
  ApplyOpportunityRequest,
  CreateOpportunityRequest,
  GetOpportunitiesParams,
  Opportunity,
  OpportunityApplication,
  UpdateOpportunityRequest,
} from '@core/types/opportunities';
import type {
  OpportunityAppStatus,
  OpportunityLifecycle,
  OpportunityModerateAction,
} from '@core/constants/opportunities';
import { request, buildQueryString } from './api.request';

export class OpportunitiesApi {
  async getOpportunities(params?: GetOpportunitiesParams): Promise<{ data: Opportunity[] }> {
    const query = buildQueryString(params as Record<string, unknown>);

    return request<Opportunity[]>(`/opportunities${query}`);
  }

  async getOpportunity(id: string): Promise<{ data: Opportunity }> {
    return request<Opportunity>(`/opportunities/${id}`);
  }

  async createOpportunity(dto: CreateOpportunityRequest): Promise<{ data: Opportunity }> {
    return request<Opportunity>('/opportunities', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async updateOpportunity(
    id: string,
    dto: UpdateOpportunityRequest,
  ): Promise<{ data: Opportunity }> {
    return request<Opportunity>(`/opportunities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  }

  async changeStatus(id: string, status: 'READY_FOR_REVIEW'): Promise<{ data: Opportunity }> {
    return request<Opportunity>(`/opportunities/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  }

  async changeLifecycle(
    id: string,
    lifecycleState: OpportunityLifecycle,
  ): Promise<{ data: Opportunity }> {
    return request<Opportunity>(`/opportunities/${id}/lifecycle`, {
      method: 'PUT',
      body: JSON.stringify({ lifecycleState }),
    });
  }

  async getMyOpportunities(): Promise<{ data: Opportunity[] }> {
    return request<Opportunity[]>('/opportunities/my');
  }

  async getOpportunityApplications(id: string): Promise<{ data: OpportunityApplication[] }> {
    return request<OpportunityApplication[]>(`/opportunities/${id}/applications`);
  }

  async updateApplicationStatus(
    appId: string,
    status: OpportunityAppStatus,
    comment?: string,
  ): Promise<{ data: OpportunityApplication }> {
    return request<OpportunityApplication>(`/opportunities/applications/${appId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, comment }),
    });
  }

  async apply(id: string, dto: ApplyOpportunityRequest): Promise<{ data: OpportunityApplication }> {
    return request<OpportunityApplication>(`/opportunities/${id}/apply`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async getMyApplications(): Promise<{ data: OpportunityApplication[] }> {
    return request<OpportunityApplication[]>('/opportunities/my/applications');
  }

  async withdrawApplication(appId: string): Promise<{ data: OpportunityApplication }> {
    return request<OpportunityApplication>(`/opportunities/my/applications/${appId}/withdraw`, {
      method: 'PUT',
    });
  }

  async moderate(
    id: string,
    action: OpportunityModerateAction,
    comment?: string,
  ): Promise<{ data: Opportunity }> {
    return request<Opportunity>(`/opportunities/${id}/moderate`, {
      method: 'POST',
      body: JSON.stringify({ action, comment }),
    });
  }
}

export const opportunitiesApi = new OpportunitiesApi();
```

Then rename the request types in the test:

Run: `sed -i '' 's/CreateOpportunityDto/CreateOpportunityRequest/g; s/UpdateOpportunityDto/UpdateOpportunityRequest/g; s/ApplyOpportunityDto/ApplyOpportunityRequest/g' packages/uni-hub/services/api.opportunities.test.ts`

and replace the type import at the top of that test (the `import type { CreateOpportunityRequest, UpdateOpportunityRequest, ApplyOpportunityRequest } from './api.opportunities';` block) with:

```ts
import type {
  ApplyOpportunityRequest,
  CreateOpportunityRequest,
  UpdateOpportunityRequest,
} from '@core/types/opportunities';
```

- [ ] **Step 3: Update the imports in the tab files**

Interfaces come from `@core/types/opportunities`, unions from `@core/constants/opportunities`. If a file needs both, it gets two import lines (different modules). Paths below are relative to `packages/uni-hub/views/dashboard/tabs/`.

| File                                              | Old import (from `'@uni-hub/types'`)                          | New import(s)                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OpportunityCard.tsx`                             | `Opportunity`                                                 | `import type { Opportunity } from '@core/types/opportunities';`                                                                                                                                                                                                                                                                                                                                     |
| `OpportunityCard.test.ts`                         | `Opportunity`                                                 | `import type { Opportunity } from '@core/types/opportunities';`                                                                                                                                                                                                                                                                                                                                     |
| `opportunities/OpportunitiesSubTabs.test.ts`      | `Opportunity, OpportunityApplication`                         | `import type { Opportunity, OpportunityApplication } from '@core/types/opportunities';`                                                                                                                                                                                                                                                                                                             |
| `opportunities/ApplicationStatusBadge.tsx`        | `OpportunityAppStatus`                                        | `import type { OpportunityAppStatus } from '@core/constants/opportunities';`                                                                                                                                                                                                                                                                                                                        |
| `opportunities/OpportunityStatusBadge.tsx`        | `OpportunityStatus`                                           | `import type { OpportunityStatus } from '@core/constants/opportunities';`                                                                                                                                                                                                                                                                                                                           |
| `opportunities/types.ts`                          | `OpportunityPaymentType`                                      | `import type { OpportunityPaymentType } from '@core/constants/opportunities';`                                                                                                                                                                                                                                                                                                                      |
| `opportunities/CatalogTab.tsx`                    | `Opportunity, OpportunityPaymentType`                         | `import type { Opportunity } from '@core/types/opportunities';` and `import type { OpportunityPaymentType } from '@core/constants/opportunities';`                                                                                                                                                                                                                                                  |
| `opportunities/MyApplicationsTab.tsx`             | `OpportunityApplication`                                      | `import type { OpportunityApplication } from '@core/types/opportunities';`                                                                                                                                                                                                                                                                                                                          |
| `opportunities/MyOpportunitiesTab.tsx`            | `Opportunity`                                                 | `import type { Opportunity } from '@core/types/opportunities';`                                                                                                                                                                                                                                                                                                                                     |
| `opportunities/useOpportunityDetail.ts`           | `Opportunity, OpportunityLifecycle`                           | `import type { Opportunity } from '@core/types/opportunities';` and `import type { OpportunityLifecycle } from '@core/constants/opportunities';`                                                                                                                                                                                                                                                    |
| `opportunities/useApplicantActions.ts`            | `Opportunity, OpportunityApplication`                         | `import type { Opportunity, OpportunityApplication } from '@core/types/opportunities';`                                                                                                                                                                                                                                                                                                             |
| `opportunities/useCreateOpportunity.ts`           | `Opportunity`                                                 | `import type { Opportunity } from '@core/types/opportunities';`                                                                                                                                                                                                                                                                                                                                     |
| `opportunities/modals/ApplicantsModal.tsx`        | `OpportunityApplication, OpportunityAppStatus`                | `import type { OpportunityApplication } from '@core/types/opportunities';` and `import type { OpportunityAppStatus } from '@core/constants/opportunities';`                                                                                                                                                                                                                                         |
| `opportunities/modals/OpportunityDetailModal.tsx` | `Opportunity, OpportunityLifecycle`                           | `import type { Opportunity } from '@core/types/opportunities';` and `import type { OpportunityLifecycle } from '@core/constants/opportunities';`                                                                                                                                                                                                                                                    |
| `opportunities/useApplicants.ts`                  | `Opportunity, OpportunityApplication, OpportunityAppStatus`   | `import type { Opportunity, OpportunityApplication } from '@core/types/opportunities';` and `import type { OpportunityAppStatus } from '@core/constants/opportunities';`                                                                                                                                                                                                                            |
| `opportunities/useOpportunitiesData.ts`           | `Opportunity, OpportunityApplication, OpportunityPaymentType` | `import type { Opportunity, OpportunityApplication } from '@core/types/opportunities';` and `import type { OpportunityPaymentType } from '@core/constants/opportunities';`                                                                                                                                                                                                                          |
| `opportunities/ModerationQueueTab.tsx`            | `Opportunity` (plus `ModerationAction` from `./types`)        | `import type { Opportunity } from '@core/types/opportunities';` and `import type { OpportunityModerateAction } from '@core/constants/opportunities';`; the `onModerate` prop uses `OpportunityModerateAction`; delete the `import type { ModerationAction } from './types';` line                                                                                                                   |
| `opportunities/useModeration.ts`                  | `Opportunity` (plus `ModerationAction` from `./types`)        | `import type { Opportunity } from '@core/types/opportunities';` and `import type { OpportunityModerateAction } from '@core/constants/opportunities';`; change `import type { ModerationAction, RejectModalState } from './types';` to `import type { RejectModalState } from './types';`; replace `ModerationAction` with `OpportunityModerateAction` in `handleModerate` and `handleRejectConfirm` |

Also delete the last line of `opportunities/types.ts`, `export type ModerationAction = 'APPROVE' | 'REJECT' | 'REQUIRE_CHANGES';`.

- [ ] **Step 4: Find anything the table missed**

Run: `grep -rn "Opportunity" packages --include='*.ts' --include='*.tsx' --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist | grep "@uni-hub/types"`
Expected: no output.
Run: `grep -rn "ModerationAction" packages/uni-hub --include='*.ts' --include='*.tsx' --exclude-dir=node_modules --exclude-dir=.next`
Expected: no output.

- [ ] **Step 5: Typecheck and test the frontend**

Run: `pnpm --filter @universe/uni-hub typecheck && pnpm --filter @universe/uni-hub test`
Expected: typecheck clean; vitest PASS including `api.opportunities.test.ts`, `OpportunityCard.test.ts` and `OpportunitiesSubTabs.test.ts`.

- [ ] **Step 6: Commit** (after diff approval)

```bash
git add packages/uni-hub
git commit -m "refactor(uni-hub): import Opportunity contracts from @universe/core"
```

---

### Task 4: Full verification and handoff

**Files:** none (verification only; fix anything the checks flag).

- [ ] **Step 1: Run the full pipeline**

```bash
pnpm lint
pnpm lint:style
pnpm typecheck
pnpm test
pnpm build
git diff --name-only develop...HEAD | xargs pnpm exec prettier --check
```

Expected: every command exits 0 with zero warnings. If prettier reports files, run `pnpm exec prettier --write` on them and amend into a `style:` commit after approval.

- [ ] **Step 2: Walk the pre-commit checklist**

Open `docs/ai/workflow.md#pre-commit-checklist` and confirm each line (no aliases left, no unused exports, Opportunity declarations exist only in core).
Run: `grep -rn "export type Opportunity\|export interface Opportunity" packages --include='*.ts' --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.next`
Expected: matches only in `packages/core/constants/opportunities.ts` and `packages/core/types/opportunities.ts`.

- [ ] **Step 3: Report to the user**

Summarize the diff and the pipeline results. Mention for the PR description: `api.opportunities.ts` still calls the free `request` function; the `ApiClient` migration from `docs/ai/api-and-config.md` is deliberately left out of this stack. Ask before pushing the branch and opening the PR against `develop`.
