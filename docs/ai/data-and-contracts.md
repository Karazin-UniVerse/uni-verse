# Data and Contracts: TanStack Query and Shared API Types

Applies when reading or writing API data in the UI, or when adding or changing a type, constant or DTO that the frontend and the backend share.

## Server state (TanStack Query)

Data that comes from `services/api.*` is server state: read it with `useQuery` and write it with `useMutation` (`@tanstack/react-query`). Do not copy it into `useState`, fetch it in `useEffect`, or write your own `loading`, `refetch` or "latest request" helpers.

- **Layout.** Next to the feature keep `queryKeys.ts` (a key factory whose every key starts with the feature's root key), `queries.ts` (loader functions and `queryOptions` objects; loaders let errors propagate) and `cache.ts` (plain functions that take a `QueryClient`: invalidate, optimistic update, rollback). When several features share the data (Moodle courses, assignments, dashboard), use `packages/uni-hub/queries/<domain>/` instead. The reference implementation is `views/dashboard/tabs/opportunities/`.
- **Mutations.** `onSuccess` returns the invalidation of the feature's root key, so `mutateAsync` settles once the active lists are fresh. For an optimistic update cancel the running queries of the affected key (`queryClient.cancelQueries({ queryKey })`), snapshot the cache in `onMutate`, write the optimistic value and restore it in `onError`; restore and invalidate only for the last pending mutation (`queryClient.isMutating({ mutationKey }) <= 1`: it returns a number, and the mutation that is settling is still counted), otherwise the response to an earlier request can bring a removed item back.
- **Loading and errors.** `isLoading` drives the first-load spinner; a refetch never shows it. When a load fails and nothing is cached, show an error state with a retry button; when a background refetch fails, keep showing the cached data. Never turn a failed request into an empty list.
- **Client.** One `QueryClient` is created in `app/providers.tsx` with `staleTime` `QUERY_STALE_TIME_MS` and `retry: false`, because `request()` already retries twice. Enable a query only while its view is active (`enabled`).
- **Session.** Cache entries are not scoped to a user, so the client is cleared (`queryClient.clear()`) whenever a session ends through `endSession` (logout, a 401 handled by the dashboard) and on every successful login, so one user never sees the previous user's data. Unlinking an external integration (Moodle) keeps the session and removes only that integration's queries.
- **Tests.** `uni-hub` tests run in the vitest `node` environment without jsdom. Keep behavior in plain functions (loaders, `cache.ts`) and test them with a real `QueryClient`; test rendering with `renderToString`.

## Shared API contracts

- Domain contracts that more than one package uses live in `packages/core/types/<domain>.ts` and are imported by path (`@core/types/opportunities`, `@universe/core/types/opportunities`). `packages/core` forbids barrel files (`oxc/no-barrel-file`), so do not re-export a domain file from `types/index.ts`.
- Closed sets of values (statuses, actions, payment types) are const objects with a derived type in `constants/<domain>.ts`: never a TS `enum`, never a union repeated in several packages.
- Backend DTO classes `implements` the core request and response types. A value set that mirrors a Prisma enum gets a contract spec (`<module>.contracts.spec.ts`) that compares the Prisma values with the core constant.
- The frontend never redeclares an API shape in `packages/uni-hub/types.ts`; it imports the core type.
