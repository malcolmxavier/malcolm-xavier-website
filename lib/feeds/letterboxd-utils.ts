// ─────────────────────────────────────────────────────────────────
// Letterboxd — pure helpers + public types.
//
// This file has no server-only imports (no `node:fs`, no `server-only`
// barrier) so it's safe to import from client components. Types live
// here too so client components can type their props without reaching
// into the server-only `letterboxd.ts`.
//
// Server-only logic (snapshot reading, TMDB enrichment, CSV/RSS
// parsing) lives in `letterboxd.ts` and re-exports these types.
// ─────────────────────────────────────────────────────────────────

// ─── Public types ────────────────────────────────────────────────

export type Review = {
  /**
   * Letterboxd RSS `<guid>` for the underlying review object — stable
   * identity across edits to watchedDate, rating, or prose. Used by
   * the RSS-incremental refresh as the primary dedupe key so an edit
   * to watchedDate doesn't get treated as a brand-new watch event.
   *
   * Optional because reviews bootstrapped from the CSV export pre-
   * date this field; the RSS refresh backfills the guid the first
   * time it sees a CSV-imported review match by watchedDate.
   */
  guid?: string;
  /** ISO date (day precision) — when the film was watched. */
  watchedDate: string;
  /** ISO date — when the review was published on Letterboxd. */
  reviewDate: string;
  /**
   * 0.5 to 5.0 in 0.5 increments, or null if unrated.
   *
   * **Convention: unrated MUST be `null`, never `0`.** Letterboxd's
   * rating range starts at 0.5; a value of `0` is not meaningful and
   * would be rendered by `<StarRating>` as five outlined empty stars
   * with the misleading SR announcement "Rated 0 out of 5 stars."
   * The parser normalizes any rating-absent diary entry to `null`.
   */
  rating: number | null;
  rewatch: boolean;
  containsSpoilers: boolean;
  /** Plain text. Paragraphs split on `\n\n`. Renders as <p> blocks. */
  reviewText: string;
  /** User-set Letterboxd tags. */
  tags: string[];
};

export type TmdbMeta = {
  /** TMDB movie id. Sticky across refreshes once resolved — used as canonical join key for the Film. */
  id: number;
  /** Relative path like "/abc123.jpg". Render via `https://image.tmdb.org/t/p/w342${posterPath}`. */
  posterPath: string | null;
  backdropPath: string | null;
  /** TMDB genre names, e.g. ["Drama", "Thriller"]. */
  genres: string[];
  /** Minutes. */
  runtime: number | null;
  director: string | null;
};

export type Film = {
  /** Canonical id: TMDB id (preferred) or `${letterboxdSlug}-${releaseYear}` as the seed identity before TMDB resolves. */
  id: string;
  /** Renderable / URL field. Never used as a join key on its own — slugs can rename. */
  letterboxdSlug: string;
  /** Canonical Letterboxd film URL. */
  letterboxdUrl: string;
  title: string;
  releaseYear: number;
  /** ISO date — earliest watched date across all reviews. */
  firstWatchedDate: string;
  /** ISO date — most recent watched date across all reviews. Primary
   *  grid sort key (newest watch at top); for non-rewatched films
   *  this equals firstWatchedDate. */
  latestWatchedDate: string;
  /** ISO date — earliest review publication date. */
  firstReviewDate: string;
  /** ISO date — most recent review publication date. */
  latestReviewDate: string;
  /**
   * Most recent review's rating. Surfaced on the card when no
   * per-review filter is active. Inherits the same null-not-zero
   * convention as `Review.rating` — unrated is `null`, never `0`.
   */
  primaryRating: number | null;
  /** Most recent review's liked flag. */
  liked: boolean;
  /** Sorted reviewDate desc (newest first). Only includes prose reviews — rating-only diary entries are filtered out at snapshot-write time. */
  reviews: Review[];
  /** TMDB enrichment. Null if no TMDB match was found. */
  tmdb: TmdbMeta | null;
  /** Resolved at snapshot time: Letterboxd CDN > TMDB > null. */
  posterUrl: string | null;
  /** TMDB-derived fallback used by the card's onError swap when posterUrl 404s. */
  posterFallbackUrl: string | null;
  /** Precomputed at snapshot-write time for O(1) filter membership checks. Unique ratings across reviews. */
  ratingSet: number[];
  /**
   * Precomputed at snapshot-write time. Unique years from reviews'
   * **watchedDate** — the user-facing event for the watched-year
   * filter chip rail. Was previously derived from reviewDate, which
   * silently mismatched the watchedYear filter semantics for
   * festival/diary-lag films (watched 2024, reviewed 2025).
   */
  watchedYearSet: number[];
};

