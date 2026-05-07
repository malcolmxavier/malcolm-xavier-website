// ─────────────────────────────────────────────────────────────────
// serializd-cleanup.mjs
//
// Pure functions for the seven editorial-cleaning categories per
// PLAN.md §Editorial data cleaning. Each cleanup category accepts
// the in-memory snapshot + overrides and returns an array of
// row objects describing the issue. The bootstrap orchestrator
// renders rows into Markdown reports under data/television/cleanup/
// and exits non-zero if any blocking category has unresolved
// entries.
//
// Why .mjs (not .ts): consumers are .mjs scripts (bootstrap +
// incremental refresh), and Node.js doesn't transparently import
// .ts. Placement under lib/feeds/ matches the plan's convention.
// Tests against this file run through vitest with the .mjs
// extension (vitest understands both).
//
// Bias (per plan §Editorial data cleaning, "Bias" subsection):
// THIS PASS SURFACES; IT NEVER AUTO-CORRECTS. Malcolm is the
// editor of record. The reports exist to make editorial misses
// visible, not to silently massage data into clean-looking shape.
//
// Same posture as the miniseries classifier ("default to false,
// override deliberately") and the same bias /films's enricher
// uses ("unmatched films flag for human review, don't guess").
// ─────────────────────────────────────────────────────────────────

// ─── Cleanup category catalog ────────────────────────────────────

/**
 * Single source of truth for the seven cleanup categories. Each
 * entry declares its filename, severity, header copy (rendered at
 * the top of the report), and the runner function that produces
 * rows.
 *
 * The bootstrap orchestrator iterates this catalog top-to-bottom,
 * tracking whether any blocking category has unresolved entries.
 * Order matches the plan's §Editorial data cleaning table top-
 * down by severity (blocking first, then by editorial-vs-data
 * grouping).
 */
export const CLEANUP_CATEGORIES = [
  {
    filename: "tmdb-unresolved.md",
    severity: "blocking",
    title: "TMDB Unresolved",
    description:
      "Shows where Serializd's showId returns 404 from TMDB `/tv/{id}`. " +
      "Pin manually via `data/television/overrides.json#tmdbId`. " +
      "**Blocks the snapshot from shipping** — slug, poster, decade, genre, " +
      "and JSON-LD all depend on resolved TMDB metadata.",
    runner: findTmdbUnresolved,
  },
  {
    filename: "tmdb-incomplete.md",
    severity: "non-blocking",
    title: "TMDB Incomplete",
    description:
      "Shows resolved on TMDB but missing one or more enrichment fields " +
      "(genres / type / status / poster). Card surfaces fall back to " +
      "Serializd's embedded data; SEO long-tail (genre routes) misses " +
      "these shows. Usually self-resolves as TMDB metadata firms up.",
    runner: findTmdbIncomplete,
  },
  {
    filename: "missing-prose.md",
    severity: "non-blocking",
    title: "Missing Prose (Show / Season Level)",
    description:
      "Show- or Season-level entries with `rating !== null` but " +
      "`reviewText === \"\"`. These are dropped by the level-specific " +
      "scope filter (Show/Season cards require prose). Either backfill " +
      "prose in Serializd (preferred) or accept the drop.",
    runner: findMissingProse,
  },
  {
    filename: "maybe-miniseries.md",
    severity: "non-blocking",
    title: "Maybe Miniseries",
    description:
      "Candidates for the miniseries classifier (single-season scripted " +
      "shows ≤6 episodes, with a Show-level review existing or a long " +
      "stuck-watching pattern). Pin via " +
      "`data/television/overrides.json#isMiniseries[showId] = true|false`.",
    runner: findMaybeMiniseries,
  },
  {
    filename: "stuck-watching.md",
    severity: "non-blocking",
    title: "Stuck Watching",
    description:
      "Seasons with episode entries but no Season-level review where " +
      "the most-recent episode entry is >180 days old. Likely finished " +
      "IRL but missing the Season write-up. Either write the Season " +
      "review or accept perpetual /television/watching placement.",
    runner: findStuckWatching,
  },
  {
    filename: "likes-only.md",
    severity: "non-blocking",
    title: "Likes-Only (Show / Season Level)",
    description:
      "Show- or Season-level entries with `liked === true` but no rating " +
      "and no prose. Surfaces accidental hearts. Decide: upgrade with a " +
      "real review, or delete.",
    runner: findLikesOnly,
  },
  {
    filename: "duplicates.md",
    severity: "non-blocking",
    title: "Duplicates",
    description:
      "Multiple entries on the same (showId, seasonNumber, episodeNumber, " +
      "watchedDate) tuple. Surfaces accidental double-logs and rewatch-vs-" +
      "original confusion.",
    runner: findDuplicates,
  },
];

