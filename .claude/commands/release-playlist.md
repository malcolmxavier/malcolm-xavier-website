---
description: Refresh the music snapshot after releasing a new Spotify playlist. Optionally accepts an Apple Music share URL to wire to the newly-added playlist. Reviews the diff, then commits + pushes.
argument-hint: [apple-music-url]
---

You're being invoked because Malcolm just released a new playlist (or made an existing one public, or excluded one) and wants the live site to reflect it. The site reads from a committed snapshot at `lib/feeds/_fixtures/spotify-snapshot.json`, so the workflow is:

**Argument handling.** `$ARGUMENTS` is optional. If present, it should be an Apple Music share URL starting with `https://music.apple.com/`. Validate that prefix before doing anything else — if the URL is malformed, stop and ask Malcolm to re-invoke with a corrected one (don't burn a rate-limit window just to throw the URL away). If `$ARGUMENTS` is empty, skip the Apple Music step entirely and behave as the original release flow.

1. **Capture the pre-refresh state.** Read `lib/feeds/_fixtures/spotify-snapshot.json` and remember the set of existing playlist IDs (the keys of `enrichedById`). You need this to identify what's new after the script runs. If the file doesn't exist yet, treat the pre-refresh set as empty.

2. **Refresh the snapshot.** Run `npm run music:refresh` from the project root. The script:
   - Spawns `next dev` on `:3001` in live Spotify mode (or reuses an existing one).
   - Probes Spotify's rate-limit health. If `/me/playlists` is in cool-down, it'll bail with a clear time — just tell Malcolm when to try again.
   - Captures the live data into the fixture file.
   - Diffs old vs new and prints a summary (added playlists, removed, track-count changes).
   - Tears down its own dev server when done.

3. **Show Malcolm the diff** the script printed. He should sanity-check that the playlist he expected to ship is in the "Added" list (or that the "Track count changed" entries match what he edited).

4. **Wire the Apple Music outlink (only if `$ARGUMENTS` was provided).**
   - Re-read `lib/feeds/_fixtures/spotify-snapshot.json` and compute the added IDs (post-refresh keys minus the pre-refresh set).
   - **Exactly one added:** that's the target. Edit `lib/feeds/spotify-config.ts` and insert a new entry at the TOP of `APPLE_MUSIC_LINKS` — just below the leading comment block, above the existing first entry — keyed by that Spotify ID. Match the existing style:
     ```ts
       "<spotifyId>": // <playlist name from enrichedById[id].name, verbatim>
         "<apple-music-url>",
     ```
     The list is "ordered roughly newest-first," so newest-on-top is the right slot.
   - **Zero or more than one added:** don't guess. List the candidates (added IDs first if any, then the 5 most-recent already-present playlists by `last_added_at_ms`) and ask Malcolm which one the Apple Music URL maps to. Then edit the file as above.
   - **Spotify ID already in `APPLE_MUSIC_LINKS`:** overwrite the existing value rather than duplicating the key, and explicitly tell Malcolm the previous URL was replaced (in case the rotation was unintentional).

5. **Confirm before committing.** Show the proposed commit message based on the diff:
   - Single-add with Apple Music link: `Refresh music snapshot — add "<playlist name>" (+ Apple Music link)`
   - Single-add without: `Refresh music snapshot — add "<playlist name>"`
   - Apple Music link added to an already-present playlist (no new snapshot adds): `Refresh music snapshot — add Apple Music link for "<playlist name>"`
   - Routine refresh, no obvious headline: `Refresh music snapshot`

   Voice rules: real em-dash (no spaces), straight quotes around playlist names, Oxford comma if a list appears in the body. Ask Malcolm to confirm before continuing.

6. **Commit and push.** On confirmation:
   - `git add lib/feeds/_fixtures/spotify-snapshot.json` (and `lib/feeds/spotify-config.ts` if you edited it — both go in one commit so the snapshot and the outlink land together)
   - `git commit -m "<message>"`
   - `git push origin main`

   Vercel auto-deploys on push, so the site should reflect the change within a minute. Standard commit voice rules apply (the global memory's `Co-Authored-By` line is added automatically).

7. **Confirm done.** Report the new playlist count, whether an Apple Music link was wired (and to which playlist), and the commit hash.

**Failure modes to handle gracefully:**

- **Bad Apple Music URL:** if `$ARGUMENTS` doesn't start with `https://music.apple.com/`, stop before refreshing. Surface the bad URL and ask Malcolm to re-invoke. Refreshing first would waste a Spotify rate-limit window.
- **Rate-limited:** the script exits with code 2 and a clear-time. Don't retry. Tell Malcolm when to come back. If `$ARGUMENTS` was provided, note that the URL hasn't been wired yet so he doesn't think it's already done.
- **dev:online startup timeout:** the script logs the server's stderr; usually means port 3001 is taken or env vars are missing. Surface the actual error message to Malcolm.
- **Snapshot fetch failure:** Spotify returned an unexpected shape, or a single playlist failed to enrich. The script will throw; report the error and suggest checking `lib/feeds/spotify.ts` (the schema or enrichment pipeline may need updating, same class as the `images: null` bug from 2026-04-28).
- **Pre-commit hook fails:** investigate; don't `--no-verify`. Common causes: lint or typecheck failure in unrelated files, which the user should resolve before committing the snapshot.

**Don't push without explicit confirmation.** Malcolm's standing rule is "Commit only when I explicitly ask" — invoking this command IS that explicit ask, but pushing public changes warrants a final yes/no.
