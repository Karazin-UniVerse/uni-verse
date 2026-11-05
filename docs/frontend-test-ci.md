# Frontend test CI assessment (RS-238)

## Evidence and scope

The baseline workflow runs `@universe/ui` and `@universe/uni-hub` tests sequentially
inside `quality`. Step timings from three successful runs on 2026-11-04:

| Run                                                                                   | PR   | Frontend tests | Entire quality job |
| ------------------------------------------------------------------------------------- | ---- | -------------- | ------------------ |
| [41935839987](https://github.com/Karazin-UniVerse/uni-verse/actions/runs/41935839987) | #338 | 60 s           | 299 s              |
| [41928421807](https://github.com/Karazin-UniVerse/uni-verse/actions/runs/41928421807) | #338 | 83 s           | 376 s              |
| [41926515272](https://github.com/Karazin-UniVerse/uni-verse/actions/runs/41926515272) | #303 | 81 s           | 364 s              |

These are Actions job/step metadata, not downloaded logs. Full baseline logs
required GitHub sign-in and could not be retrieved with the available credentials.
The public annotations on the first run reported two warnings: deprecated
`sonarcloud-github-action` and its transitive Node.js 20 `actions/cache@v4`.
An Ubuntu runner-image migration notice is informational, not a test failure.

## Kept changes

### Keep global test setup lightweight

Import-duration profiling of `utils/arrays.test.ts` found this eager chain:

`vitest.setup.ts → utils/test-utils.ts → @una → Chart → recharts`.

The setup only needed feature-flag cleanup, but imported all provider helpers for
every isolated test file. In one diagnostic run, `test-utils.ts` took 794 ms total,
including 406 ms evaluating Recharts. `resetTestFeatureFlags` now lives in
`utils/test-feature-flags.ts`, depending only on core feature constants and the
browser check. All callers use that path directly; there is no compatibility
re-export. DOM cleanup, flag reset, storage cleanup, file isolation, and test
selection are preserved.

The same small diagnostic dropped from 1.79 s to 0.96 s; setup's import total went
from 1.11 s to 287 ms. This single-file result establishes the import mechanism,
not a CI speed guarantee.

For a full-suite comparison, six alternating local runs used Node.js 24.20.0,
Vitest 5.0.5, Windows, `CI=true`, and the same 117 files / 901 tests. Both variants
used the default isolated forks pool and warm module caches. The baseline variant
loaded the revised setup plus the original eager `test-utils` import; the revised
variant used only the lightweight setup. Temporary benchmark files were removed.

| Pair              | Eager setup | Lightweight setup |
| ----------------- | ----------- | ----------------- |
| 1                 | 47.757 s    | 42.202 s          |
| 2 (revised first) | 54.907 s    | 43.483 s          |
| 3                 | 44.126 s    | 42.343 s          |
| Median            | 47.757 s    | 42.343 s          |

All six runs passed. The median improvement was 5.414 s (11.3%); each pair favored
the lightweight setup, but the small sample, local machine load, warm caches and
different runner OS limit the result. The new PR's Actions run is still needed to
measure the actual CI effect; do not present these local numbers as Actions data.

To inspect the import chain locally:

```sh
pnpm --filter @universe/uni-hub test utils/arrays.test.ts --experimental.importDurations.print
pnpm --filter @universe/ui test
pnpm --filter @universe/uni-hub test
```

### Exercise real chart rendering and expected error reporting

Repeated baseline runs twice exposed four Chart failures: the suite asserted a
mock-only `responsive-container` test ID while the real Recharts container was
rendered with zero Happy-DOM dimensions. The module-mock inconsistency's underlying
cause was not established. Instead of relying on that mock, the tests now provide
the missing layout measurement at the browser boundary and assert the real chart's
accessible role, labels and height. All seven existing cases remain.

The dashboard error-handler tests emitted three expected error stack traces.
They now capture `console.error` only within that suite and assert the exact error
and call count, including no extra reporting on repeated timestamps. Other test
console output remains visible; no global console filter or unhandled-error
suppression was added.

### Replace the deprecated scanner action

CI uses `SonarSource/sonarqube-scan-action` v8.4.1 pinned to its release commit.
Its metadata uses Node.js 24 rather than the retired composite wrapper and its
Node.js 20 cache action. Existing credentials, scanner conditions, coverage paths
and analysis settings are unchanged. Binary signature verification remains enabled.
The scan itself requires a real Actions run and Sonar credentials; local checks
do not prove it succeeds.

## Attempts not adopted and remaining warnings

- **Threads pool:** two completed sequential frontend samples were 62.965 / 57.205 s
  with forks and 68.239 / 57.611 s with threads. A third forks sample hit the Chart
  failures above. There was no reliable win; no pool switch was retained.
- **Parallel packages / sharding:** not measured or introduced. Sharing a runner
  can add CPU contention; more jobs add setup and maintenance cost.
- **Isolation and checks:** no `isolate: false`, skipped tests, reduced assertions,
  coverage reductions, retries masking failures, or relaxed Lighthouse budgets.
- **Unrelated baseline output:** package verification also exposed Turbo missing
  output warnings, backend VM-module warnings/expected error logs, and Storybook
  missing-MDX, large-chunk and module-directive warnings. They are not fixed or
  silenced by this scoped frontend-test change; report them with verification
  results rather than claiming the repository is warning-free.

## References

- [Vitest performance profiling](https://vitest.dev/guide/profiling-test-performance)
- [Recharts 3.10.1 test considerations](https://github.com/recharts/recharts/blob/v3.10.1/test/README.md)
- [Deprecated SonarCloud action](https://github.com/SonarSource/sonarcloud-github-action/blob/v5/action.yml)
- [Pinned scanner action](https://github.com/SonarSource/sonarqube-scan-action/blob/e805d875275f728fac1885b413934be6d7c63f65/action.yml)
