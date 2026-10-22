# Daily streak (OP-204 / BOP-55)

The streak counts authenticated dashboard visits on consecutive **local calendar days**, not successful login requests. Multiple visits on one day count once; returning after a missed day starts at one. A visible dashboard checks again at midnight and when the window gains focus or the tab becomes visible. Hidden tabs do not earn days simply by staying open.

Streaks and badges are stored per authenticated user ID in the browser's `universe-gamification` storage entry (version 1). Logout clears visible progress but preserves that account's history for a later visit. Sound preferences remain browser-wide.

Version 0 stored shared progress without an owner. Migration deliberately discards those streaks and badges instead of assigning them to whichever account logs in first; it preserves the sound preference.

The dashboard observes cross-tab storage changes. When another tab replaces the session owner, the stale dashboard stops awarding progress and redirects to login rather than assigning its cached data to the new account. Progress is refreshed from synchronous browser storage before writes as best-effort synchronization. Reads and writes are separate operations without locking or conflict detection, so simultaneous updates from two tabs can still overwrite each other. This is not a transactional or cross-device store.

This is local gamification, not a security or attendance record: clearing browser storage resets it, device clock/timezone changes affect it, and it does not sync between devices.

Regression tests: `pnpm --filter @universe/uni-hub test useGamificationStore.test.ts useDailyStreak.test.tsx api.session.test.ts`.
