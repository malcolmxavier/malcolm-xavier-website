---
description: Refresh the music snapshot after releasing a new Spotify playlist, review the diff, and commit + push.
---

You're being invoked because Malcolm just released a new playlist (or made an existing one public, or excluded one) and wants the live site to reflect it. The site reads from a committed snapshot at `lib/feeds/_fixtures/spotify-snapshot.json`, so the workflow is:

1. **Refresh the snapshot.** Run `npm run music:refresh` from the project root. The script:
   - Spawns `next dev` on `:3001` in live Spotify mode (or reuses an existing one).
   - Probes Spotify's rate-limit health. If `/me/playlists` is in cool-down, it'll bail with a clear time — just tell Malcolm when to try again.
   - Captures the live data into the fixture file.
   - Diffs old vs new and prints a summary (added playlists, removed, track-count changes).
   - Tears down its own dev server when done.

2. **Show Malcolm the diff** the script printed. He should sanity-check that the playlist he expected to ship is in the "Added" list (or that the "Track count changed" entries match what he edited).

3. **Confirm before committing.** Show the proposed commit message based on the diff (e.g., `"Refresh music snapshot — add 'Late summer drive'"` for a single-add, or `"Refresh music snapshot"` for a routine refresh with no obvious headline). Ask Malcolm to confirm.

4. **Commit and push.** On confirmation:
   - `git add lib/feeds/_fixtures/spotify-snapshot.json`
   - `git commit -m "<message>"` (signed-off by Claude as usual)
   - `git push origin main`
   Vercel auto-deploys on push, so the site should reflect the change within a minute.

5. **Confirm done.** Report the new playlist count and the commit hash.

**Failure modes to handle gracefully:**

- **Rate-limited:** the script exits with code 2 and a clear-time. Don't retry. Tell Malcolm when to come back.
- **dev:online startup timeout:** the script logs the server's stderr; usually means port 3001 is taken or env vars are missing. Surface the actual error message to Malcolm.
- **Snapshot fetch failure:** Spotify returned an unexpected shape, or a single playlist failed to enrich. The script will throw; report the error and suggest checking `lib/feeds/spotify.ts` (the schema or enrichment pipeline may need updating, same class as the `images: null` bug from 2026-04-28).
- **Pre-commit hook fails:** investigate; don't `--no-verify`. Common causes: lint or typecheck failure in unrelated files, which the user should resolve before committing the snapshot.

**Don't push without explicit confirmation.** Malcolm's standing rule is "Commit only when I explicitly ask" — invoking this command IS that explicit ask, but pushing public changes warrants a final yes/no.
