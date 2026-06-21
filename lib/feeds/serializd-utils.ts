// ─────────────────────────────────────────────────────────────────
// Serializd — pure helpers + public types.
//
// This file has no server-only imports (no `node:fs`, no `server-
// only` barrier) so it's safe to import from client components.
// Types live here too so client components can type their props
// without reaching into the server-only `serializd.ts`.
//
// Server-only logic (snapshot reading, TMDB enrichment, API
// pagination) lives in `serializd.ts` and re-exports these types.
//
// Mirrors the letterboxd-utils.ts split — same convention, same
// naming, same comment density. The two clusters share a sub-brand
// (Roboto Mono + Roboto Slab) and a card grammar; keeping the data
// layers stylistically aligned makes mirroring easy when one of
// them gets a feature the other should adopt.
// ─────────────────────────────────────────────────────────────────

import { facetHit, type FacetGroup } from "./slug";
import { parseDimension } from "./stats/filter-url";
import { modesForReview } from "./serializd-mode-counts.mjs";
import { conglomerateOfNet, primaryNetwork } from "./stats/network-canon";
import { creatorNames, isActingShow, tvActorNames } from "./stats/people";
import {
  countryName,
  languageName,
  normalizeCountry,
  normalizeLanguage,
} from "./stats/provenance";

// ─── Public types ────────────────────────────────────────────────

/**
 * Three-level review hierarchy. Load-bearing — the listing pages
 * route on this discriminator (Show + Season → /television, Episode
 * → not a primary card; rolls up to Season-in-progress on
 * /television/watching). Computed at snapshot-write time from the
 * raw API shape (see inferReviewLevel below) so consumers can read
 * `review.level` without re-deriving.
 */
export type ReviewLevel = "show" | "season" | "episode";

export type Review = {
  /**
   * Serializd's stable id — natural dedupe key for incremental
   * refreshes. Stays constant across edits to rating, prose, or
   * watchedDate. The bootstrap dedupes by this; the incremental
   * uses this to detect in-place edits within the most-recent-page
   * window without re-treating an edited review as a new one.
   */
  id: number;
  /** Show / Season / Episode discriminator; see ReviewLevel. */
  level: ReviewLevel;
  /**
   * 0.5 to 5.0 in 0.5 increments, or null if unrated.
   *
   * **Convention: unrated MUST be `null`, never `0`.** Same rule as
   * the /films Review type so StarRating can be reused as-is. The
   * raw Serializd API returns ratings on a 1-10 integer scale; we
   * transform `apiRating / 2` at snapshot-write time so what's
   * stored here is already the displayable 0.5–5 form. Keeps the
   * filter chips, the rating distribution chart, and the card UI
   * identical to /films.
   */
  rating: number | null;
  /**
   * Serializd's "like" flag (heart). Renamed `liked` for parity
   * with letterboxd-utils.ts and so the prop reads naturally in
   * card render (`liked: review.liked`).
   */
  liked: boolean;
  /** Plain text. Paragraphs split on `\n\n`. Renders as <p> blocks. */
  reviewText: string;
  containsSpoiler: boolean;
  isRewatch: boolean;
  /**
   * Serializd distinguishes "log" (quick add to diary, often
   * rating-only) from "review" (intentional write-up). We surface
   * both because the editorial cleaning pass needs to see the full
   * picture — but the level-specific scope filters drop rating-
   * only Show- and Season-level entries from card surfacing (see
   * the plan's "Editorial scope" section).
   */
  isLog: boolean;
  /**
   * ISO date (day precision in display, but datetime in source).
   * Maps to the API's `backdate` — when Malcolm watched the
   * episode/season, not when he typed up the review. Same naming
   * convention as the /films Review type.
   */
  watchedDate: string;
  /**
   * ISO date — when the review was created in Serializd. Maps to
   * the API's `dateAdded`. Used as the secondary sort key when
   * watchedDate ties.
   */
  reviewDate: string;
  // Level-specific. All three are null on Show-level reviews;
  // episodeNumber + episodeName are null on Season-level reviews.
  // See inferReviewLevel below for the discriminator logic.
  seasonId: number | null;
  episodeNumber: number | null;
  episodeName: string | null;
  tags: string[];
};

export type Season = {
  /**
   * Serializd's seasonId. Verified to equal TMDB's seasonId (the
   * APIs share the same id space — Serializd embeds TMDB ids
   * directly rather than maintaining its own). Used to join
   * Episode reviews to their parent Season.
   */
  serializdId: number;
  /** TMDB show id (= Serializd's showId). */
  showId: number;
  /**
   * Per TMDB convention: 0 for "Specials", 1+ for ordinary
   * seasons. The detail page renders seasons in seasonNumber asc
   * order with Specials surfaced last (since they're usually
   * tangential to the main run).
   */
  seasonNumber: number;
  /** "Season 1" | "Specials" | "Limited Series" | etc. */
  name: string;
  /** Relative TMDB path; render via `https://image.tmdb.org/t/p/w342${posterPath}`. */
  posterPath: string | null;
  /**
   * Total episode count per TMDB. Used by /television/watching to
   * render "X of Y episodes watched" on Season-in-progress cards.
   * Null when TMDB hasn't populated the field (rare — usually
   * happens for unaired or freshly-listed seasons). Detail-page
   * progress UI null-checks before rendering the denominator.
   */
  episodeCount: number | null;
};

export type TmdbTvMeta = {
  /** TMDB tv id. Sticky across refreshes once resolved. */
  id: number;
  name: string;
  posterPath: string | null;
  backdropPath: string | null;
  genres: string[];
  /**
   * TMDB classifies TV series by type: "Miniseries" | "Scripted" |
   * "Documentary" | "Reality" | "Talk Show" | "News" | "Video".
   * The miniseries classifier (see plan §Miniseries classifier)
   * uses this as its primary signal but allows manual overrides
   * via data/television/overrides.json since TMDB sometimes
   * mislabels limited series.
   */
  type: string;
  /**
   * "Returning Series" | "Ended" | "Canceled" | "In Production" |
   * "Planned" | "Pilot". Surfaced on detail page; informs the
   * "currently airing?" badge.
   */
  status: string;
  networks: string[];
  numberOfSeasons: number;
  numberOfEpisodes: number;
};

