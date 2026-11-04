# BOP-85 / BOP-86 local browser evidence

Captured from the local Next.js application in Chromium at a 1440 × 1000 viewport.
API responses and the logged-in account are synthetic; no live Moodle or production
database was used.

- `before-refresh.png`: one catalog card and no profile name after a simulated
  profile endpoint failure.
- `profile-restored.png`: the profile name returns after pressing **Refresh** once
  the simulated endpoint is available again.
- `catalog-auto-refreshed.png`: a second externally published card appears on the
  next 30-second poll without pressing **Refresh**.

The browser check also verified that returning from **My opportunities** to
**Catalog** immediately retrieves a third externally published card. No unexpected
console warnings or errors occurred; HTTP 503 messages from the intentionally
failing profile endpoint were expected during the failure phase.

These captures demonstrate the scoped recovery paths, not a reproduction of the
original reporter's live Dev session. Moderation rules, Google identity fallback,
and responsive profile-name styling are unchanged.
