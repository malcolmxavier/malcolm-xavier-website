---
description: Update a "Currently recommending" pick on /films or /television—resolve the title against the live snapshot, check the take's mechanics, edit lib/feeds/featured-pick.ts, verify, then commit and push to main.
argument-hint: <film|tv> <title> "<take>"   (or: <film|tv> keep)
---

Update the hand-curated "Currently recommending" module on a cluster landing. Malcolm runs this when his monthly Booth card ("Review the film pick" or "Review the TV pick") comes up, or whenever his feelings about what's out change.

The pick lives in `lib/feeds/featured-pick.ts` as `FILM_PICK = { slug, take }` and `TV_PICK = { showId, take }`. The id must point at a title the site has a review for, or the module hides itself silently. That silent failure is the reason this command exists.

## Arguments

`$ARGUMENTS` is `<film|tv> <title> "<take>"`. If he gives the title without a take, ask for the take; don't write one. If he says `keep` (the pick still stands), record nothing in the repo and close the Booth card (step 7).

## Steps

1. **Work on main, never in his checkout's branch.** The checkout at `malcolm-xavier-website/` is often on a feature branch with his uncommitted work. Do the edit in a throwaway worktree off `origin/main`:
   ```
   cd malcolm-xavier-website && git fetch -q origin
   git worktree add -q -b featured-pick <scratchpad>/site-pick origin/main
   ln -s "$PWD/node_modules" <scratchpad>/site-pick/node_modules
   ```
   Fetching first matters: the hourly cron commits new reviews to origin/main, and a title logged an hour ago is only there.

2. **Resolve the title.** In the worktree: `node scripts/featured-pick-lookup.mjs <film|tv> <title words>`.
   - Exit 1 (no match): stop. Tell him the title isn't on the site yet—usually because the review was logged after the last hourly refresh (films at :00, TV at :30)—and offer to retry after the next run. Never set a pick that doesn't resolve.
   - Several matches (a remake, a reboot, two seasons' shows): ask which one, showing title and year.
   - One match: use its `slug` (film) or `showId` (tv).

3. **Check the take's mechanics, and only its mechanics.** The take is his copy and his voice; don't rewrite it. Flag and fix only:
   - Spelling and plain typos (a word that is clearly mistyped).
   - Universal mechanics: em-dashes with no spaces, Oxford comma, the word "and" rather than an ampersand.
   - Length: the module is written for 2–4 sentences. Over that, say so; don't cut.

   If a fix is unambiguous (a misspelling, a spaced em-dash), apply it and name it in the report. If a fix changes meaning—a word that could be corrected two ways—ask before writing anything.

4. **Edit `lib/feeds/featured-pick.ts`.** Replace the `slug`/`showId` and the `take`. For TV keep the trailing `// <Show name>` comment on the id, updated. Keep straight apostrophes and quotes as the existing takes use them; if the take contains a double quote, escape it.

5. **Verify.** In the worktree: `npx tsc --noEmit` and `npx vitest run`. Then confirm the pick resolves the way the page will: rerun the lookup and check `pageUrl` matches the title he meant.

6. **Commit and push to main.** Stage `lib/feeds/featured-pick.ts` by name (never `git add -A`), commit, rebase on `origin/main` if the cron moved it, push `HEAD:main`. Message shape: `Recommend <Title> on /<films|television>`, with a one-line body naming what it replaced. Then remove the worktree and its branch.

7. **Close the Booth card.** The monthly review is a recurring Booth item with id `recur:film-pick-review:<date>` or `recur:tv-pick-review:<date>`, where the date is the Sunday it fell due (it carries forward until done, so it may be an earlier Sunday than today). Mark it Done through the one decision path, never by writing `calendar.json` directly:
   ```
   echo '{"itemId": "recur:film-pick-review:<date>", "status": "done"}' | python3 booth/scripts/decide.py
   ```
   (from the workspace root). If no such card is open, skip this step; an ad-hoc update doesn't need one.

## Report

One short paragraph: the new pick and the page it links to, any mechanics fixes applied to the take, and the commit hash. Vercel deploys from main, so it's live after the deploy finishes.