export type Show = {
  /** Canonical id: `tmdb-tv-${showId}`. Mirrors /films's `tmdb-${id}` form. */
  id: string;
  /** TMDB tv id (= Serializd's showId). */
  serializdShowId: number;
  /**
   * URL slug: `${slugify(name)}-${premiereYear}`. Mirrors /films's
   * `${letterboxdSlug}-${releaseYear}` form. Stable across name
   * collisions because premiereYear disambiguates (two shows can
   * share a name across different years; see "The Office" US/UK).
   */
  slug: string;
  name: string;
  premiereYear: number;
  /** ISO date — TMDB's first_air_date / Serializd's showPremiereDate. */
  premiereDate: string;
  /**
   * Outbound CTA target — `https://serializd.com/show/${showId}`.
   * Cards link out here on click of the title or the "View on
   * Serializd" link.
   */
  serializdUrl: string;
  /** TMDB enrichment. Null if no TMDB match was found. */
  tmdb: TmdbTvMeta | null;
  /** Resolved at snapshot time: TMDB w342 > null. */
  posterUrl: string | null;
  /** TMDB-derived fallback used by the card's onError swap when posterUrl 404s. */
  posterFallbackUrl: string | null;
  /**
   * Every season per TMDB, not just reviewed ones. Detail page
   * renders the full hierarchy (reviewed seasons + unreviewed
   * seasons + Episode reviews nested under their parent Season).
   * Sorted seasonNumber asc.
   */
  seasons: Season[];
  /**
   * All reviews for this show (mixed levels), sorted reviewDate
   * desc. The first entry is the most recent; surfaced on the
   * card when no per-review filter is active.
   */
  reviews: Review[];
  // Pre-computed for filter speed (mirrors Film.ratingSet /
  // Film.watchedYearSet). Building these once at snapshot-write
  // time keeps the per-render filter pass O(showCount) rather
  // than O(showCount × reviewCount).
  ratingSet: number[];
  watchedYearSet: number[];
  /**
   * Enrichment delta (cast, creators, country, language) joined by TMDB
   * id in lib/feeds/review-corpus.ts. Present only on the corpus the
   * reviews page filters with; absent on snapshot-only getShows(). Server-
   * side filtering reads it; strip before serializing cards to the client.
   * Type-only import (erased at build) so this client-safe module never
   * pulls in the fixture reader.
   */
  enrichment?: import("./enrichment").EnrichedShow;
  /**
   * Per-season classification (the load-bearing rule from the
   * plan). A season number lands in exactly one of these arrays
   * per show:
   *   • reviewedSeasonNumbers: a Season-level review exists →
   *     Season card on /television.
   *   • inProgressSeasonNumbers: episode-only reviews exist on
   *     this season AND no Season review AND no Show review →
   *     Season-in-progress card on /television/watching.
   * A season with neither lands in neither array (TMDB-known but
   * unwatched). Computed at snapshot-write time so card placement
   * is a constant-time lookup, not a per-render scan.
   */
  reviewedSeasonNumbers: number[];
  inProgressSeasonNumbers: number[];
  /**
   * Seasons the user has watched but never written up — sourced
   * from `data/television/overrides.json#watchedSeasons[showId]`.
   * Pre-Serializd viewing history mostly lives here (Malcolm has
   * watched far more TV than he's logged on Serializd, since
   * Serializd is a relatively new tool in his stack).
   *
   * The bootstrap dedupes this list against reviewedSeasonNumbers
   * and inProgressSeasonNumbers — so a season only appears here
   * if it has no review activity AT ALL on Serializd. This makes
   * the detail page's per-season status discriminator clean:
   *   • reviewedSeasonNumbers   → "reviewed"
   *   • inProgressSeasonNumbers → "watching"
   *   • watchedUnreviewedSeasonNumbers → "watched, no writeup"
   *   • none of the above       → "unreviewed" (status unknown)
   */
  watchedUnreviewedSeasonNumbers: number[];
  /**
   * True if any Show-level review exists. When true, the show
   * appears on /television via a Show card and is suppressed
   * from /television/watching regardless of any episode-only
   * reviews — see plan §Per-season classification rule 3.
   */
  hasShowReview: boolean;
  /**
   * True if this show is treated as a miniseries. Per PLAN.md
   * §Miniseries classifier, the precedence is:
   *   1. data/television/overrides.json#isMiniseries[showId]
   *      → use the explicit override (true or false)
   *   2. else if tmdb.type === "Miniseries" → true
   *   3. else → false (default)
   *
   * **This flag does NOT change card placement** (cards are
   * review-driven; see CardKind comment). It controls the
   * SummaryPanel's per-mode count via the double-count rule:
   * a Show-level review on a miniseries-flagged show contributes
   * to BOTH the Shows mode count AND the Seasons mode count
   * (since reviewing the only season ≡ reviewing the show); a
   * Season-level review on a miniseries-flagged show similarly
   * counts in both modes.
   *
   * The flag exists on the snapshot's Show object (computed at
   * bootstrap time) so consumers — SummaryPanel, future detail
   * page badges — read one canonical value rather than each
   * re-deriving the precedence rule.
   */
  isMiniseries: boolean;
  /**
   * Most-recent activity across any review level. Primary sort
   * key on /television and /television/watching (mirrors /films's
   * latestWatchedDate role). Stays current as Malcolm logs new
   * episode reviews even when no Season/Show review has been
   * written yet.
   */
  latestActivityDate: string;
  /** Most-recent review's rating. Surfaced on card when no per-review filter is active. */
  primaryRating: number | null;
  /** Most-recent review's liked flag. */
  liked: boolean;
};

export type TvSummary = {
  totalShows: number;
  totalShowReviews: number;
  totalSeasonReviews: number;
  totalEpisodeReviews: number;
  /**
   * Per-review across all levels — lifetime distribution. The
   * SummaryPanel uses this for the default "all levels" mode.
   */
  ratingDistribution: Record<string, number>;
  /**
   * Per-level distributions, pre-computed at snapshot-write time
   * so the SummaryPanel's Seasons / Shows / Episodes toggle can
   * swap chart data without re-scanning the reviews array on
   * every render. Keys: "show" | "season" | "episode".
   */
  ratingDistributionByLevel: {
    show: Record<string, number>;
    season: Record<string, number>;
    episode: Record<string, number>;
  };
  /** Per-show, deduped (a show with two genres counts in both). */
  genreDistribution: Record<string, number>;
  /** Per-show, deduped — uses premiereYear bucketed into decades. */
  decadeDistribution: Record<string, number>;
  /** Shows with any in-progress season. Surfaced as a CTA to /television/watching. */
  showsInProgressCount: number;
  /** Unique shows with any review activity in the current calendar year. */
  thisYearCount: number;
  /**
   * Total shows the user has tracked on Serializd as watched —
   * includes both the reviewed catalog (`shows.length`) AND the
   * watched-only shadow catalog (`watchedOnlyShows.length`). Not
   * displayed anywhere in the current UI per editorial decision;
   * stored so future surfaces (e.g. a "watched, never written
   * up" page or a "I've watched X shows in my life" stat) can
   * read one canonical number rather than summing arrays.
   */
  totalWatchedShows: number;
  /**
   * Shows the user has watched on Serializd but never reviewed at
   * any level. Stored on the snapshot's `watchedOnlyShows` array
   * (not on `shows`, since those are review-bearing entities). Not
   * surfaced in current UI; available for future iterations.
   */
  totalWatchedOnlyShows: number;
};

/**
 * Recompute a TvSummary from a (narrowed) show array — the request-time
 * mirror of the snapshot writer's `aggregateSummary`
 * (scripts/bootstrap-serializd-snapshot.mjs). Pure and client-safe.
 *
 * Honours the miniseries double-count rule via the canonical `modesForReview`
 * (lib/feeds/serializd-mode-counts.mjs) at every per-level count surface (per
 * the television-double-count memory). The
 * watched-only totals can't be derived from the reviewed `Show[]` alone, so
 * they're carried through from the shipped corpus-wide summary — they're not
 * surfaced in any tile, so a stale value there is invisible (documented).
 */
export function summarizeShows(
  shows: Show[],
  // The shipped corpus-wide summary, for the watched-only passthrough fields
  // that can't be derived from the reviewed shows.
  baseSummary: TvSummary,
): TvSummary {
  const currentYear = new Date().getUTCFullYear();
  let totalShowReviews = 0;
  let totalSeasonReviews = 0;
  let totalEpisodeReviews = 0;
  let showsInProgressCount = 0;
  let thisYearCount = 0;
  const ratingDistribution: Record<string, number> = {};
  const ratingDistributionByLevel = {
    show: {} as Record<string, number>,
    season: {} as Record<string, number>,
    episode: {} as Record<string, number>,
  };
  const genreDistribution: Record<string, number> = {};
  const decadeDistribution: Record<string, number> = {};

  const bump = (b: Record<string, number>, k: string) => {
    b[k] = (b[k] ?? 0) + 1;
  };

  for (const show of shows) {
    if (show.inProgressSeasonNumbers.length > 0) showsInProgressCount++;

    // "Watched this year" = any review activity in the current calendar year
    // by WATCH date (matches the writer + user intuition).
    const watchedThisYear = show.reviews.some(
      (r) =>
        r.watchedDate &&
        Number.parseInt(r.watchedDate.slice(0, 4), 10) === currentYear,
    );
    if (watchedThisYear) thisYearCount++;

    for (const r of show.reviews) {
      const ratingKey = r.rating !== null ? String(r.rating) : null;
      for (const mode of modesForReview(r.level, show.isMiniseries)) {
        if (mode === "show") totalShowReviews++;
        else if (mode === "season") totalSeasonReviews++;
        else if (mode === "episode") totalEpisodeReviews++;
        if (ratingKey) bump(ratingDistributionByLevel[mode], ratingKey);
      }
      // Lifetime distribution is one-count-per-review (no double-count).
      if (ratingKey) bump(ratingDistribution, ratingKey);
    }

    if (show.tmdb?.genres) {
      for (const g of show.tmdb.genres) bump(genreDistribution, g);
    }
    if (Number.isFinite(show.premiereYear) && show.premiereYear > 0) {
      const decade = `${Math.floor(show.premiereYear / 10) * 10}s`;
      bump(decadeDistribution, decade);
    }
  }

  return {
    totalShows: shows.length,
    totalShowReviews,
    totalSeasonReviews,
    totalEpisodeReviews,
    ratingDistribution,
    ratingDistributionByLevel,
    genreDistribution,
    decadeDistribution,
    showsInProgressCount,
    thisYearCount,
    // Watched-only totals are corpus-wide and undisplayed; pass through.
    totalWatchedShows: baseSummary.totalWatchedShows,
    totalWatchedOnlyShows: baseSummary.totalWatchedOnlyShows,
  };
}