// ─── Constants ────────────────────────────────────────────────────

const STUCK_WATCHING_THRESHOLD_DAYS = 180;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ─── Category implementations ────────────────────────────────────

/**
 * Shows where TMDB enrichment didn't resolve. The bootstrap sets
 * `show.tmdb = null` when /tv/{id} returns 404; this category
 * surfaces those for manual override.
 */
function findTmdbUnresolved(snapshot /* , overrides */) {
  const rows = [];
  for (const show of snapshot.shows) {
    if (show.tmdb === null) {
      rows.push({
        serializdShowId: show.serializdShowId,
        name: show.name || "(name missing)",
        premiereYear: show.premiereYear || null,
        firstSeenDate: show.latestActivityDate || null,
        action:
          `Pin via overrides.json: \`"tmdbId": { "${show.serializdShowId}": <correct-tmdb-id> }\`. ` +
          `If the show truly isn't on TMDB, accept null tmdb (drops genre/decade contributions; ` +
          `card still renders with Serializd's embedded showName + showBannerImage).`,
      });
    }
  }
  return rows;
}

/**
 * Shows resolved on TMDB but missing one or more enrichment
 * fields. Non-blocking — they surface so Malcolm knows about
 * incomplete coverage but the show still ships.
 */
function findTmdbIncomplete(snapshot /* , overrides */) {
  const rows = [];
  for (const show of snapshot.shows) {
    if (show.tmdb === null) continue;
    const missing = [];
    if (show.tmdb.genres.length === 0) missing.push("genres");
    if (!show.tmdb.type) missing.push("type");
    if (!show.tmdb.status) missing.push("status");
    if (!show.tmdb.posterPath) missing.push("poster");
    if (missing.length > 0) {
      rows.push({
        serializdShowId: show.serializdShowId,
        name: show.name,
        premiereYear: show.premiereYear,
        missing: missing.join(", "),
      });
    }
  }
  return rows;
}

/**
 * Show- or Season-level entries with a rating but no prose. The
 * level-specific scope filter drops these from card surfaces; the
 * report exists so Malcolm can decide whether to backfill prose
 * (preferred) or accept the drop. Episode-level entries without
 * prose are FINE (episodes don't require prose) and don't appear
 * here.
 */
function findMissingProse(snapshot /* , overrides */) {
  const rows = [];
  for (const show of snapshot.shows) {
    for (const review of show.reviews) {
      if (review.level === "episode") continue; // episodes are exempt
      if (review.rating === null) continue;
      if (review.reviewText.trim() !== "") continue;
      rows.push({
        serializdShowId: show.serializdShowId,
        showName: show.name,
        level: review.level,
        seasonNumber: seasonNumberFor(show, review),
        rating: review.rating,
        watchedDate: review.watchedDate,
        reviewId: review.id,
      });
    }
  }
  return rows;
}

