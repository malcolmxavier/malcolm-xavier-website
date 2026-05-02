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
  /** ISO date (day precision) — when the film was watched. */
  watchedDate: string;
  /** ISO date — when the review was published on Letterboxd. */
  reviewDate: string;
  /** 0.5 to 5.0 in 0.5 increments, or null if unrated. */
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
  /** ISO date — earliest review publication date. Default sort key. */
  firstReviewDate: string;
  /** ISO date — most recent review publication date. */
  latestReviewDate: string;
  /** Most recent review's rating. Surfaced on the card when no per-review filter is active. */
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
  /** Precomputed at snapshot-write time. Unique years from reviews' reviewDate. */
  reviewYearSet: number[];
};

export type FilmsSummary = {
  totalFilms: number;
  totalReviews: number;
  /** Films first-reviewed in the current calendar year. */
  thisYearCount: number;
  /** Per-review rating buckets keyed as "0.5", "1", ..., "5". */
  ratingDistribution: Record<string, number>;
  /** Per-film genre counts. A film with two genres adds to both. */
  genreDistribution: Record<string, number>;
  /** Per-film decade counts keyed as "2020s", "2010s", etc. */
  decadeDistribution: Record<string, number>;
};

// ─── Filter + sort spec ──────────────────────────────────────────

export type FilmFilters = {
  /** Empty/undefined = no filter. Otherwise: keep film if any review's rating ∈ this set. */
  ratings?: number[];
  releaseYearMin?: number;
  releaseYearMax?: number;
  /** Empty/undefined = no filter. Otherwise: keep film if film's genres intersect this set. */
  genres?: string[];
  /** Exact year match against any review's reviewDate. */
  reviewYear?: number;
  /** Rolling-window key: e.g. "12mo" = past 12 months. Mutually exclusive with reviewYear. */
  reviewWindow?: "12mo";
};

export type FilmSort =
  | "first-review-desc"
  | "first-review-asc"
  | "latest-review-desc"
  | "release-year-desc"
  | "release-year-asc"
  | "rating-desc"
  | "rating-asc";

/**
 * Output of applyFilters: the surviving film + the qualifying review
 * to surface on the card and use for grid positioning. When a
 * per-review filter (ratings or reviewYear/reviewWindow) is active,
 * `qualifyingReview` is the **most recent** review that qualifies and
 * `positionDate` is that review's `reviewDate`. When no per-review
 * filter is active, `qualifyingReview` is the most recent review
 * overall and `positionDate` is the active sort dimension's date.
 */
export type AppliedFilm = {
  film: Film;
  qualifyingReview: Review;
  cardRating: number | null;
  positionDate: string;
};

// ─── Filtering + sorting (stub — real impl arrives with parsers) ─

/**
 * Stub. Returns films un-filtered, un-sorted, mapped into AppliedFilm
 * shape using each film's most recent review. The real implementation
 * (per-review filter math, sort dimension switching, position-by-
 * qualifying-review-date) lands when the snapshot has real data and
 * we can validate edge cases (rewatches with disagreeing ratings).
 */
export function applyFilters(
  films: Film[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- public API stable; impl arrives later
  filters: FilmFilters,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- public API stable; impl arrives later
  sort: FilmSort = "first-review-desc",
): AppliedFilm[] {
  return films.map((film) => ({
    film,
    qualifyingReview: film.reviews[0],
    cardRating: film.primaryRating,
    positionDate: film.firstReviewDate,
  }));
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

/** "★★★½" for 3.5; "★★★★★" for 5; "" for null. Half-star uses ½ glyph. */
export function formatRating(rating: number | null): string {
  if (rating === null) return "";
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

/** "Apr 30, 2026" for an ISO date. */
export function formatWatchedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "2024" for an ISO date — used when a release year alone is enough context. */
export function yearFromIso(iso: string): number {
  return new Date(iso).getUTCFullYear();
}
