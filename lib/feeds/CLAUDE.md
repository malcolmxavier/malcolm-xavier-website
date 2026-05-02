# lib/feeds—content feed services

## Architecture

Each external content source (Spotify today, Letterboxd next) gets:

```
service.ts                        server-only fetcher + snapshot reader
service-utils.ts                  pure helpers; safe to import client-side
service.test.ts                   vitest on brittle paths (rate-limit, parsing)
_fixtures/service-snapshot.json   bundled output, canonical at request time
```

## Snapshot is canonical at request time

All Vercel environments run `SPOTIFY_OFFLINE=1` (and equivalents for new
services). Pages render from the on-disk snapshot. Zero live API calls per
render: immune to upstream rate limits, deterministic latency.

The live-fetch try/catch in `getMusicData()` and `getOwnedPlaylistById()`
exists for `dev:online` runs that power the refresh script. User-facing
renders never go down that path.

## Refresh ritual (human-in-the-loop)

```
npm run music:refresh
```

Kills any running dev, spawns `dev:online`, probes health, calls
`/api/spotify/snapshot`, diffs old vs new, writes the new fixture. Then
review the diff, commit, push. Vercel rebuilds on push.

No cron. Refresh is intentional, not scheduled.

## Adding a new feed service

Default to **snapshot-from-day-one** (no live path at request time). The
live→snapshot fallback in `spotify.ts` exists because Spotify has an API;
sources without an API (e.g. Letterboxd via CSV + RSS + TMDB) skip the
fallback entirely and read snapshot directly.