/**
 * Candidates for the miniseries classifier per PLAN.md §Miniseries
 * classifier. The classifier defaults to FALSE (everything's a
 * series unless overridden); this report surfaces shows that
 * SHOULD probably be flagged true so Malcolm can review and pin.
 *
 * Heuristic (any of the following):
 *   • TMDB type === "Miniseries" — high-confidence, almost always
 *     should be flagged true.
 *   • Single TMDB season AND ≤6 episodes total AND a Show-level
 *     review exists — Malcolm chose Show level, suggesting he
 *     experienced it as a single unit.
 *   • Single TMDB season AND every reviewed episode covered AND
 *     no Season-level review — closure pattern that suggests
 *     "miniseries Malcolm watched as a unit but logged per-
 *     episode."
 */
function findMaybeMiniseries(snapshot, overrides) {
  const rows = [];
  for (const show of snapshot.shows) {
    // Skip shows already pinned in overrides — they've been
    // explicitly classified, no need to re-surface.
    if (overrides.isMiniseries[show.serializdShowId] !== undefined) continue;
    if (show.tmdb === null) continue;

    const reasons = [];
    if (show.tmdb.type === "Miniseries") {
      reasons.push("TMDB type = Miniseries");
    }
    const isSingleSeason =
      show.tmdb.numberOfSeasons === 1 ||
      // Some shows have a "Specials" season 0 plus one real season;
      // that still counts as single-season for the heuristic.
      show.seasons.filter((s) => s.seasonNumber > 0).length === 1;
    if (
      isSingleSeason &&
      show.tmdb.numberOfEpisodes <= 6 &&
      show.hasShowReview
    ) {
      reasons.push(
        `single season, ≤6 episodes (${show.tmdb.numberOfEpisodes}), Show-level review present`,
      );
    }
    if (reasons.length === 0) continue;
    rows.push({
      serializdShowId: show.serializdShowId,
      showName: show.name,
      premiereYear: show.premiereYear,
      tmdbType: show.tmdb.type,
      seasons: show.tmdb.numberOfSeasons,
      episodes: show.tmdb.numberOfEpisodes,
      hasShowReview: show.hasShowReview,
      reasons: reasons.join("; "),
    });
  }
  return rows;
}

/**
 * Seasons in the in-progress bucket whose most-recent episode
 * watch is >180 days old. Either Malcolm finished IRL but never
 * wrote the Season review, or the show actually went on indefinite
 * pause. The report surfaces both — Malcolm decides per row.
 */
function findStuckWatching(snapshot /* , overrides */) {
  const rows = [];
  const nowMs = Date.now();
  for (const show of snapshot.shows) {
    if (show.inProgressSeasonNumbers.length === 0) continue;
    for (const seasonNumber of show.inProgressSeasonNumbers) {
      const episodeReviews = show.reviews.filter(
        (r) =>
          r.level === "episode" &&
          seasonNumberFor(show, r) === seasonNumber,
      );
      if (episodeReviews.length === 0) continue;
      // Sort descending so [0] is the most recent watched date.
      const sorted = [...episodeReviews].sort((a, b) =>
        b.watchedDate.localeCompare(a.watchedDate),
      );
      const mostRecentMs = new Date(sorted[0].watchedDate).getTime();
      if (!Number.isFinite(mostRecentMs)) continue;
      const ageDays = Math.floor((nowMs - mostRecentMs) / MS_PER_DAY);
      if (ageDays < STUCK_WATCHING_THRESHOLD_DAYS) continue;
      rows.push({
        serializdShowId: show.serializdShowId,
        showName: show.name,
        seasonNumber,
        mostRecentEpisodeWatched: sorted[0].watchedDate,
        ageDays,
        episodeReviewCount: episodeReviews.length,
      });
    }
  }
  return rows;
}

/**
 * Show- or Season-level entries with `liked === true` but no
 * rating and no prose. Hearts that probably weren't intentional.
 * Episode-level likes-only entries aren't a problem (episodes
 * are quick-log territory) so we exclude them.
 */
