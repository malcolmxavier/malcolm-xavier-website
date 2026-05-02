# Spotify API routes

Four routes, each with a distinct purpose:

- `authorize/` and `callback/`: OAuth dance (one-shot, dev-only).
- `health/`: diagnostic. Probes `/me` and `/me/playlists` independently.
- `snapshot/`: refresh-script capture endpoint. Returns 404 in prod
  (NODE_ENV gate at line 42), refuses when `SPOTIFY_OFFLINE=1` is set
  (would silently re-write the snapshot with its own contents).

## Rate limits are per-bucket

Spotify rate-limits each endpoint family separately. `/me` cool-down is not
the same as `/me/playlists` cool-down. When debugging a 429, **probe the
specific bucket the failing flow hits**. Don't assume a single clear time
covers all paths.

`pingSpotifyHealth()` in `lib/feeds/spotify.ts` probes both buckets and
returns the worst-case retry-after. Surface it via:

```
npm run spotify:health   # curl /api/spotify/health | json.tool
```

Re-attempting a flow during its bucket's cool-down extends the penalty
window. Always probe before retrying.

## Why health stays live in prod

`SPOTIFY_OFFLINE=1` makes pages render from snapshot, but the health probe
itself always hits live Spotify regardless of the env var. That's
intentional: it's the one place to ask "is upstream healthy right now?"
from any environment.
