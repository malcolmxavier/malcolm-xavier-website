# Snapshot fixtures—generated, not authored

JSON files in this directory are **generated output**, not source. Hand-edits
are overwritten by the next refresh.

To change content (new playlist, fresh track list):

```
npm run music:refresh
```

To change snapshot **shape** (new fields, schema migration): edit the writer
in `lib/feeds/spotify.ts` (and the `loadSnapshot` validator), then refresh.

These files are committed to git so Vercel bundles them at build time. They
**are** the canonical data source at request time (prod runs `SPOTIFY_OFFLINE=1`).
Corrupt JSON in a commit breaks `/music` in prod until reverted—review every
snapshot diff before pushing.