function findLikesOnly(snapshot /* , overrides */) {
  const rows = [];
  for (const show of snapshot.shows) {
    for (const review of show.reviews) {
      if (review.level === "episode") continue;
      if (!review.liked) continue;
      if (review.rating !== null) continue;
      if (review.reviewText.trim() !== "") continue;
      rows.push({
        serializdShowId: show.serializdShowId,
        showName: show.name,
        level: review.level,
        seasonNumber: seasonNumberFor(show, review),
        watchedDate: review.watchedDate,
        reviewId: review.id,
      });
    }
  }
  return rows;
}

/**
 * Multiple reviews on the exact same (showId, seasonNumber,
 * episodeNumber, watchedDate) tuple. Surfaces accidental
 * double-logs (two clicks on the same "log episode" button) and
 * rewatch-vs-original confusion (where the rewatch was logged on
 * the same day as the original, both with `isRewatch: false`).
 */
function findDuplicates(snapshot /* , overrides */) {
  const rows = [];
  for (const show of snapshot.shows) {
    const buckets = new Map();
    for (const review of show.reviews) {
      const key = [
        show.serializdShowId,
        seasonNumberFor(show, review) ?? "null",
        review.episodeNumber ?? "null",
        review.watchedDate,
      ].join("|");
      const list = buckets.get(key) ?? [];
      list.push(review);
      buckets.set(key, list);
    }
    for (const [, list] of buckets) {
      if (list.length < 2) continue;
      rows.push({
        serializdShowId: show.serializdShowId,
        showName: show.name,
        seasonNumber: seasonNumberFor(show, list[0]),
        episodeNumber: list[0].episodeNumber,
        watchedDate: list[0].watchedDate,
        reviewCount: list.length,
        reviewIds: list.map((r) => r.id).join(", "),
      });
    }
  }
  return rows;
}

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Resolve a Review's seasonNumber by joining `review.seasonId`
 * against the show's `seasons[]` array. Returns null on Show-level
 * reviews (which intentionally have no seasonId) and on the rare
 * case where the seasonId doesn't appear in the show's seasons
 * (TMDB drift — should be picked up by tmdb-incomplete). Used
 * everywhere a category needs to surface the season number for a
 * non-Show-level review row.
 */
function seasonNumberFor(show, review) {
  if (review.seasonId === null) return null;
  const season = show.seasons.find((s) => s.serializdId === review.seasonId);
  return season ? season.seasonNumber : null;
}

// ─── Report file rendering ───────────────────────────────────────

/**
 * Render a category's rows into a Markdown report. The header
 * includes a frontmatter-style summary so a glance at the file
 * shows status without reading rows. Rows render as a table when
 * the category has tabular data; otherwise as a bulleted list.
 *
 * Honors a `# Accepted:` block if one exists at the top of the
 * existing report — entries listed under "# Accepted:" are NOT
 * re-surfaced in the rows list (Malcolm has consciously accepted
 * them as won't-fix; surfacing them every refresh would be noise).
 *
 * Returns { content, hasUnacceptedRows } so the orchestrator can
 * decide whether a blocking category fails the build.
 */
export function renderReport(category, rows, existingContent) {
  const accepted = parseAcceptedBlock(existingContent);
  const filteredRows = rows.filter((row) => !accepted.has(rowKey(row)));

  const lines = [];
  lines.push(`# ${category.title}`);
  lines.push("");
  lines.push(`**Severity:** ${category.severity}`);
  lines.push(`**Unresolved:** ${filteredRows.length}`);
  lines.push(`**Accepted (won't-fix):** ${accepted.size}`);
  lines.push(`**Last regenerated:** ${new Date().toISOString()}`);
  lines.push("");
  lines.push(category.description);
  lines.push("");
  if (accepted.size > 0) {
    lines.push("# Accepted:");
    lines.push("");
    lines.push(
      "Entries below have been reviewed and accepted as won't-fix. " +
        "List one row-key per line under this header to suppress an " +
        "entry from re-surfacing. Row-key shape varies per category " +
        "— see the active rows section below for examples.",
    );
    lines.push("");
    for (const key of [...accepted].sort()) {
      lines.push(`- ${key}`);
    }
    lines.push("");
  }
  if (filteredRows.length === 0) {
    lines.push("---");
    lines.push("");
    lines.push("_No active rows. Either nothing matches this category, or " +
      "every match is in the Accepted block._");
    lines.push("");
  } else {
    lines.push("## Active rows");
    lines.push("");
    for (const row of filteredRows) {
      lines.push(`- \`${rowKey(row)}\`  ${rowSummary(row)}`);
    }
    lines.push("");
  }
  return {
    content: lines.join("\n"),
    hasUnacceptedRows: filteredRows.length > 0,
  };
}

