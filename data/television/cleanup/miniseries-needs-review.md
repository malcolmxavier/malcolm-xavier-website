# Miniseries Flag Needs Review

**Severity:** non-blocking
**Unresolved:** 0
**Accepted (won't-fix):** 0
**Last regenerated:** 2026-05-07T04:43:12.008Z

Shows currently pinned `isMiniseries: true` in overrides.json where review activity now spans multiple non-Specials seasons. Strong signal that a sequel / return season has landed since the original pin — the show is probably no longer a miniseries. Flip to `false` in overrides.json#isMiniseries[showId] so the SummaryPanel double-count stops applying. Specials (season 0) are excluded from the predicate so a miniseries with bonus content doesn't trip the alert.

---

_No active rows. Either nothing matches this category, or every match is in the Accepted block._