export type FilmsSummary = {
  totalFilms: number;
  totalReviews: number;
  /** Films with at least one watch in the current calendar year
   *  (computed from latestWatchedDate at snapshot-write time). */
  thisYearCount: number;
  /** Per-review rating buckets keyed as "0.5", "1", ..., "5". */
  ratingDistribution: Record<string, number>;
  /** Per-film genre counts. A film with two genres adds to both. */
  genreDistribution: Record<string, number>;
  /** Per-film decade counts keyed as "2020s", "2010s", etc. */
  decadeDistribution: Record<string, number>;
};

// ─── Lists + favorites (editorial landing) ───────────────────────
//
// These are pulled from Letterboxd (the platform is the curation
// surface — Malcolm arranges his lists and favorites there, the
// site reflects them) by a separate slow-cadence scrape pass, NOT
// the daily RSS-incremental path. See scripts/refresh-films-lists.mjs.
// Both reference the review corpus by `letterboxdSlug` so the landing
// can render rich FilmCards; the captured title/poster fields are a
// standalone fallback for any entry not in the reviewed corpus (you
// can favorite or list a film you haven't written up).

/**
 * One of Malcolm's public Letterboxd lists. `filmSlugs` is the
 * list's running order (Letterboxd preserves manual / ranked order
 * in the page markup), so the landing and the list-detail page
 * render films in the order he arranged them. `description` carries
 * the list's prose — for the ranked lists that's the methodology
 * note ("star rating disregarded and fully editorialized"), which is
 * the editorial voice we surface rather than per-film blurbs.
 */
export type FilmList = {
  /** URL slug from letterboxd.com/<user>/list/<slug>/. */
  slug: string;
  /** Human title from the list page's og:title. */
  title: string;
  /** List prose / ranking methodology from og:description. May be "". */
  description: string;
  /** Ordered Letterboxd film slugs (list running order preserved). */
  filmSlugs: string[];
  /** Canonical Letterboxd list URL. */
  url: string;
};

/**
 * A single Letterboxd profile favorite. `slug` is the Letterboxd
 * film slug (matches `Film.letterboxdSlug` for a corpus join); the
 * remaining fields are captured straight off the profile so a
 * favorite that isn't in the reviewed corpus still renders a poster
 * card. Stored in profile order (Letterboxd lets you arrange them).
 */
export type FilmFavorite = {
  slug: string;
  title: string;
  releaseYear: number | null;
  /**
   * w342 TMDB poster, resolved at scrape time via the corpus
   * enricher (title+year search). Favorites are often rating-only
   * films absent from the prose-only corpus, so the poster can't be
   * borrowed from a corpus Film — but a TMDB poster keeps the
   * favourite tile's 2:3 aspect consistent with every other poster
   * on the site (the Letterboxd og:image is a 16:9 social crop, the
   * wrong shape here). Null if TMDB had no match.
   */
  posterUrl: string | null;
  letterboxdUrl: string;
};

// ─── Genre slug helpers ──────────────────────────────────────────

/**
 * Convert a TMDB genre name to a URL-safe slug. Lowercase, spaces
 * to hyphens, strip anything that isn't alphanumeric-or-hyphen.
 *
 * Examples:
 *   "Horror"          → "horror"
 *   "Science Fiction" → "science-fiction"
 *   "TV Movie"        → "tv-movie"
 *
 * Used for the dedicated /films/genre/[slug] long-tail SEO routes.
 * The reverse lookup (slug → genre name) is done by walking the
 * snapshot's genreDistribution at request time and matching slugs
 * — see findGenreBySlug below. Avoids hardcoding a genre↔slug map
 * so a new TMDB genre lights up the route automatically once it
 * appears in any film's tmdb.genres.
 */