/**
 * Watched-only show entry — the user has marked it watched on
 * Serializd but never written any kind of review. Lives on the
 * snapshot's `watchedOnlyShows` array (separate from `shows`,
 * which is reserved for review-bearing entities).
 *
 * Minimal shape — no TMDB enrichment, no review-derived fields.
 * Stored as a forward-investment for future surfaces (e.g. a
 * "watched, not yet written up" reading list, a sitewide
 * "lifetime TV watched" stat). Not surfaced in current UI.
 */
export type WatchedOnlyShow = {
  serializdShowId: number;
  name: string;
  premiereDate: string;
  bannerImage: string | null;
  numSeasons: number;
  numEpisodes: number;
  watchedSeasonIds: number[];
  dateAdded: string | null;
};

// ─── Lists + favorites (editorial landing) ───────────────────────
//
// Pulled from Serializd's JSON API by the slow-cadence
// scripts/refresh-tv-lists.mjs pass (NOT the hourly review refresh).
// The platform is the curation surface — Malcolm arranges his
// favorites/lists on Serializd, the site reflects them. Both
// reference the reviewed corpus by `serializdShowId` (= TMDB tv id)
// so the landing can render rich ShowCards via getShowBySerializdId().

/**
 * One ranked entry in a Serializd list. Serializd lists are curated at
 * the SHOW+SEASON level, not the show level: a single list can rank
 * several seasons of the same show as distinct entries (e.g. three
 * Real Housewives of Atlanta seasons), and miniseries entries carry no
 * season at all. So a list item is a (show, season, position) triple,
 * not a bare show id — `showId` joins to the reviewed corpus for the
 * rich card, `seasonNumber` deep-links to the season block, and
 * `position` is the rank (0-based, ascending = better).
 */
export type ShowListItem = {
  /** Serializd show id (= TMDB tv id); joins to the reviewed corpus. */
  showId: number;
  /** TMDB season id, or null for a show-level entry (e.g. a miniseries
   *  ranked as a whole rather than by season). */
  seasonId: number | null;
  /** Display season name as Serializd labels it ("Season 6"), or null
   *  for a show-level entry. */
  seasonName: string | null;
  /** Season number for the `#season-{n}` deep link, or null when the
   *  entry is show-level. */
  seasonNumber: number | null;
  /** Rank within the list (0-based, ascending). Meaningful only when
   *  the parent list `isRanked`. */
  position: number;
  /** Show title as Serializd labels it — the standalone fallback for an
   *  entry whose show isn't in the reviewed corpus. */
  showName: string;
};

/**
 * One of Malcolm's public Serializd lists, fetched by id via
 * GET /api/list/{id} (the username→lists listing endpoint is dead on
 * Serializd's backend, so the refresh script pulls a configured set of
 * list ids). Mirrors FilmList in the /films cluster, but season-aware:
 * `items` carries the ranked SHOW+SEASON entries (see ShowListItem),
 * since a TV list ranks seasons, not shows.
 */
export type ShowList = {
  /** Numeric Serializd list id (the publish-set handle, e.g. 451075). */
  id: number;
  /** Our own route slug, derived from the list name (not Serializd's). */
  slug: string;
  name: string;
  /** List prose / methodology, if any. May be "". */
  description: string;
  /** True when Serializd marks the list as ranked (drives rank numbers
   *  in the detail render). */
  isRanked: boolean;
  /** Ranked SHOW+SEASON entries, in list (position) order. */
  items: ShowListItem[];
  /** Canonical Serializd list URL. */
  url: string;
};

/**
 * A Serializd profile favorite show, in the order Malcolm arranged
 * them. Thin reference — `serializdShowId` joins to the reviewed
 * corpus for the rich card (poster, rating, review link); `name` is
 * the standalone fallback label for the rare favorite that isn't in
 * the corpus.
 */
export type ShowFavorite = {
  serializdShowId: number;
  name: string;
  /**
   * w342 TMDB poster. Resolved at scrape time — from the reviewed
   * corpus when the show is in it, else a direct TMDB /tv/{id}
   * lookup (serializdShowId IS the TMDB id), since favorites are
   * often shows Malcolm loves but hasn't written prose reviews for
   * and so can't borrow a corpus poster. Null only if TMDB had none.
   */
  posterUrl: string | null;
};

// ─── Genre slug helpers ──────────────────────────────────────────

/**
 * Convert a TMDB TV genre name to a URL-safe slug. Identical
 * implementation to /films's slugifyGenre — kept as a separate
 * export rather than a shared util because TMDB's TV and Movie
 * genre lists overlap but aren't identical, and the route's
 * reverse-lookup walks `genreDistribution` (TV-only) so cross-
 * cluster reuse would invite the wrong genre being surfaced.
 *
 * Examples:
 *   "Drama"      → "drama"
 *   "Reality"    → "reality"
 *   "Sci-Fi & Fantasy" → "sci-fi--fantasy" (intentional double
 *     hyphen — the "&" stripped + the surrounding spaces both
 *     became hyphens. Rare enough that we tolerate the artifact
 *     rather than special-casing.)
 */
