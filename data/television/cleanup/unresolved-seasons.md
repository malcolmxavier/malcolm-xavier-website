# Unresolved Seasons

**Severity:** non-blocking
**Unresolved:** 0
**Accepted (won't-fix):** 0
**Last regenerated:** 2026-07-11T18:44:53.043Z

Reviews whose Serializd `seasonId` couldn't be mapped to any season in `show.seasons` — not from TMDB, and not from Serializd's own `showSeasons` embed. The bootstrap's `reconcileOrphanSeasons` pass restores seasons TMDB hasn't listed yet, so anything landing here means Serializd's embed didn't carry the season either. These reviews are dropped from classification (no /television/watching card, no detail-page season block) until resolved. Usually self-heals as Serializd / TMDB metadata firms up; if it persists, check the show on Serializd.

---

_No active rows. Either nothing matches this category, or every match is in the Accepted block._

