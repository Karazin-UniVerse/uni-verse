# Hosted Grip local verification ledger (not for commit)

Scope: approved hosted whiteboard on `feature/grip-hosted-whiteboard`, stacked on
PR #339. Spec/plan and this ledger stay local at the user's explicit request.

## Evidence gathered 2026-11-06

- Core build: exit 0; core tests included in full workspace test.
- Workspace typecheck `pnpm typecheck --force`: exit 0, existing missing-output
  Turbo warnings for UI/database placeholder build scripts.
- Workspace tests `pnpm test --force`: exit 0; UI 329, backend 782, uni-hub 921
  at that revision plus core suite. Expected backend error logs, VM experiment
  warnings and existing Turbo missing-output warnings. Later logout/check-change
  UI tests have a separate focused run (11 passed); full rerun still needed.
- `pnpm build --force`: exit 0, backend/Next production output generated; existing
  Turbo missing-output warnings. Later edits need fresh final evidence.
- `pnpm lint`: latest exit 0. `pnpm lint:style`: latest exit 0.
- `pnpm test:grip`: latest 58 passed, no skipped tests. Includes real Git object
  extraction and hosted HTTP fixture; does not prove live provider defense.
- Backend hosted suite: 11 suites / 71 passed before final review fixes.
- Backend coverage: 77 suites / 782 passed; 88.84% lines, 84.58% branches.
  Dedicated PostgreSQL tests do not contribute to ordinary Jest coverage.
- Two-client disposable PostgreSQL: 8 passed after restarting our task container.
  Prior repeat failed because Docker daemon/container stopped during restart;
  no production database used. Container `universe-grip-hosted-test`, loopback
  port 55439, task ownership label confirmed before restart.
- `pnpm test:e2e`: 22 files / 119 passed, existing requirement suite, not live
  browser or newly implemented full hosted backend/OAuth end-to-end coverage.
- Storybook build: exit 0 with missing-MDX, chunks, module-directive warnings
  (including new GripBoard directive), plus plugin timing advisory.
- Browser: in-app Storybook accessible snapshot and screenshot, no console errors.
  Production no-cookie page shows GitHub sign-in; expected HTTP401 resource entry.
- `node --test tests/browser/grip-hosted.test.mjs`: one real Chromium test passed,
  production page with synthetic intercepted API, desktop/mobile screenshots in
  `screenshots/grip-hosted/`. Never used a live check or answered human defense.
- OAuth BFF focused: six tests passed; auth start rejects userinfo redirects and
  returns sanitized no-store errors. Additional boundary/projection coverage needed.
- `pnpm skills:check`, `pnpm gemini:check`: passed.
- `git diff --check`: exit 0; Git LF→CRLF notices, not whitespace errors.
- Changed files Prettier written; final check still required after review fixes.
- Parent PR read-only rechecked through GitHub integration: #339 open, head
  `fe713372da4da506a993f8283eaa72148f0996ab`; required child base unchanged.
- `gh` command is absent from PATH; no publication attempted.

## Unresolved audit/activation gates

- Full audit: exit1, 25 findings (11 high); production-only: exit1, one reachable
  high body-parser2.3.0, GHSA-27r3-jxmh-p828. Fixed version2.4.0; existing parser
  default inflate is reachable. No dependency edits or broad remediation approved.
  Triage/activation hold recorded in `docs/grip-hosted.md`, review due2026-11-13.
- Live GitHub callback configuration/login, provider defense, deployed scheduler,
  retention period and restore drill are unverified and require human operations.
- Real task code/Notion URL and publication metadata absent. Do not invent.
- No hosted-feature commits/push/PR yet; do not shut down while work incomplete.
- Fresh independent reviews launched read-only for backend security/state and
  hook/UI. Results and cross-model choice pending; do not claim completed review.

## Review reconciliation after restart

- Two fresh independent reviewers returned findings. Added regression coverage
  and fixes for remembered-intent replay, quota provenance on release/timeout,
  fail-closed activation config and expired CLI deadline, browser logout/account
  isolation, retry-after propagation, bounded BFF bodies, session rotation,
  expired/stale cleanup, HTTP202/429 operation states and safe projections,
  visible manifest/question target, truncated warning and exact frontend origin.
- User selected the Cloud Run frontend origin. Custom environments may specify
  `--frontend-origin` during setup. The hook refuses any other board origin.
- Rename-crossing exclusions now fail closed before patch extraction. Git's rename
  detection is heuristic; this does not prove copies/rewrites of sensitive files
  cannot be committed under allowed names. Never upload secrets as allowed files.
- Updated focused checks after final-review fixes: backend hosted+Gemini 130
  passed, frontend 44 passed, disposable PostgreSQL 12 passed, Grip65 passed,
  `pnpm lint`, `pnpm lint:style`, `pnpm typecheck --force` exit0 (Turbo output
  warnings). A full test/build rerun and follow-up adversarial review are running.
- Subsequent full rerun: `pnpm test --force` exit0: core76, UI329,
  backend800, uni-hub945 (2,150 total), with expected backend logs/VM and Turbo
  warnings. `pnpm build --force` exit0 with two existing Turbo warnings.
  Storybook build exit0 with missing-MDX, oversized-chunk, directive and timing
  warnings. `pnpm test:e2e` 119 passed. Latest synthetic production browser
  fixture passed desktop/mobile after the final manifest UI changes.
- Latest backend `test:cov --runInBand`: 77 suites / 800 passed, 87.54% lines,
  84.99% branches, with expected simulated-error and VM warnings. Audit remains
  unresolved; a passing coverage command does not establish security or feature
  completeness. `pnpm skills:check`, `pnpm gemini:check`, changed-source Prettier
  and `git diff --check` exited 0; Git emitted line-ending conversion notices.
- Server restart appended NUL bytes to the end of
  `scripts/grip/tests/push-manifest.test.mjs`. Verified all bytes after the first
  NUL were zero and removed that damaged suffix only; Grip65 then passed.
- Production audit remains a blocking existing high. Browser OAuth per-client IP
  limits still use the frontend egress IP; no safe authenticated browser-IP
  propagation is established. Do not enable hosted mode or claim acceptance.
- User declined cross-model Antigravity review because its quota was exhausted;
  the current session's independent reviews are not cross-model.

## Remaining acceptance gaps to reconcile

Review actual artifact against spec, especially durable denial during failures,
backend/BFF public projections and bounded payload decoding, cleanup stale claims,
session rotation/account isolation and poll429, pending202/quota429 semantics,
manifest summary in UI, full replicas+OAuth fixture flow and rollback cold-start.
All plan checkboxes remain conservative until behavior and evidence are mapped.