export function slugifyGenre(genre: string): string {
  return genre
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/**
 * Reverse-lookup a TMDB genre name from a URL slug. Walks the
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

// ─── Filter + sort spec ──────────────────────────────────────────

/**
 * Watched-date filter. `watchedYears` (multi-select set of exact
 * years) and `watchedWindow` (rolling) are mutually exclusive —
 * discriminated union enforces this at the type level so callers
 * can't accidentally set both and watch the impl pick one
 * arbitrarily. The empty branch makes the whole sub-filter
 * optional.
 *
 * Filters by `review.watchedDate`, not `review.reviewDate` — the
 * user-facing event is when Malcolm watched the film, not when he
 * later typed up the review. The two are usually within a day of
 * each other, but festival watches and review-after-the-fact
 * entries can diverge by weeks.
 *
 * `watchedYears` is an array (not a single number) so the chip
 * rail can multi-select like `ratings` and `genres` — clicking
 * 2026 alongside 2024 keeps both active.
 */
type WatchedDateFilter =
  | { watchedYears: number[]; watchedWindow?: never }
  | { watchedWindow: "12mo"; watchedYears?: never }
  | { watchedYears?: undefined; watchedWindow?: undefined };

export type FilmFilters = {
  /** Empty/undefined = no filter. Otherwise: keep film if any review's rating ∈ this set. */
  ratings?: number[];
  releaseYearMin?: number;
  releaseYearMax?: number;
  /** Empty/undefined = no filter. Otherwise: keep film if film's genres intersect this set. */
  genres?: string[];
  /** Title search (?title=), length ≥ 2. */
  titleQuery?: string;
  /** Director search (?director=), length ≥ 2. Separate field from
   *  title so "everything by X" is its own lens. */
  directorQuery?: string;
  // Both queries are carried here so generateMetadata can noindex the
  // search state; the actual hybrid matching is precomputed server-side
  // (per field, then intersected) and passed to applyFilters as
  // `matchIds` — keeps this client-safe module free of the Fuse dep.
} & WatchedDateFilter;

/**
 * Single source of truth for valid sort dimensions. The runtime
 * VALID_SORTS array (used for URL parsing) and the FilmSort type
 * are both derived from this — no hand-keeping two parallel lists
 * in sync. Order matters: it dictates the runtime guard's iteration
 * order and is the order the UI walks when building the <select>.
 *
 * Most recent watch first (`latest-watched-desc`) is the default
 * — mirrors the snapshot's pre-sorted order (latestWatchedDate
 * desc + within-day csvRowIdx tiebreaker).
 */
export const FILM_SORTS = [
  "latest-watched-desc",
  "latest-watched-asc",
  "first-review-desc",
  "first-review-asc",
  "latest-review-desc",
  "release-year-desc",
  "release-year-asc",
  "rating-desc",
  "rating-asc",
] as const;

export type FilmSort = (typeof FILM_SORTS)[number];

/** The default sort when none is specified — preserves the
 *  watch-chronological order baked into the snapshot. */
export const DEFAULT_FILM_SORT: FilmSort = "latest-watched-desc";

/**
 * Output of applyFilters: the surviving film + the qualifying review
 * to surface on the card and use for grid positioning. When a
 * per-review filter (ratings or watchedYears/watchedWindow) is
 * active, `qualifyingReview` is the **most recent** review that
 * qualifies and `positionDate` is that review's `reviewDate`.
 *
 * Note: per-review filters predicate on `review.watchedDate` (the
 * user-facing event), but `positionDate` uses the qualifying
 * review's `reviewDate` because the grid's chronological axis is
 * publication order — the snapshot is sorted reviewDate desc
 * within each film, and the listing page orders the result by
 * the active sort dimension. The two dates usually agree within
 * a day; when they diverge (festival watches, diary lag), the
 * card's dateline still surfaces the watchedDate via
 * `qualifyingReview.watchedDate`, so the user sees the watch
 * date even though the position uses the review date.
 *
 * When no per-review filter is active, `qualifyingReview` is the
 * most recent review overall and `positionDate` is the active
 * sort dimension's date.
 */
export type AppliedFilm = {
  film: Film;
  /**
   * The qualifying review under active per-review filters, or null
   * when the film has no reviews. Typing as nullable forces every
   * consumer to null-check before accessing review fields — keeps
   * the snapshot-with-empty-reviews edge case from crashing the
   * grid render.
   */
  qualifyingReview: Review | null;
  cardRating: number | null;
  positionDate: string;
  /**
   * True when ratings / watchedYears / watchedWindow narrowed the
   * result set — i.e. the qualifying review represents a specific
   * watch event the filter matched. FilmCard reads this to swap
   * its dateline from "First watched [first-watch date]" to
   * "Watched [qualifying-review's watch date]" so the card and
   * the grid position agree on which watch is being represented.
   * False when the result set is shaped only by per-film filters
   * (releaseYear / genre) or by sort alone.
   */
  perReviewFilterActive: boolean;
};

// ─── Filtering + sorting ──────────────────────────────────────────

/**
 * Apply per-film and per-review filters, then sort the result.
 *
 * Per-film filters (releaseYear, genres) drop a film entirely when
 * the film itself doesn't match. Per-review filters (ratings,
 * watchedYears, watchedWindow) drop a film when none of its reviews
 * match — and when ANY of these filters is active, the surviving
 * film's "qualifying review" is the most recent review that passes
 * all per-review predicates, and the grid position uses that
 * review's reviewDate (so the card and the grid agree on which
 * review is being represented).
 *
 * When no per-review filter is active, the film's most-recent
 * review is the qualifyingReview (informational; the card uses
 * primaryRating directly), and grid position is determined by the
 * active sort dimension.
 *
 * Films are pre-sorted in the snapshot by latestWatchedDate desc
 * + within-day csvRowIdx desc, so when the sort is the default
 * (latest-watched-desc) the filter pass preserves snapshot order
 * via JS's stable sort — the within-day tiebreaker survives.
 */
export function applyFilters(
  films: Film[],
  filters: FilmFilters,
  sort: FilmSort = DEFAULT_FILM_SORT,
  // Precomputed fuzzy-search match set (film ids) for the ?q= filter.
  // null/undefined = no search active (keep all). The matching is done
  // by the caller via the server-only fuzzy-search helper so this
  // module stays free of the Fuse dep and client-bundle-safe.
  matchIds?: Set<string> | null,
): AppliedFilm[] {
  const hasPerReviewFilter =
    (filters.ratings && filters.ratings.length > 0) ||
    (filters.watchedYears && filters.watchedYears.length > 0) ||
    filters.watchedWindow !== undefined;

  // Pre-compute the "12mo" cutoff once outside the loop. Using
  // Date.now() at filter time means the rolling window is always
  // anchored to the current request — no caching of "rolling 12mo"
  // values that go stale across requests.
  //
  // Calendar-year subtraction (setUTCFullYear), not millisecond
  // arithmetic. 365*24*60*60*1000 underweights leap years by a day
  // — a watch on Feb 29, 2024 evaluated on Feb 28, 2025 would fall
  // outside a 365-day window even though it's "within the last
  // year" by every human definition. setUTCFullYear handles the
  // Feb-29 edge case by clamping to Feb 28 in non-leap years.
  const twelveMoCutoffMs =
    filters.watchedWindow === "12mo" ? computeTwelveMoCutoffMs() : null;

  const result: AppliedFilm[] = [];

  for (const film of films) {
    // ── Per-film filters ────────────────────────────────────
    // Search (?q=): drop films whose id isn't in the fuzzy-match set.
    // Composes (AND) with every other filter below.
    if (matchIds && !matchIds.has(film.id)) {
      continue;
    }
    if (
      filters.releaseYearMin !== undefined &&
      film.releaseYear < filters.releaseYearMin
    ) {
      continue;
    }
    if (
      filters.releaseYearMax !== undefined &&
      film.releaseYear > filters.releaseYearMax
    ) {
      continue;
    }
    if (filters.genres && filters.genres.length > 0) {
      const filmGenres = film.tmdb?.genres;
      if (!filmGenres) continue;
      const intersects = filters.genres.some((g) => filmGenres.includes(g));
      if (!intersects) continue;
    }

    // ── Per-review filters ──────────────────────────────────
    if (hasPerReviewFilter) {
      const qualifying = findQualifyingReview(
        film,
        filters,
        twelveMoCutoffMs,
      );
      if (!qualifying) continue;
      result.push({
        film,
        qualifyingReview: qualifying,
        cardRating: qualifying.rating,
        // When a per-review filter is active, the card AND the grid
        // position both reflect the qualifying review — so a 4★
        // rewatch from 2024 lands where a 2024-reviewed film should
        // land, not where the original watch (different year) would.
        positionDate: qualifying.reviewDate,
        perReviewFilterActive: true,
      });
    } else {
      result.push({
        film,
        qualifyingReview: film.reviews[0] ?? null,
        cardRating: film.primaryRating,
        positionDate: positionDateForSort(film, sort),
        perReviewFilterActive: false,
      });
    }
  }

  return sortApplied(result, sort);
}

/**
 * Walk a film's reviews newest-first and return the most recent
 * review that satisfies every active per-review filter. Returns
 * null if no review matches — caller drops the film from the result.
 *
 * Reviews are pre-sorted reviewDate desc by the snapshot writer
 * (`film.reviews[0]` is newest), so the first match is the most
 * recent qualifying review by definition.
 */
function findQualifyingReview(
  film: Film,
  filters: FilmFilters,
  twelveMoCutoffMs: number | null,
): Review | null {
  for (const review of film.reviews) {
    // Rating filter: review's rating must be in the selected set.
    // Unrated reviews (rating === null) are filtered out when the
    // ratings filter is active — they have no rating to match.
    if (filters.ratings && filters.ratings.length > 0) {
      if (review.rating === null || !filters.ratings.includes(review.rating)) {
        continue;
      }
    }
    // WatchedYears filter: the review's watchedDate year must be
    // in the selected set. Multi-select — any year in the chip
    // rail counts as a match.
    if (filters.watchedYears && filters.watchedYears.length > 0) {
      const year = Number.parseInt(review.watchedDate.slice(0, 4), 10);
      if (!filters.watchedYears.includes(year)) continue;
    }
    // WatchedWindow filter (rolling 12 months from now, anchored to
    // watch date — when Malcolm actually saw the film, not when he
    // typed up the review).
    if (twelveMoCutoffMs !== null) {
      const watchedMs = new Date(review.watchedDate).getTime();
      if (!Number.isFinite(watchedMs) || watchedMs < twelveMoCutoffMs) continue;
    }
    return review;
  }
  return null;
}

/**
 * Default positionDate when no per-review filter is active. Used
 * for the AppliedFilm.positionDate field — informational, since
 * the actual sort happens via sortApplied. Returns the date the
 * sort key references so external consumers (e.g. card datelines
 * tied to the active sort) can read it without re-deriving.
 */
function positionDateForSort(film: Film, sort: FilmSort): string {
  switch (sort) {
    case "latest-watched-desc":
    case "latest-watched-asc":
      return film.latestWatchedDate;
    case "first-review-desc":
    case "first-review-asc":
      return film.firstReviewDate;
    case "latest-review-desc":
      return film.latestReviewDate;
    case "release-year-desc":
    case "release-year-asc":
      // Synthesize a YYYY-01-01 so all positionDate values are
      // ISO-comparable strings — release-year sort is integer-based
      // anyway, this just keeps the field well-typed.
      return `${film.releaseYear}-01-01`;
    case "rating-desc":
    case "rating-asc":
      return film.firstReviewDate;
  }
}

/**
 * Sort AppliedFilm[] by the chosen dimension. Stable — JS's
 * Array.sort preserves order for equal keys, which means
 * latest-watched-desc inherits the snapshot's within-day
 * csvRowIdx tiebreaker even though the index isn't on the
 * public Film type.
 */
function sortApplied(
  arr: AppliedFilm[],
  sort: FilmSort,
): AppliedFilm[] {
  // Spread so the input array stays untouched (the snapshot's
  // films array shouldn't be mutated by a filter pass).
  return [...arr].sort((a, b) => {
    switch (sort) {
      case "latest-watched-desc":
        return b.film.latestWatchedDate.localeCompare(a.film.latestWatchedDate);
      case "latest-watched-asc":
        return a.film.latestWatchedDate.localeCompare(b.film.latestWatchedDate);
      case "first-review-desc":
        return b.film.firstReviewDate.localeCompare(a.film.firstReviewDate);
      case "first-review-asc":
        return a.film.firstReviewDate.localeCompare(b.film.firstReviewDate);
      case "latest-review-desc":
        return b.film.latestReviewDate.localeCompare(a.film.latestReviewDate);
      case "release-year-desc":
        return b.film.releaseYear - a.film.releaseYear;
      case "release-year-asc":
        return a.film.releaseYear - b.film.releaseYear;
      case "rating-desc": {
        // Unrated films sort to the bottom in desc order so the top
        // of the list is always rated content. Tiebreaker:
        // latestWatchedDate desc — equal-rated films cluster
        // chronologically so the user's most recent take on a given
        // rating is always at the top of its band.
        const ratingCmp =
          (b.cardRating ?? -Infinity) - (a.cardRating ?? -Infinity);
        if (ratingCmp !== 0) return ratingCmp;
        return b.film.latestWatchedDate.localeCompare(a.film.latestWatchedDate);
      }
      case "rating-asc": {
        // Unrated films sort to the bottom in asc order too — they
        // shouldn't pollute the "lowest rated" view as faux-zeros.
        // Tiebreaker matches rating-desc (latest-first) so equal-
        // rated bands always cluster the user's most recent take
        // first regardless of asc/desc direction.
        const ratingCmp =
          (a.cardRating ?? Infinity) - (b.cardRating ?? Infinity);
        if (ratingCmp !== 0) return ratingCmp;
        return b.film.latestWatchedDate.localeCompare(a.film.latestWatchedDate);
      }
    }
  });
}

// ─── URL param parsing ────────────────────────────────────────────

// VALID_SORTS is the runtime form of FilmSort. Both share FILM_SORTS
// as the single source of truth — keeping the two in lockstep would
// otherwise require remembering to update two lists every time we
// add a sort dimension.
const VALID_SORTS: readonly FilmSort[] = FILM_SORTS;

const VALID_RATINGS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

/**
 * Parse a Next.js searchParams record into FilmFilters. Tolerates
 * malformed input — a bad ?rating=foo just becomes "no rating
 * filter active" rather than throwing. Anything we don't recognize
 * is silently dropped so URL tampering can't crash the page.
 */
export function parseFilmFilters(
  params: Record<string, string | string[] | undefined>,
): FilmFilters {
  const ratings = parseCsvNumbers(asString(params.rating)).filter((r) =>
    VALID_RATINGS.includes(r),
  );
  const genres = parseCsvStrings(asString(params.genre));
  const releaseYearMin = parseReleaseYear(asString(params.releaseYearMin));
  const releaseYearMax = parseReleaseYear(asString(params.releaseYearMax));

  // WatchedYears and watchedWindow are mutually exclusive per the
  // discriminated-union spec — if both are present, watchedYears
  // wins (more specific signal). watchedYear URL param is CSV like
  // `rating` and `genre` (`?watchedYear=2026,2024`); name stays
  // singular for symmetry with those param names.
  const watchedYearsRaw = parseCsvNumbers(asString(params.watchedYear))
    .filter((y) => Number.isInteger(y) && y > 0);
  const watchedWindowRaw = asString(params.watchedWindow);

  // Title / director search (?title=, ?director=). Each active only at
  // length ≥ 2 so a single typed character is a no-op (no jarring
  // filter, no premature noindex). Mirrors MIN_QUERY_LENGTH.
  const titleQuery = asString(params.title)?.trim();
  const directorQuery = asString(params.director)?.trim();

  const base: Pick<
    FilmFilters,
    | "ratings"
    | "genres"
    | "releaseYearMin"
    | "releaseYearMax"
    | "titleQuery"
    | "directorQuery"
  > = {};
  if (ratings.length > 0) base.ratings = ratings;
  if (genres.length > 0) base.genres = genres;
  if (releaseYearMin !== undefined) base.releaseYearMin = releaseYearMin;
  if (releaseYearMax !== undefined) base.releaseYearMax = releaseYearMax;
  if (titleQuery && titleQuery.length >= 2) base.titleQuery = titleQuery;
  if (directorQuery && directorQuery.length >= 2) {
    base.directorQuery = directorQuery;
  }

  if (watchedYearsRaw.length > 0) {
    return { ...base, watchedYears: watchedYearsRaw };
  }
  if (watchedWindowRaw === "12mo") {
    return { ...base, watchedWindow: "12mo" };
  }
  return base;
}

/** Parse the sort URL param into a FilmSort, defaulting to the
 *  watch-chronological default when missing or invalid. */
export function parseFilmSort(
  params: Record<string, string | string[] | undefined>,
): FilmSort {
  const raw = asString(params.sort);
  if (raw && (VALID_SORTS as string[]).includes(raw)) {
    return raw as FilmSort;
  }
  return DEFAULT_FILM_SORT;
}

// ─── Parse helpers ────────────────────────────────────────────────

/**
 * Coerce a Next.js searchParams value (string | string[] | undefined)
 * to a single string. Multi-value params return their first entry —
 * matches the convention the route handlers use for ?key=a&key=b
 * URLs (we treat the first value as authoritative).
 *
 * Exported so /films/page.tsx, /films/genre/[slug]/page.tsx, and
 * any future film-cluster route can share one definition rather
 * than each maintaining its own.
 */
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

function parseCsvStrings(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parsePositiveInt(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Like parsePositiveInt but clamps to a release-year-shaped range
 * so URL tampering with `?releaseYearMin=99999` can't push the
 * filter into nonsense territory. Anchored loosely: TMDB's catalog
 * starts in 1880-something but Malcolm's logged films don't pre-
 * date the 1900s, and we allow a small forward window for upcoming
 * releases that already have TMDB entries.
 *
 * Max bound is computed per-call (not at module load) so a Vercel
 * warm instance spanning the year boundary doesn't silently reject
 * valid future years — a process started in December 2026 would
 * otherwise still treat 2032 as out-of-range when it runs in 2027.
 */
// Catalog floor — TMDB has entries earlier than 1900 (silent-era
// films from the 1880s/1890s) but Malcolm's Letterboxd diary doesn't
// reach back that far, so 1900 is a comfortable lower bound for
// URL-tampering rejection without trimming any real watch history.
const RELEASE_YEAR_MIN_BOUND = 1900;

function parseReleaseYear(raw: string | undefined): number | undefined {
  const n = parsePositiveInt(raw);
  if (n === undefined) return undefined;
  const maxBound = new Date().getUTCFullYear() + 5;
  if (n < RELEASE_YEAR_MIN_BOUND || n > maxBound) return undefined;
  return n;
}

/**
 * Compute the "12 months ago from now" cutoff via calendar-year
 * arithmetic so leap years don't shift the boundary by a day. UTC
 * throughout to keep the boundary deterministic regardless of
 * server timezone — same convention as formatWatchedDate.
 */
function computeTwelveMoCutoffMs(): number {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - 1);
  return d.getTime();
}

// ─── Pagination ──────────────────────────────────────────────────

/**
 * 1-indexed pagination. Clamps requested page to [1, totalPages] so
 * `?page=999` doesn't crash downstream. Returns the clamped page so
 * the caller can sync URL state if desired.
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
 * "★★★½" for 3.5; "★★★★★" for 5; `null` for unrated. Half-star
 * uses ½ glyph. Returns `null` (not `""`) for the unrated case so
 * the convention matches `<StarRating>` — both render nothing in
 * the DOM rather than producing an empty text node.
 */
export function formatRating(rating: number | null): string | null {
  if (rating === null) return null;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return "★".repeat(full) + (half ? "½" : "");
}

/** "2h 15m" / "95m" / "" for null. */
export function formatRuntime(minutes: number | null): string {
  if (minutes === null) return "";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/**
 * "Apr 30, 2026" for an ISO date.
 *
 * Forces `timeZone: "UTC"` so a date-only ISO string ("2026-04-30")
 * renders the same calendar date regardless of server timezone.
 * Without this, a UTC-or-behind server (anywhere west of GMT)
 * would format "2026-04-30" as "Apr 29, 2026" because JS parses
 * date-only strings as UTC midnight and then `toLocaleDateString`
 * converts to local. Stays consistent with `yearFromIso` below
 * which also uses UTC.
 */
export function formatWatchedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "2024" for an ISO date — used when a release year alone is enough context. */
export function yearFromIso(iso: string): number {
  return new Date(iso).getUTCFullYear();
}
