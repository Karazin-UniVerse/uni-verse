# API Clients, Constants and Configuration

Applies when writing or changing HTTP clients, shared constants and magic values, or environment configuration.

## API clients

HTTP access is class-based so that transport settings and dependencies live in one place.

- **Frontend (`packages/uni-hub/services/`)**: one class per backend domain (`AuthApi`, `MoodleApi`), in `api.<domain>.ts`, exported as one shared instance (`export const authApi = new AuthApi()`). Components and hooks call methods on the instance; they never call `fetch` or a raw `request` function.
- Shared transport (base URL, auth header, timeout, retries, error mapping) belongs in a single `ApiClient` base class that the domain classes extend, with a protected `request<T>()` method. `ApiClient` does not exist yet: today `AuthApi` and `MoodleApi` call the free function `request` from `api.request.ts`. Create `ApiClient` in the first PR that changes `api.request.ts` or a domain client, and move `request` into it. Do not copy transport logic into a domain class.
- **Backend**: one injectable client service per external system (Moodle: `MoodleClientService`). Other services depend on it through DI and never call `fetch` directly.
- Pure functions stay functions: query-string building, message mapping and other stateless helpers are not wrapped in a class. Put them where [shared code lives](code-style.md#reuse-before-writing-dry), or make them `private` members of the client when only it uses them.
- Migration of existing code: see the working agreements in [AGENTS.md](../../AGENTS.md).

## No magic values

Never put bare numbers or domain strings into logic: HTTP status codes, grade thresholds, filter names, storage keys, timeouts. Declare a const object with a derived type once, in `@universe/core/constants` when more than one package can use it ([where shared code lives](code-style.md#reuse-before-writing-dry)), and import it. Do not use TS `enum`; see [quality](quality.md#nodejs-22-type-stripping).

```typescript
// ❌ if (response.status === 401)
// ✅ if (response.status === RESPONSE_CODES.UNAUTHORIZED)
export const RESPONSE_CODES = { UNAUTHORIZED: 401 } as const;
export type ResponseCode = (typeof RESPONSE_CODES)[keyof typeof RESPONSE_CODES];
```

## Config and environment

- `.env.example` is the single source of truth for environment variables. A new variable is added there in the same PR; developers copy it to `.env`.
- Code reads configuration from `process.env` and does not carry fallback defaults for values that `.env.example` or the server always provides. Never hardcode URLs or hosts.
- Do not duplicate `.env` files or entries in `.gitignore`, `tsconfig` paths or `package.json`; search for an existing entry first. A workspace alias is declared once (`workspace:*` in `package.json`, one path in `tsconfig.json`).
- Secrets are never committed. In README or docs write "ask the Project coordinator" for private values.