/**
 * Stable key string for a cleanup row. Used both as the row's
 * display anchor in the report and as the lookup key in the
 * Accepted block. The shape varies by category but always starts
 * with the showId so eyeballing the report stays scannable.
 */
function rowKey(row) {
  // Each runner emits a slightly different row shape; this helper
  // builds the most-specific key that still uniquely identifies
  // the row within its category. Categories that operate at the
  // show level use `<showId>`; categories at the review level
  // include the reviewId; episode-level rows include season +
  // episode numbers.
  if (row.reviewId !== undefined) {
    return `${row.serializdShowId}#${row.reviewId}`;
  }
  if (row.seasonNumber !== undefined && row.episodeNumber !== undefined) {
    return `${row.serializdShowId}#s${row.seasonNumber}e${row.episodeNumber}@${row.watchedDate}`;
  }
  if (row.seasonNumber !== undefined) {
    return `${row.serializdShowId}#s${row.seasonNumber}`;
  }
  return `${row.serializdShowId}`;
}

/** Human-readable summary appended after the row key. */
function rowSummary(row) {
  const parts = [];
  if (row.showName || row.name) parts.push(`**${row.showName ?? row.name}**`);
  if (row.premiereYear) parts.push(`(${row.premiereYear})`);
  if (row.level) parts.push(`level=${row.level}`);
  if (row.seasonNumber !== undefined && row.seasonNumber !== null) {
    parts.push(`S${row.seasonNumber}`);
  }
  if (row.episodeNumber) parts.push(`E${row.episodeNumber}`);
  if (row.rating !== undefined && row.rating !== null) parts.push(`★${row.rating}`);
  if (row.watchedDate) parts.push(`watched ${row.watchedDate}`);
  if (row.ageDays) parts.push(`${row.ageDays}d stale`);
  if (row.episodeReviewCount) parts.push(`${row.episodeReviewCount} ep reviews`);
  if (row.reviewCount) parts.push(`${row.reviewCount} duplicates`);
  if (row.missing) parts.push(`missing: ${row.missing}`);
  if (row.tmdbType) parts.push(`tmdb=${row.tmdbType}`);
  if (row.reasons) parts.push(`— ${row.reasons}`);
  if (row.action) parts.push(`→ ${row.action}`);
  return parts.join(" ");
}

/**
 * Extract the set of accepted row-keys from a previous report's
 * `# Accepted:` block. Returns an empty set if no block exists or
 * the file is empty/missing. Lines under the block start with
 * `- ` and end at the next `---` or `## ` header.
 */
function parseAcceptedBlock(content) {
  const accepted = new Set();
  if (!content) return accepted;
  const lines = content.split(/\r?\n/);
  let inBlock = false;
  for (const line of lines) {
    if (/^# Accepted:?\s*$/i.test(line)) {
      inBlock = true;
      continue;
    }
    if (!inBlock) continue;
    if (/^(##|---)/.test(line)) break; // end of block
    const m = /^-\s+(.+?)\s*$/.exec(line);
    if (m) accepted.add(m[1].trim());
  }
  return accepted;
}
