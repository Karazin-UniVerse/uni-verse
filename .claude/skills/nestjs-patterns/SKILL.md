---
name: nestjs-patterns
description: Use when adding or changing a NestJS module, controller, service, DTO, guard or backend test in packages/backend of the UniVerse monorepo, or when reviewing such code. Covers the module layout, DTO validation, auth guard, error handling and testing conventions of the backend. Triggers on "add an endpoint", "new Nest module", "DTO validation", "додай ендпоінт", "новий модуль NestJS", "добавь эндпоинт", "новый модуль NestJS".
---

# NestJS patterns for `packages/backend`

Conventions for the UniVerse NestJS gateway. The architecture rules (thin controllers, logic in services, Prisma through DI) live in [architecture](../../../docs/ai/architecture.md#backend-nestjs); this skill adds the practical patterns on top. Where the two disagree, the repository docs win.

Adapted from the `nestjs-patterns` skill of [everything-claude-code](https://github.com/affaan-m/everything-claude-code) (MIT, Copyright (c) 2026 Affaan Mustafa), trimmed to what applies here. The "Mistakes that pass tests" section and the global guard note under Testing are adapted from the official [nestjs/agent-skills](https://github.com/nestjs/agent-skills) (MIT, Copyright (c) 2026-present Kamil Mysliwiec).

## Module layout

Feature modules sit at the root of `packages/backend` (`auth/`, `moodle/`, `notifications/`, `opportunities/`, `user/`, `prisma/`), not under `src/modules/`. Copy the shape of `opportunities/`:

```text
opportunities/
├── dto/                         one DTO class per file
├── opportunities.controller.ts
├── opportunities.service.ts
├── opportunities.module.ts
└── *.spec.ts                    next to the code it tests
```

- Helper functions go to `<module>.helpers.ts`, never into a DTO file ([code-style](../../../docs/ai/code-style.md#reuse-before-writing-dry)).
- Export from a module only the providers another module really injects.
- `PrismaModule` is global: inject `PrismaService` directly, do not import the module again.

## Controllers

- A controller parses the request, calls one service method and returns its result. Business checks, multi-step writes and Prisma calls belong in the service.
- Document every endpoint with `@ApiTags`, `@ApiOperation` and, for protected routes, `@ApiBearerAuth`, as the `opportunities`, `auth` and `moodle` controllers do (`user.controller.ts` does not yet).
- Read the caller through the `@GetUser('sub')` decorator instead of `@Req()`.

## Auth

`AtGuard` is registered globally through `APP_GUARD`, so every route requires a valid access token by default. Open a route deliberately with `@Public()` and say why in the PR. A `@Public()` route still validates a token when one is sent, and ignores an invalid one, so `@GetUser(...)` values can be `undefined` there: type them as optional and handle the anonymous caller. Resource-level checks (does this user own this record) go in the service, because a guard cannot see the loaded entity.

## DTOs and validation

- Validate input with `class-validator` and describe it with `@nestjs/swagger` (`@ApiProperty`, `@ApiPropertyOptional`), as in `opportunities/dto/`.
- Import enums from `@universe/database`; import contracts shared with the frontend from `@universe/core/types` instead of redeclaring them.
- `main.ts` registers one global `ValidationPipe({ whitelist: true, transform: true })`. Unknown fields are stripped silently, not rejected. Do not repeat the pipe per route and do not change the global options inside an unrelated PR.
- For new code, return a response type from `@universe/core/types` or a mapped object, not a raw Prisma entity, so internal columns cannot leak. Existing `opportunities` endpoints return Prisma entities; mention that in the PR description instead of rewriting them.

## Errors

- Throw the matching Nest exception (`NotFoundException`, `ConflictException`, `BadRequestException`, `ForbiddenException`). There is no global exception filter and no custom error envelope; do not introduce one inside a single module.
- Translate Prisma errors in the service, never in the controller, and never forward the raw Prisma message to the client. Read the error code with `getPrismaErrorCode` from `utils/prisma-error.ts` (see the `prisma-patterns` skill) instead of writing another `'code' in error` check.

## Mistakes that pass tests

- **`import type` on an injected class.** Dependency injection reads constructor parameter types at run time; a type-only import erases them and the app stops at startup with `Nest can't resolve dependencies of X (?)`. Unit tests that build the class with mocks still pass. The opposite holds for plain types in decorated signatures (`Request` from express): with `isolatedModules`, which `packages/backend` enables, TypeScript requires `import type` there (TS1272).
- **`@Post()` answers 201.** A POST that creates nothing (sign-in, refresh, actions, searches) needs `@HttpCode(HttpStatus.OK)` or the code it means, as `auth.controller.ts` does.
- **`@IsOptional()` lets `null` through.** class-validator skips every rule for `null`, so `{ "title": null }` reaches Prisma and fails with a 500. For "may be left out, but not null", use `@ValidateIf((_, value) => value !== undefined)` instead, as `opportunities/dto/` does.

## Configuration

`ConfigModule.forRoot()` loads the environment without a schema. `PrismaService` deliberately keeps the app running when the database is unreachable, so Swagger and the Moodle proxy stay available; keep that behaviour. Its hardcoded fallback connection string breaks the no-fallback-defaults rule in [config and environment](../../../docs/ai/api-and-config.md): do not copy that pattern, and mention it in the PR description if you touch the file. A new environment variable follows the same document.

## Testing

- Jest, with `*.spec.ts` next to the code; [Grip](../../../docs/grip.md#automated-verification) uses a module-local test directory. Mock `PrismaService` and neighbouring services in unit tests, and assert the exception type, not only that something threw.
- `AtGuard` is registered as `{ provide: APP_GUARD, useClass: AtGuard }`, and neither `.overrideGuard(AtGuard)` nor `.overrideProvider(AtGuard)` replaces a guard registered that way. Keep the real guard in the testing module, as `grip/tests/grip-http.spec.ts` does, and for a protected route sign a test token with the `AT_SECRET` the test sets; do not change `app.module.ts` only to make a guard mockable.
- End-to-end specs (`*.e2e-spec.ts`) live in `packages/backend/test/`. Build the app with the same `ValidationPipe` options as `main.ts`; a test that skips them passes payloads production would reject.
- Run unit tests with `pnpm --filter @universe/backend test` and e2e specs with `pnpm --filter @universe/backend test:e2e`. The unit command does not pick up `*.e2e-spec.ts`, and CI runs only `test:cov`, so an e2e spec is not a CI gate. Jest has no coverage threshold; SonarCloud reports coverage of new code, so cover new branches with unit tests.