export function slugifyGenre(genre: string): string {
  return genre
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/**
 * Multi-word TV genres whose TMDB casing should be preserved
 * mid-sentence — they read as proper genre labels (compound
 * proper-noun categories) rather than generic descriptors.
 * Single-word genres fall through to .toLowerCase() per normal
 * sentence-case prose.
 *
 * Snapshot inventory at the time of writing (2026-05-07): three
 * multi-word genres exist in TMDB's TV vocabulary —
 * "Action & Adventure," "Sci-Fi & Fantasy," and "War & Politics."
 * Add to the set here when TMDB grows new multi-word genres.
 */
const GENRE_PRESERVE_CASE: ReadonlySet<string> = new Set([
  "Action & Adventure",
  "Sci-Fi & Fantasy",
  "War & Politics",
]);

/**
 * Inverse of slugifyGenre for the multi-word genres whose proper
 * case can't be reconstructed from the slug alone — the `&` is
 * stripped on slugification, leaving double-dashes the
 * slug-to-titlecase walker can't resolve back. Single-word
 * genre slugs round-trip cleanly without this map.
 */
const SLUG_TO_GENRE: Record<string, string> = {
  "action--adventure": "Action & Adventure",
  "sci-fi--fantasy": "Sci-Fi & Fantasy",
  "war--politics": "War & Politics",
};

/**
 * Render a TMDB genre name in mid-sentence prose register.
 * Single-word genres lowercase ("Drama" → "drama"); multi-word
 * compound genres preserve TMDB's casing ("Sci-Fi & Fantasy"
 * stays as-is so the genre label reads as a proper category
 * rather than a flat descriptor).
 */
export function genreInProse(genre: string): string {
  return GENRE_PRESERVE_CASE.has(genre) ? genre : genre.toLowerCase();
}

/**
 * Look up the proper TMDB genre name for a URL slug. Handles
 * the multi-word special cases the slug-to-titlecase walker
 * loses information on. Returns null when the slug isn't a
 * known multi-word case — caller should fall back to its own
 * titlecase reconstruction.
 */
export function genreFromSlug(slug: string): string | null {
  return SLUG_TO_GENRE[slug] ?? null;
}

/**
 * Reverse-lookup a TMDB TV genre name from a URL slug. Walks the
 * snapshot's genreDistribution keys (typically <20 genres) so this
 * is O(genres) — trivial. Returns null when the slug doesn't match
 * any active genre — caller should `notFound()`.
 */
export function findGenreBySlug(
  genreDistribution: Record<string, number>,
  slug: string,
): string | null {
  for (const genre of Object.keys(genreDistribution)) {
    if (slugifyGenre(genre) === slug) return genre;
  }
  return null;
}

// ─── Show slug ────────────────────────────────────────────────────

/**
 * Convert a show name into the slug component of its detail-page
 * URL. The full slug is `${slugifyShow(name)}-${premiereYear}` —
 * see Show.slug above. Trailing hyphen removed so single-word
 * shows like "Severance" don't become "severance-".
 */
export function slugifyShow(name: string): string {
  return name
    .toLowerCase()
    .replace(/[''']/g, "") // strip apostrophes (don't substitute hyphens for them)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Level discriminator ──────────────────────────────────────────

/**
 * Infer the review level from the raw Serializd API fields. Used
 * by the bootstrap parser to set `Review.level` at snapshot-write
 * time. Exported so the editorial-cleaning pass and the
 * incremental refresh can re-derive the level on freshly-fetched
 * API entries without duplicating the rule.
 *
 * The discriminator hierarchy:
 *   1. `seasonId === null` → "show" (Show-level review)
 *   2. `episodeNumber === null` → "season" (Season-level review)
 *   3. otherwise → "episode" (Episode-level review)
 *
 * Verified against the diary API: a Season review on RHOA Season
 * 10 has `seasonId: 94462, episodeNumber: null`; an Episode review
 * on the same season has `seasonId: 94462, episodeNumber: 2`.
 */
export function inferReviewLevel(api: {
  seasonId: number | null;
  episodeNumber: number | null;
}): ReviewLevel {
  if (api.seasonId === null) return "show";
  if (api.episodeNumber === null) return "season";
  return "episode";
}

// ─── Filter + sort spec ──────────────────────────────────────────

/**
 * Watched-date filter. Same discriminated-union shape as /films
 * — mutually-exclusive `watchedYears` (multi-select set of exact
 * years) vs `watchedWindow` (rolling 12mo). The empty branch
 * makes the whole sub-filter optional.
 *
 * Filters by `review.watchedDate`, not `review.reviewDate` — the
 * user-facing event is when Malcolm watched the episode/season,
 * not when he typed up the review.
 */
type WatchedDateFilter =
  | { watchedYears: number[]; watchedWindow?: never }
  | { watchedWindow: "12mo"; watchedYears?: never }
  | { watchedYears?: undefined; watchedWindow?: undefined };

export type ShowFilters = {
  /** Empty/undefined = no filter. Otherwise: keep show if any review's rating ∈ this set. */
  ratings?: number[];
  premiereYearMin?: number;
  premiereYearMax?: number;
  /** Empty/undefined = no filter. Otherwise: keep show if show's genres intersect this set. */
  genres?: string[];
  /**
   * Empty/undefined = no filter. Otherwise: keep show if its
   * canonical PRIMARY network (canonNet of networks[0]) ∈ this set.
   * Matching on the primary network — consistent with the stats
   * primary-network counting rule — means a show appears under
   * exactly one network filter, never several. Carries canonical
   * names ("HBO / Max"), so the filter chip and the detail-page
   * network label agree.
   */
  networks?: string[];
  /**
   * Empty/undefined = no filter. Otherwise: keep show if its TMDB
   * series type (Scripted / Miniseries / Reality / Documentary /
   * etc.) ∈ this set. Low-cardinality facet, so a plain chip rail.
   */
  types?: string[];
  /**
   * Card-kind scope. Undefined = both Show and Season cards
   * surface together (default). "show" / "season" narrows the
   * grid to that level only. Lives as `?cardKind=show|season`
   * URL param so filter state stays shareable.
   *
   * Distinct from the SummaryPanel's mode toggle: this filter
   * scopes the GRID; the panel toggle scopes the CHART. The two
   * intentionally do not auto-sync — chart vs. list are different
   * mental models, and forcing one to follow the other would
   * surprise users who are exploring one dimension while keeping
   * the other stable.
   */
  cardKind?: "show" | "season";
  /** Title search (?title=), length ≥ 2. TV has no director field, so
   *  title is the only search dimension here. Carried so generateMetadata
   *  can noindex the search state; the hybrid matching is precomputed
   *  server-side and passed to the card filter as `matchIds` (keeps this
   *  client-safe module free of the Fuse dep). */
  titleQuery?: string;
  // ── Wave B entity facets (WS6) ──────────────────────────────────
  // Selected entity SLUGS (slugifyEntity of the canonical display name).
  // OR within a facet, AND across. Read from `card.show.enrichment` +
  // the shared canonicalizers, so the vocabulary matches the stats
  // tiles. network + type (above) are the WS3-era TV facets; these add
  // the enrichment-backed ones. (TV has no director/writer/studio.)
  /** Top-billed actor (≥3 eps, acting shows only) name slugs. */
  actors?: string[];
  /** Creator name slugs (source authors demoted, matching the stats). */
  creators?: string[];
  /** Owning conglomerate (conglomerateOfNet) name slugs. */
  conglomerates?: string[];
  /** Original-language display-name slugs (e.g. "japanese"). */
  languages?: string[];
  /** Country-of-origin display-name slugs. */
  countries?: string[];
  /** Premiere-decade slugs ("2010s", …) — derived from premiereYear. */
  decades?: string[];
  // ── Exclusion (NOT) facets — stats-page query model (STATS-FILTERS §2) ──
  // Mirror each includable dimension. A show is DROPPED if it matches ANY
  // excluded value in a dimension (AND NOT), composed with the include
  // logic. Empty/undefined = no exclusion. ADDITIVE and backward-compatible:
  // the reviews surfaces never set them, so their behaviour is unchanged.
  excludeRatings?: number[];
  excludeGenres?: string[];
  excludeNetworks?: string[];
  excludeTypes?: string[];
  excludeActors?: string[];
  excludeCreators?: string[];
  excludeConglomerates?: string[];
  excludeLanguages?: string[];
  excludeCountries?: string[];
  excludeDecades?: string[];
} & WatchedDateFilter;

/**
 * Single source of truth for valid sort dimensions. Mirrors
 * /films's FILM_SORTS shape but uses `latest-activity` instead of
 * `latest-watched` because TV's primary sort key is the most
 * recent review activity (across any level), not specifically a
 * watch event.
 *
 * `latest-activity-desc` is the default — newest review at top,
 * matches the snapshot's pre-sorted order.
 */
export const SHOW_SORTS = [
  "latest-activity-desc",
  "latest-activity-asc",
  "premiere-year-desc",
  "premiere-year-asc",
  "rating-desc",
  "rating-asc",
  "show-name-asc",
] as const;

export type ShowSort = (typeof SHOW_SORTS)[number];

/** Default sort when none specified. */
export const DEFAULT_SHOW_SORT: ShowSort = "latest-activity-desc";

/**
 * Output of applyShowFilters: the surviving show + the qualifying
 * review to surface on the card. Mirrors /films's AppliedFilm
 * shape so the listing page render code can be near-identical.
 *
 * When a per-review filter is active, `qualifyingReview` is the
 * most recent review that matches and `positionDate` is that
 * review's reviewDate (so a 4★ rewatch from 2024 lands where a
 * 2024-reviewed show should land, not where the original watch
 * would).
 */
export type AppliedShow = {
  show: Show;
  qualifyingReview: Review | null;
  cardRating: number | null;
  positionDate: string;
  perReviewFilterActive: boolean;
};

// ─── Card variants (the load-bearing rendering primitive) ───────

/**
 * Discriminator for the three card variants the cluster renders:
 *   • "show":               Show-level review with prose. /television.
 *   • "season":             Season-level review with prose. /television.
 *   • "season-in-progress": Episode-only-reviewed season,
 *                           no Season review, show has no Show
 *                           review. /television/watching.
 *
 * Why prose is required at Show + Season level (the level-specific
 * scope filter): rating-only Show or Season entries in Serializd
 * are usually placeholder logs Malcolm intends to write up later.
 * Surfacing them as cards before the writeup lands would create
 * empty-ish cards. The cleanup pass surfaces these in
 * `cleanup/missing-prose.md` so Malcolm can backfill prose or
 * accept the drop.
 *
 * Episodes are exempt from the prose requirement — episode entries
 * are quick-log territory, and episode reviews surface as nested
 * rows inside the Season card / detail page rather than as top-
 * level cards.
 */
export type CardKind = "show" | "season" | "season-in-progress";

/**
 * One card on the /television listing. Multiple cards per show
 * are possible — a show with a Show-level review AND two Season
 * reviews produces three cards (1 Show + 2 Season). No
 * deduplication, no merging — each review-as-completable-unit
 * gets its own slot.
 */
export type CompletedCard = {
  show: Show;
  /**
   * The Show-level review (cardKind="show") or Season-level
   * review (cardKind="season"). Always present and always has
   * prose for completed cards (level-specific scope filter).
   */
  review: Review;
  cardKind: "show" | "season";
  /** Null on Show cards; the season number on Season cards. */
  seasonNumber: number | null;
};

/**
 * One card on the /television/watching listing. Each card
 * represents an in-progress season — episode-only reviews exist,
 * no Season-level review, and the show has no Show-level review
 * (rule 3 from the plan suppresses miniseries from /watching).
 *
 * `episodeReviews` is the list of qualifying episode reviews on
 * this season (rated or with prose), sorted reviewDate desc. The
 * card's "watching since" / "last watched" datelines and the
 * progress bar derive from these.
 */
export type InProgressCard = {
  show: Show;
  seasonNumber: number;
  episodeReviews: Review[];
};

// ─── Card builders ───────────────────────────────────────────────

/**
 * Build the flat list of completed cards from the snapshot's
 * shows. One card per qualifying Show- or Season-level review.
 * The level-specific scope filter (Show + Season require prose)
 * is applied here so consumers see only cards worth surfacing.
 *
 * Order of emission per show: Show card first (if any), then
 * Season cards in seasonNumber asc. The caller then re-sorts
 * the flat list by the active sort dimension.
 */
export function buildCompletedCards(shows: Show[]): CompletedCard[] {
  const cards: CompletedCard[] = [];
  for (const show of shows) {
    for (const review of show.reviews) {
      if (review.level === "episode") continue;
      if (review.reviewText.trim() === "") continue;
      cards.push({
        show,
        review,
        cardKind: review.level,
        seasonNumber:
          review.level === "season"
            ? seasonNumberForReview(show, review)
            : null,
      });
    }
  }
  return cards;
}

/**
 * Build the in-progress cards from the snapshot. One card per
 * (show, in-progress season) pair. Pulls the episode reviews
 * for each card from `show.reviews` filtered by season + level.
 */
export function buildInProgressCards(shows: Show[]): InProgressCard[] {
  const cards: InProgressCard[] = [];
  for (const show of shows) {
    for (const seasonNumber of show.inProgressSeasonNumbers) {
      const episodeReviews = show.reviews
        .filter(
          (r) =>
            r.level === "episode" &&
            seasonNumberForReview(show, r) === seasonNumber,
        )
        .sort((a, b) => b.reviewDate.localeCompare(a.reviewDate));
      cards.push({ show, seasonNumber, episodeReviews });
    }
  }
  return cards;
}

/** Resolve a Review's seasonNumber via show.seasons. Returns null
 *  on Show-level reviews (no seasonId) and on the rare TMDB-drift
 *  case where the seasonId isn't in show.seasons. Exported so the
 *  detail-page route can drop its private re-declaration of the
 *  same logic and stay in lockstep with this utils source. */
export function seasonNumberForReview(
  show: Show,
  review: Review,
): number | null {
  if (review.seasonId === null) return null;
  const season = show.seasons.find((s) => s.serializdId === review.seasonId);
  return season ? season.seasonNumber : null;
}

// ─── Available-facet derivation ──────────────────────────────────

/**
 * Distinct canonical primary networks across a show set, sorted by
 * frequency descending so the filter chip rail leads with the
 * most-common destinations. Routes through primaryNetwork so the chip
 * vocabulary matches the network filter predicate (and the stats
 * counts). Shared by /television/reviews and /television/genre/[slug]
 * so both render the identical rail.
 */
export function deriveAvailableNetworks(shows: Show[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const show of shows) {
    const primary = primaryNetwork(show.tmdb?.networks ?? []);
    if (primary) counts.set(primary, (counts.get(primary) ?? 0) + 1);
  }
  // [name, count] tuples, alphabetical — the rail is scanned by name and
  // the count is the discovery scent shown on each chip.
  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

/**
 * Distinct TMDB series types across a show set, frequency-sorted.
 * Low cardinality (Scripted / Miniseries / Reality / Documentary / …),
 * so the UI renders a plain chip rail rather than a typeahead.
 */
export function deriveAvailableTypes(shows: Show[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const show of shows) {
    const t = show.tmdb?.type;
    if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  // [name, count] tuples, alphabetical — see deriveAvailableNetworks.
  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

// ─── Card-level filter + sort ────────────────────────────────────

/**
 * Apply per-show + per-review filters to a CompletedCard[] and
 * sort the result. Mirrors applyShowFilters but operates at the
 * card level so a show with N qualifying cards can have a subset
 * surface (e.g. Severance Season 1 review filtered IN, Season 2
 * review filtered OUT by a different rating filter).
 *
 * Per-show filters (premiereYear, genres) drop the card when its
 * parent show doesn't match. Per-review filters (ratings,
 * watchedYears, watchedWindow) drop the card when its surfaced
 * review doesn't match.
 */
/** Premiere-decade label for a year, e.g. 2018 → "2010s". */
export function showDecadeLabel(year: number): string {
  return `${Math.floor(year / 10) * 10}s`;
}

/** The Wave B facet keys a show exposes. */
export type ShowFacet =
  | "actors"
  | "creators"
  | "conglomerates"
  | "languages"
  | "countries"
  | "decades";

/**
 * Canonical Wave B facet values for a show — DISPLAY names (pre-slug),
 * via the same canonicalizers the stats use. The SINGLE source both the
 * card filter predicate and the available-value derivation read, so the
 * two vocabularies can't drift. Actor names honour the acting-show gate
 * the stats apply (reality/talk/doc cast don't count as actors); the
 * conglomerate comes from the snapshot networks (same as the stats).
 */
export function showFacetValues(show: Show): Record<ShowFacet, string[]> {
  const e = show.enrichment;
  const acting = isActingShow({
    type: show.tmdb?.type ?? null,
    genres: show.tmdb?.genres ?? [],
  });
  return {
    actors: e && acting ? tvActorNames({ cast: e.cast }) : [],
    creators: e ? creatorNames({ creators: e.creators }) : [],
    conglomerates: [conglomerateOfNet(show.tmdb?.networks ?? [])],
    languages: e?.language ? [languageName(normalizeLanguage(e.language))] : [],
    countries: e?.country ? [countryName(normalizeCountry(e.country))] : [],
    decades: [showDecadeLabel(show.premiereYear)],
  };
}

/**
 * Per-facet value→count distributions across a show corpus, each sorted
 * count desc then name asc. One pass via showFacetValues (shared
 * vocabulary with the filter). `count` is the number of logged shows
 * carrying that value. Feeds the sidebar chip rails + 6c typeahead.
 */
export function showFacetDistributions(
  shows: Show[],
): Record<ShowFacet, [string, number][]> {
  const facets: ShowFacet[] = [
    "actors",
    "creators",
    "conglomerates",
    "languages",
    "countries",
    "decades",
  ];
  const maps = new Map<ShowFacet, Map<string, number>>(
    facets.map((f) => [f, new Map<string, number>()]),
  );
  for (const show of shows) {
    const fv = showFacetValues(show);
    for (const facet of facets) {
      const m = maps.get(facet)!;
      for (const name of fv[facet]) m.set(name, (m.get(name) ?? 0) + 1);
    }
  }
  const out = {} as Record<ShowFacet, [string, number][]>;
  for (const facet of facets) {
    out[facet] = [...maps.get(facet)!.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );
  }
  return out;
}

/**
 * The low-cardinality facet groups for the TV reviews sidebar, built
 * from the corpus (shared by the reviews page and the genre route).
 * Network + type already have their own WS3 controls; actors/creators
 * are high-cardinality (deep-links now, typeahead in 6c), so the rails
 * here are language, country, network group (conglomerate), and decade.
 */
export function showEntityFacets(shows: Show[]): FacetGroup[] {
  const d = showFacetDistributions(shows);
  // Sidebar rails sort alphabetically (scanned by name); the count-desc
  // ranking in showFacetDistributions stays untouched for stats/sitemap.
  // Decade labels are "YYYYs", so alpha reads as chronological.
  const byName = (opts: [string, number][]): [string, number][] =>
    [...opts].sort((a, b) => a[0].localeCompare(b[0]));
  return [
    {
      key: "languages",
      param: "language",
      label: "Language",
      options: byName(d.languages),
    },
    {
      key: "countries",
      param: "country",
      label: "Country",
      options: byName(d.countries),
    },
    {
      key: "conglomerates",
      param: "conglomerate",
      label: "Network group",
      options: byName(d.conglomerates),
    },
    {
      key: "decades",
      param: "decade",
      label: "Decade",
      options: byName(d.decades),
    },
  ];
}

/** True if any Wave B facet filter is active (gates the per-card work). */
function anyShowFacetActive(f: ShowFilters): boolean {
  return Boolean(
    f.actors?.length ||
    f.creators?.length ||
    f.conglomerates?.length ||
    f.languages?.length ||
    f.countries?.length ||
    f.decades?.length ||
    // Exclusion facets (mirror the includes) also need the enrichment pass.
    f.excludeActors?.length ||
    f.excludeCreators?.length ||
    f.excludeConglomerates?.length ||
    f.excludeLanguages?.length ||
    f.excludeCountries?.length ||
    f.excludeDecades?.length,
  );
}

export function applyCompletedCardFilters(
  cards: CompletedCard[],
  filters: ShowFilters,
  sort: ShowSort = DEFAULT_SHOW_SORT,
  // Precomputed fuzzy-search match set (SHOW ids) for the ?q= filter.
  // null/undefined = no search active. Matching is done by the caller
  // via the server-only fuzzy-search helper (over the unique shows, by
  // title) so this client-safe module stays free of the Fuse dep.
  matchIds?: Set<string> | null,
): CompletedCard[] {
  const twelveMoCutoffMs =
    filters.watchedWindow === "12mo" ? computeTwelveMoCutoffMs() : null;
  // Skip the per-card enrichment work entirely on the default listing.
  const waveBActive = anyShowFacetActive(filters);
  const result: CompletedCard[] = [];
  for (const card of cards) {
    // Search (?q=): drop cards whose parent show isn't in the
    // fuzzy-match set. Composes (AND) with every predicate below.
    if (matchIds && !matchIds.has(card.show.id)) continue;
    // Card-kind scope (cheapest predicate first — discriminator
    // check on a 4-byte string vs the per-show numeric / array
    // predicates below).
    if (filters.cardKind && card.cardKind !== filters.cardKind) continue;
    // Per-show predicates
    if (
      filters.premiereYearMin !== undefined &&
      card.show.premiereYear < filters.premiereYearMin
    ) {
      continue;
    }
    if (
      filters.premiereYearMax !== undefined &&
      card.show.premiereYear > filters.premiereYearMax
    ) {
      continue;
    }
    if (filters.genres && filters.genres.length > 0) {
      const showGenres = card.show.tmdb?.genres;
      if (!showGenres) continue;
      if (!filters.genres.some((g) => showGenres.includes(g))) continue;
    }
    // Genre exclusion (AND NOT): drop if the show's genres intersect the
    // excluded set. A show with no genres can't match an exclusion.
    if (filters.excludeGenres && filters.excludeGenres.length > 0) {
      const showGenres = card.show.tmdb?.genres;
      if (showGenres && filters.excludeGenres.some((g) => showGenres.includes(g))) {
        continue;
      }
    }
    if (filters.networks && filters.networks.length > 0) {
      // Match on the canonical PRIMARY network so a show lands under
      // exactly one network filter (same rule the stats counts use).
      const primary = primaryNetwork(card.show.tmdb?.networks ?? []);
      if (!primary || !filters.networks.includes(primary)) continue;
    }
    // Network exclusion (AND NOT): drop if the show's PRIMARY network is in
    // the excluded set (same primary-network rule as the include above).
    if (filters.excludeNetworks && filters.excludeNetworks.length > 0) {
      const primary = primaryNetwork(card.show.tmdb?.networks ?? []);
      if (primary && filters.excludeNetworks.includes(primary)) continue;
    }
    if (filters.types && filters.types.length > 0) {
      const showType = card.show.tmdb?.type;
      if (!showType || !filters.types.includes(showType)) continue;
    }
    // Type exclusion (AND NOT). A show with no type can't match an exclusion.
    if (filters.excludeTypes && filters.excludeTypes.length > 0) {
      const showType = card.show.tmdb?.type;
      if (showType && filters.excludeTypes.includes(showType)) continue;
    }
    // ── Wave B entity facets (enrichment-backed) ────────────
    // OR within each facet; AND across them. Values come from the shared
    // showFacetValues (same vocabulary as the stats + the available
    // lists). A card whose show has no enrichment can't confirm a match
    // and is dropped when that facet is active. Skipped unless active.
    if (waveBActive) {
      const fv = showFacetValues(card.show);
      if (filters.actors?.length && !facetHit(filters.actors, fv.actors))
        continue;
      if (filters.creators?.length && !facetHit(filters.creators, fv.creators))
        continue;
      if (
        filters.conglomerates?.length &&
        !facetHit(filters.conglomerates, fv.conglomerates)
      )
        continue;
      if (
        filters.languages?.length &&
        !facetHit(filters.languages, fv.languages)
      )
        continue;
      if (
        filters.countries?.length &&
        !facetHit(filters.countries, fv.countries)
      )
        continue;
      if (filters.decades?.length && !facetHit(filters.decades, fv.decades))
        continue;

      // ── Exclusion (AND NOT) on the same enrichment facets ──
      if (filters.excludeActors?.length && facetHit(filters.excludeActors, fv.actors))
        continue;
      if (
        filters.excludeCreators?.length &&
        facetHit(filters.excludeCreators, fv.creators)
      )
        continue;
      if (
        filters.excludeConglomerates?.length &&
        facetHit(filters.excludeConglomerates, fv.conglomerates)
      )
        continue;
      if (
        filters.excludeLanguages?.length &&
        facetHit(filters.excludeLanguages, fv.languages)
      )
        continue;
      if (
        filters.excludeCountries?.length &&
        facetHit(filters.excludeCountries, fv.countries)
      )
        continue;
      if (filters.excludeDecades?.length && facetHit(filters.excludeDecades, fv.decades))
        continue;
    }
    // Per-review predicates apply to the card's surfaced review
    if (filters.ratings && filters.ratings.length > 0) {
      if (
        card.review.rating === null ||
        !filters.ratings.includes(card.review.rating)
      ) {
        continue;
      }
    }
    // Rating exclusion (AND NOT): drop a card whose surfaced review carries
    // an excluded rating. Unrated reviews (null) can't match an exclusion.
    if (filters.excludeRatings && filters.excludeRatings.length > 0) {
      if (
        card.review.rating !== null &&
        filters.excludeRatings.includes(card.review.rating)
      ) {
        continue;
      }
    }
    if (filters.watchedYears && filters.watchedYears.length > 0) {
      const year = Number.parseInt(card.review.watchedDate.slice(0, 4), 10);
      if (!filters.watchedYears.includes(year)) continue;
    }
    if (twelveMoCutoffMs !== null) {
      const watchedMs = new Date(card.review.watchedDate).getTime();
      if (!Number.isFinite(watchedMs) || watchedMs < twelveMoCutoffMs) continue;
    }
    result.push(card);
  }
  return sortCompletedCards(result, sort);
}

function sortCompletedCards(
  arr: CompletedCard[],
  sort: ShowSort,
): CompletedCard[] {
  return [...arr].sort((a, b) => {
    switch (sort) {
      case "latest-activity-desc":
        return b.review.reviewDate.localeCompare(a.review.reviewDate);
      case "latest-activity-asc":
        return a.review.reviewDate.localeCompare(b.review.reviewDate);
      case "premiere-year-desc":
        return b.show.premiereYear - a.show.premiereYear;
      case "premiere-year-asc":
        return a.show.premiereYear - b.show.premiereYear;
      case "rating-desc": {
        const ratingCmp =
          (b.review.rating ?? -Infinity) - (a.review.rating ?? -Infinity);
        if (ratingCmp !== 0) return ratingCmp;
        return b.review.reviewDate.localeCompare(a.review.reviewDate);
      }
      case "rating-asc": {
        const ratingCmp =
          (a.review.rating ?? Infinity) - (b.review.rating ?? Infinity);
        if (ratingCmp !== 0) return ratingCmp;
        return b.review.reviewDate.localeCompare(a.review.reviewDate);
      }
      case "show-name-asc":
        return (
          stripLeadingArticle(a.show.name).localeCompare(
            stripLeadingArticle(b.show.name),
          ) || b.review.reviewDate.localeCompare(a.review.reviewDate)
        );
    }
  });
}

// ─── Filtering + sorting ──────────────────────────────────────────

/**
 * Apply per-show and per-review filters, then sort the result.
 * Same shape as /films's applyFilters — same predicates, same
 * qualifying-review semantics, same stable-sort relying on JS's
 * Array.sort to preserve snapshot order on ties.
 *
 * Per-show filters (premiereYear, genres) drop a show entirely
 * when the show itself doesn't match. Per-review filters
 * (ratings, watchedYears, watchedWindow) drop a show when none
 * of its reviews match.
 */
export function applyShowFilters(
  shows: Show[],
  filters: ShowFilters,
  sort: ShowSort = DEFAULT_SHOW_SORT,
): AppliedShow[] {
  const hasPerReviewFilter =
    (filters.ratings && filters.ratings.length > 0) ||
    (filters.excludeRatings && filters.excludeRatings.length > 0) ||
    (filters.watchedYears && filters.watchedYears.length > 0) ||
    filters.watchedWindow !== undefined;

  // Wave B facet predicates (network / type / enrichment-backed entities +
  // their exclusions). The Show[] variant historically only filtered
  // year/genre/ratings — the stats narrowing needs the full facet surface,
  // so it's added here. No production reviews consumer uses this function
  // (they all run applyCompletedCardFilters), so this is additive-only.
  const waveBActive = anyShowFacetActive(filters);

  // Anchor the rolling-12mo cutoff to request time, not module-load
  // time — same calendar-year arithmetic as /films to dodge the
  // leap-year-edge bug that millisecond subtraction introduces.
  const twelveMoCutoffMs =
    filters.watchedWindow === "12mo" ? computeTwelveMoCutoffMs() : null;

  const result: AppliedShow[] = [];

  for (const show of shows) {
    // ── Per-show filters ────────────────────────────────────
    if (
      filters.premiereYearMin !== undefined &&
      show.premiereYear < filters.premiereYearMin
    ) {
      continue;
    }
    if (
      filters.premiereYearMax !== undefined &&
      show.premiereYear > filters.premiereYearMax
    ) {
      continue;
    }
    if (filters.genres && filters.genres.length > 0) {
      const showGenres = show.tmdb?.genres;
      if (!showGenres) continue;
      const intersects = filters.genres.some((g) => showGenres.includes(g));
      if (!intersects) continue;
    }
    // Genre exclusion (AND NOT).
    if (filters.excludeGenres && filters.excludeGenres.length > 0) {
      const showGenres = show.tmdb?.genres;
      if (showGenres && filters.excludeGenres.some((g) => showGenres.includes(g))) {
        continue;
      }
    }
    // Primary-network include / exclude (same primary-network rule the stats
    // counts use, so a show lands under exactly one network).
    if (filters.networks && filters.networks.length > 0) {
      const primary = primaryNetwork(show.tmdb?.networks ?? []);
      if (!primary || !filters.networks.includes(primary)) continue;
    }
    if (filters.excludeNetworks && filters.excludeNetworks.length > 0) {
      const primary = primaryNetwork(show.tmdb?.networks ?? []);
      if (primary && filters.excludeNetworks.includes(primary)) continue;
    }
    // Series-type include / exclude.
    if (filters.types && filters.types.length > 0) {
      const showType = show.tmdb?.type;
      if (!showType || !filters.types.includes(showType)) continue;
    }
    if (filters.excludeTypes && filters.excludeTypes.length > 0) {
      const showType = show.tmdb?.type;
      if (showType && filters.excludeTypes.includes(showType)) continue;
    }

    // ── Wave B entity facets (enrichment-backed) ────────────
    // OR within each facet; AND across; exclusion is AND NOT. A show whose
    // enrichment can't confirm a match is dropped when an include facet is
    // active. Skipped entirely unless a facet (include or exclude) is active.
    if (waveBActive) {
      const fv = showFacetValues(show);
      if (filters.actors?.length && !facetHit(filters.actors, fv.actors))
        continue;
      if (filters.creators?.length && !facetHit(filters.creators, fv.creators))
        continue;
      if (
        filters.conglomerates?.length &&
        !facetHit(filters.conglomerates, fv.conglomerates)
      )
        continue;
      if (filters.languages?.length && !facetHit(filters.languages, fv.languages))
        continue;
      if (filters.countries?.length && !facetHit(filters.countries, fv.countries))
        continue;
      if (filters.decades?.length && !facetHit(filters.decades, fv.decades))
        continue;
      // Exclusions
      if (filters.excludeActors?.length && facetHit(filters.excludeActors, fv.actors))
        continue;
      if (
        filters.excludeCreators?.length &&
        facetHit(filters.excludeCreators, fv.creators)
      )
        continue;
      if (
        filters.excludeConglomerates?.length &&
        facetHit(filters.excludeConglomerates, fv.conglomerates)
      )
        continue;
      if (
        filters.excludeLanguages?.length &&
        facetHit(filters.excludeLanguages, fv.languages)
      )
        continue;
      if (
        filters.excludeCountries?.length &&
        facetHit(filters.excludeCountries, fv.countries)
      )
        continue;
      if (filters.excludeDecades?.length && facetHit(filters.excludeDecades, fv.decades))
        continue;
    }

    // ── Per-review filters ──────────────────────────────────
    if (hasPerReviewFilter) {
      const qualifying = findQualifyingReview(show, filters, twelveMoCutoffMs);
      if (!qualifying) continue;
      result.push({
        show,
        qualifyingReview: qualifying,
        cardRating: qualifying.rating,
        positionDate: qualifying.reviewDate,
        perReviewFilterActive: true,
      });
    } else {
      result.push({
        show,
        qualifyingReview: show.reviews[0] ?? null,
        cardRating: show.primaryRating,
        positionDate: positionDateForSort(show, sort),
        perReviewFilterActive: false,
      });
    }
  }

  return sortApplied(result, sort);
}

function findQualifyingReview(
  show: Show,
  filters: ShowFilters,
  twelveMoCutoffMs: number | null,
): Review | null {
  // Reviews are pre-sorted reviewDate desc by the snapshot writer
  // (`show.reviews[0]` is newest), so the first match is the most
  // recent qualifying review by definition.
  for (const review of show.reviews) {
    if (filters.ratings && filters.ratings.length > 0) {
      if (review.rating === null || !filters.ratings.includes(review.rating)) {
        continue;
      }
    }
    // Rating exclusion (AND NOT): a review carrying an excluded rating is not
    // a qualifying review. Unrated reviews (null) can't match an exclusion.
    if (filters.excludeRatings && filters.excludeRatings.length > 0) {
      if (review.rating !== null && filters.excludeRatings.includes(review.rating)) {
        continue;
      }
    }
    if (filters.watchedYears && filters.watchedYears.length > 0) {
      const year = Number.parseInt(review.watchedDate.slice(0, 4), 10);
      if (!filters.watchedYears.includes(year)) continue;
    }
    if (twelveMoCutoffMs !== null) {
      const watchedMs = new Date(review.watchedDate).getTime();
      if (!Number.isFinite(watchedMs) || watchedMs < twelveMoCutoffMs) continue;
    }
    return review;
  }
  return null;
}

function positionDateForSort(show: Show, sort: ShowSort): string {
  switch (sort) {
    case "latest-activity-desc":
    case "latest-activity-asc":
      return show.latestActivityDate;
    case "premiere-year-desc":
    case "premiere-year-asc":
      return `${show.premiereYear}-01-01`;
    case "rating-desc":
    case "rating-asc":
      return show.latestActivityDate;
    case "show-name-asc":
      return show.latestActivityDate;
  }
}

function sortApplied(arr: AppliedShow[], sort: ShowSort): AppliedShow[] {
  return [...arr].sort((a, b) => {
    switch (sort) {
      case "latest-activity-desc":
        return b.show.latestActivityDate.localeCompare(
          a.show.latestActivityDate,
        );
      case "latest-activity-asc":
        return a.show.latestActivityDate.localeCompare(
          b.show.latestActivityDate,
        );
      case "premiere-year-desc":
        return b.show.premiereYear - a.show.premiereYear;
      case "premiere-year-asc":
        return a.show.premiereYear - b.show.premiereYear;
      case "rating-desc": {
        // Unrated shows sort to the bottom in desc order so the top
        // of the list is always rated content. Tiebreaker:
        // latestActivityDate desc — equal-rated shows cluster
        // chronologically.
        const ratingCmp =
          (b.cardRating ?? -Infinity) - (a.cardRating ?? -Infinity);
        if (ratingCmp !== 0) return ratingCmp;
        return b.show.latestActivityDate.localeCompare(
          a.show.latestActivityDate,
        );
      }
      case "rating-asc": {
        const ratingCmp =
          (a.cardRating ?? Infinity) - (b.cardRating ?? Infinity);
        if (ratingCmp !== 0) return ratingCmp;
        return b.show.latestActivityDate.localeCompare(
          a.show.latestActivityDate,
        );
      }
      case "show-name-asc":
        // Locale-aware alphabetical, with "The"/"A" stripped from
        // the comparison key so "The Office" sorts under O, not T.
        // Tiebreaker latestActivityDate desc.
        return (
          stripLeadingArticle(a.show.name).localeCompare(
            stripLeadingArticle(b.show.name),
          ) ||
          b.show.latestActivityDate.localeCompare(a.show.latestActivityDate)
        );
    }
  });
}

function stripLeadingArticle(name: string): string {
  return name.replace(/^(the|a|an)\s+/i, "");
}

// ─── URL param parsing ────────────────────────────────────────────

const VALID_SORTS: readonly ShowSort[] = SHOW_SORTS;

const VALID_RATINGS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

/**
 * Parse a Next.js searchParams record into ShowFilters. Tolerates
 * malformed input — anything we don't recognize is silently
 * dropped so URL tampering can't crash the page. Mirrors
 * parseFilmFilters byte-for-byte where the field names overlap.
 */
export function parseShowFilters(
  params: Record<string, string | string[] | undefined>,
): ShowFilters {
  // Each dimension splits into include/exclude via the leading-"!"
  // encoding (STATS-FILTERS §7), shared with the reviews surfaces (§11) —
  // reviews URLs carry no "!", so this is backward compatible there.
  const ratingDim = parseDimension(asString(params.rating));
  const ratings = ratingDim.include
    .map((s) => Number.parseFloat(s))
    .filter((r) => Number.isFinite(r) && VALID_RATINGS.includes(r));
  const excludeRatings = ratingDim.exclude
    .map((s) => Number.parseFloat(s))
    .filter((r) => Number.isFinite(r) && VALID_RATINGS.includes(r));

  const genreDim = parseDimension(asString(params.genre));
  // Networks carry canonical names ("HBO / Max") and types are TMDB
  // labels ("Scripted"); both are CSV like genre. No allowlist — a
  // tampered value just matches nothing (same posture as genre).
  const networkDim = parseDimension(asString(params.network));
  const typeDim = parseDimension(asString(params.type));
  const premiereYearMin = parsePremiereYear(asString(params.premiereYearMin));
  const premiereYearMax = parsePremiereYear(asString(params.premiereYearMax));
  // Tolerate any other value silently (URL tampering returns to
  // the default "both" branch, no crash).
  const cardKindRaw = asString(params.cardKind);
  const cardKind: "show" | "season" | undefined =
    cardKindRaw === "show" || cardKindRaw === "season"
      ? cardKindRaw
      : undefined;

  const watchedYearsRaw = parseCsvNumbers(asString(params.watchedYear)).filter(
    (y) => Number.isInteger(y) && y > 0,
  );
  const watchedWindowRaw = asString(params.watchedWindow);

  // Title search (?title=); active only at length ≥ 2 (single char is a
  // no-op). Mirrors parseFilmFilters + MIN_QUERY_LENGTH.
  const titleQuery = asString(params.title)?.trim();

  // Wave B entity facets — CSV of entity slugs, each split into
  // include/exclude. No allowlist: an unknown slug matches nothing in
  // applyCompletedCardFilters (corpus constraint).
  const actorDim = parseDimension(asString(params.actor));
  const creatorDim = parseDimension(asString(params.creator));
  const conglomerateDim = parseDimension(asString(params.conglomerate));
  const languageDim = parseDimension(asString(params.language));
  const countryDim = parseDimension(asString(params.country));
  const decadeDim = parseDimension(asString(params.decade));

  const base: Omit<ShowFilters, "watchedYears" | "watchedWindow"> = {};
  // Include side.
  if (ratings.length > 0) base.ratings = ratings;
  if (genreDim.include.length > 0) base.genres = genreDim.include;
  if (networkDim.include.length > 0) base.networks = networkDim.include;
  if (typeDim.include.length > 0) base.types = typeDim.include;
  if (premiereYearMin !== undefined) base.premiereYearMin = premiereYearMin;
  if (premiereYearMax !== undefined) base.premiereYearMax = premiereYearMax;
  if (cardKind !== undefined) base.cardKind = cardKind;
  if (titleQuery && titleQuery.length >= 2) base.titleQuery = titleQuery;
  if (actorDim.include.length > 0) base.actors = actorDim.include;
  if (creatorDim.include.length > 0) base.creators = creatorDim.include;
  if (conglomerateDim.include.length > 0) base.conglomerates = conglomerateDim.include;
  if (languageDim.include.length > 0) base.languages = languageDim.include;
  if (countryDim.include.length > 0) base.countries = countryDim.include;
  if (decadeDim.include.length > 0) base.decades = decadeDim.include;
  // Exclude side (AND NOT). Set only when non-empty.
  if (excludeRatings.length > 0) base.excludeRatings = excludeRatings;
  if (genreDim.exclude.length > 0) base.excludeGenres = genreDim.exclude;
  if (networkDim.exclude.length > 0) base.excludeNetworks = networkDim.exclude;
  if (typeDim.exclude.length > 0) base.excludeTypes = typeDim.exclude;
  if (actorDim.exclude.length > 0) base.excludeActors = actorDim.exclude;
  if (creatorDim.exclude.length > 0) base.excludeCreators = creatorDim.exclude;
  if (conglomerateDim.exclude.length > 0) base.excludeConglomerates = conglomerateDim.exclude;
  if (languageDim.exclude.length > 0) base.excludeLanguages = languageDim.exclude;
  if (countryDim.exclude.length > 0) base.excludeCountries = countryDim.exclude;
  if (decadeDim.exclude.length > 0) base.excludeDecades = decadeDim.exclude;

  if (watchedYearsRaw.length > 0) {
    return { ...base, watchedYears: watchedYearsRaw };
  }
  if (watchedWindowRaw === "12mo") {
    return { ...base, watchedWindow: "12mo" };
  }
  return base;
}

export function parseShowSort(
  params: Record<string, string | string[] | undefined>,
): ShowSort {
  const raw = asString(params.sort);
  if (raw && (VALID_SORTS as string[]).includes(raw)) {
    return raw as ShowSort;
  }
  return DEFAULT_SHOW_SORT;
}

// ─── Parse helpers ────────────────────────────────────────────────

export function asString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function parseCsvNumbers(raw: string | undefined): number[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => Number.parseFloat(s.trim()))
    .filter((n) => Number.isFinite(n));
}

function parsePositiveInt(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

// TV's catalog floor is later than film's — TMDB's earliest TV
// entries are 1940s broadcast, but Malcolm's diary doesn't reach
// pre-1950s. 1940 is the comfortable lower bound; max is computed
// per-call so a long-running process can cross the year boundary.
const PREMIERE_YEAR_MIN_BOUND = 1940;

function parsePremiereYear(raw: string | undefined): number | undefined {
  const n = parsePositiveInt(raw);
  if (n === undefined) return undefined;
  const maxBound = new Date().getUTCFullYear() + 5;
  if (n < PREMIERE_YEAR_MIN_BOUND || n > maxBound) return undefined;
  return n;
}

function computeTwelveMoCutoffMs(): number {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - 1);
  return d.getTime();
}

// ─── Pagination ──────────────────────────────────────────────────

/**
 * 1-indexed pagination. Identical to /films's paginate() — same
 * clamping, same return shape. Kept as a separate export for
 * import-locality (so /television page imports don't have to
 * cross-cluster into letterboxd-utils).
 */
export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number,
): {
  current: T[];
  totalPages: number;
  totalResults: number;
  page: number;
} {
  const totalResults = items.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const clampedPage = Math.min(Math.max(1, page), totalPages);
  const start = (clampedPage - 1) * pageSize;
  return {
    current: items.slice(start, start + pageSize),
    totalPages,
    totalResults,
    page: clampedPage,
  };
}

// ─── Display formatters ──────────────────────────────────────────

/**
 * "★★★½" for 3.5; "★★★★★" for 5; `null` for unrated. Identical
 * to /films's formatRating — kept here so /television imports
 * don't have to cross clusters.
 */
export function formatRating(rating: number | null): string | null {
  if (rating === null) return null;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return "★".repeat(full) + (half ? "½" : "");
}

/**
 * "Apr 30, 2026" for an ISO date. Forces UTC timezone for the
 * same reason /films does — date-only ISO strings parse as UTC
 * midnight, and a server west of GMT would otherwise format the
 * date one day earlier.
 */
export function formatWatchedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Resolve the TMDB-CDN URL for a specific season's poster on a
 * given show. Returns null when the season doesn't have its own
 * poster — caller decides whether to fall back to the show
 * poster, render a placeholder, or skip the image entirely.
 *
 * Single source of truth so /television's Season cards,
 * /television/watching's in-progress cards, and the detail
 * page's SeasonBlock all use the same URL shape (w342 — matches
 * /films's card sizing and the show-poster cascade in the
 * bootstrap enricher).
 */
export function resolveSeasonPosterUrl(
  show: Show,
  seasonNumber: number,
): string | null {
  const season = show.seasons.find((s) => s.seasonNumber === seasonNumber);
  if (!season?.posterPath) return null;
  return `https://image.tmdb.org/t/p/w342${season.posterPath}`;
}

/** "Season 1, Episode 2" / "Season 1" / "" — used in card datelines and detail headers. */
export function formatLevelLabel(
  review: Review,
  seasonNumber: number | null,
): string {
  switch (review.level) {
    case "show":
      return "";
    case "season":
      return seasonNumber !== null ? `Season ${seasonNumber}` : "";
    case "episode": {
      if (seasonNumber === null || review.episodeNumber === null) return "";
      return `Season ${seasonNumber}, Episode ${review.episodeNumber}`;
    }
  }
}

/** "2024" for an ISO date. */
export function yearFromIso(iso: string): number {
  return new Date(iso).getUTCFullYear();
}
