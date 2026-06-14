// ─────────────────────────────────────────────────────────────────
// Enrichment reader — the committed fixture + the snapshot join.
//
// The stats dashboards need richer metadata than the thin committed
// snapshots carry: external critic scores (MDBList), studios, full
// cast, writers/creators, language, country, budget, release shape,
// and collection membership. That enrichment lives in a committed
// fixture (lib/feeds/_fixtures/enrichment-snapshot.json), keyed by
// TMDB id, alongside the letterboxd/serializd snapshots.
//
// The fixture is the enrichment DELTA only. Identity and rating
// fields that are canonical in the snapshots — `mine` (the rating),
// title/name, year, and a show's networks/type/status/genres — are
// NOT stored in the fixture; they are joined back here from
// getFilms()/getShows() at read time, keyed by TMDB id. That keeps a
// single source of truth for ratings (no drift between the fixture
// and the live snapshot) and makes the fixture a clean third-party-
// metadata artifact.
//
// Server-only: reads fixtures off disk via the snapshot readers.
// Mirrors the loadCache() module-cache pattern in letterboxd.ts /
// serializd.ts. Consumed by lib/feeds/stats/* (the compute layer) and
// its tests; never imported into a client bundle.
// ─────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import path from "node:path";
import { getFilms } from "./letterboxd";
import { getShows } from "./serializd";
import type { Review as FilmReview } from "./letterboxd-utils";
import type { Review as TvReview } from "./serializd-utils";

// ─── External-metadata value shapes ──────────────────────────────

/**
 * Critic/audience scores pulled from MDBList. Each is on its native
 * scale (imdb /10, metacritic /100, letterboxd /5, etc.) or null when
 * that source had no score. `null` for the whole object means the
 * MDBList lookup hasn't landed yet.
 */
export type ExternalRatings = {
  imdb: number | null;
  metacritic: number | null;
  metacriticUser: number | null;
  tomatoes: number | null;
  rtAudience: number | null;
  letterboxd: number | null;
  trakt: number | null;
};

/** A billed film actor — TMDB id + name, in billing order. */
export type CastMember = { id: number; name: string };

/** A billed TV actor — adds the total episode count (for the ≥3-eps gate). */
export type TvCastMember = { id: number; name: string; eps: number | null };

/** A writer (film) or creator (TV) — TMDB id + name. */
export type Person = { id: number; name: string };

/** How a film reached audiences. `cls` is the headline classification
 *  ("unknown" when TMDB has no release-date records). */
export type FilmRelease = {
  cls: "theatrical" | "limited" | "streaming" | "unknown";
  wide: boolean;
  ltd: boolean;
  gap: number | null;
};

/** A film's TMDB collection membership (the franchise grouping signal). */
export type FilmCollectionRef = { id: number; name: string; total: number };

/** One film inside a collection-details record. */
export type CollectionPart = {
  id: number;
  title: string;
  year: string;
  watched: boolean;
};

/**
 * Full membership of a TMDB collection — used by the franchise
 * qualification rule (released-count gate). `total` is TMDB's count;
 * `parts` carries each film's year so released-vs-announced can be
 * derived.
 */
export type CollectionDetail = {
  name: string;
  total: number;
  parts: CollectionPart[];
};

/** A TV season's audience average (IMDb), keyed by season number. */
export type TvSeasonAvg = { n: number; avg: number | null };

// ─── Fixture entry shapes (as stored on disk, keyed by TMDB id) ──

type FilmEntry = {
  ratings: ExternalRatings | null;
  studios: string[];
  country: string | null;
  language: string | null;
  certification: string | null;
  budget: number | null;
  revenue: number | null;
  cast: CastMember[];
  writers?: Person[];
  release?: FilmRelease;
  collection?: FilmCollectionRef | null;
};

type ShowEntry = {
  ratings: ExternalRatings | null;
  country: string | null;
  language: string | null;
  cast: TvCastMember[];
  creators?: Person[];
  seasons?: TvSeasonAvg[];
};

type EnrichmentFixture = {
  capturedAt: string;
  meta: { films: number; shows: number; collections: number };
  films: Record<string, FilmEntry>;
  shows: Record<string, ShowEntry>;
  collectionDetails: Record<string, CollectionDetail>;
};

// ─── Merged enriched objects (snapshot identity + enrichment delta) ─

/**
 * A film with everything the stats compute needs in one flat object —
 * snapshot identity (mine/title/year/director/genres/runtime/reviews)
 * joined with the enrichment delta. Mirrors the shape the stats sketch
 * assembled from its cache, so the ported compute reads the same field
 * names.
 */
export type EnrichedFilm = {
  tmdbId: number;
  /** Malcolm's rating — joined from the snapshot's primaryRating. */
  mine: number | null;
  title: string;
  year: number;
  /** Detail-page slug (`${letterboxdSlug}-${releaseYear}`) joined from the
   *  snapshot, so title-listing stats tiles can deep-link to /films/[slug]. */
  slug: string;
  director: string | null;
  genres: string[];
  runtime: number | null;
  reviews: FilmReview[];
  ratings: ExternalRatings | null;
  studios: string[];
  country: string | null;
  language: string | null;
  certification: string | null;
  budget: number | null;
  revenue: number | null;
  cast: CastMember[];
  writers: Person[];
  release: FilmRelease | null;
  collection: FilmCollectionRef | null;
};

/**
 * A show with everything the stats compute needs in one flat object —
 * snapshot identity (mine/name/year/genres/networks/type/status/
 * isMiniseries/reviews) joined with the enrichment delta.
 */
export type EnrichedShow = {
  tmdbId: number;
  mine: number | null;
  name: string;
  year: number;
  genres: string[];
  networks: string[];
  type: string | null;
  status: string | null;
  isMiniseries: boolean;
  reviews: TvReview[];
  ratings: ExternalRatings | null;
  country: string | null;
  language: string | null;
  cast: TvCastMember[];
  creators: Person[];
  seasons: TvSeasonAvg[];
};

// ─── Loader (module-cached) ──────────────────────────────────────

const FIXTURE_PATH = path.resolve(
  process.cwd(),
  "lib/feeds/_fixtures/enrichment-snapshot.json",
);

type Built = {
  films: EnrichedFilm[];
  shows: EnrichedShow[];
  collectionDetails: Record<number, CollectionDetail>;
  capturedAt: string;
};

let cached: Built | null = null;

/** Read + parse the fixture, with a clear error pointing at the refresh ritual. */
function loadFixture(): EnrichmentFixture {
  let raw: string;
  try {
    raw = readFileSync(FIXTURE_PATH, "utf-8");
  } catch {
    throw new Error(
      `No enrichment snapshot at ${FIXTURE_PATH}. ` +
        "Run `npm run enrich:refresh` to capture one.",
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `Enrichment snapshot at ${FIXTURE_PATH} is not valid JSON: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("films" in parsed) ||
    !("shows" in parsed)
  ) {
    throw new Error(`Enrichment snapshot at ${FIXTURE_PATH} is malformed.`);
  }
  return parsed as EnrichmentFixture;
}

/**
 * Build the merged enriched film/show lists once, then cache. Joins
 * each fixture entry (keyed by TMDB id) to its snapshot record for the
 * canonical identity + rating fields. Only entries that carry real
 * enrichment (ratings present, or a non-empty cast) survive — matching
 * the sketch's `ratings || cast.length` filter so golden numbers line
 * up.
 */
function build(): Built {
  if (cached) return cached;
  const fixture = loadFixture();
  const { films: snapFilms } = getFilms();
  const { shows: snapShows } = getShows();

  // Index the snapshots by TMDB id for the identity join.
  const filmById = new Map<number, (typeof snapFilms)[number]>();
  for (const f of snapFilms) if (f.tmdb) filmById.set(f.tmdb.id, f);
  const showById = new Map<number, (typeof snapShows)[number]>();
  for (const s of snapShows) if (s.tmdb) showById.set(s.tmdb.id, s);

  const films: EnrichedFilm[] = [];
  for (const [idStr, e] of Object.entries(fixture.films)) {
    const hasEnrichment = Boolean(e.ratings) || (e.cast?.length ?? 0) > 0;
    if (!hasEnrichment) continue;
    const tmdbId = Number(idStr);
    const snap = filmById.get(tmdbId);
    if (!snap?.tmdb) continue; // no snapshot identity to join → skip
    films.push({
      tmdbId,
      mine: snap.primaryRating,
      title: snap.title,
      year: snap.releaseYear,
      slug: `${snap.letterboxdSlug}-${snap.releaseYear}`,
      director: snap.tmdb.director,
      genres: snap.tmdb.genres,
      runtime: snap.tmdb.runtime,
      reviews: snap.reviews,
      ratings: e.ratings,
      studios: e.studios ?? [],
      country: e.country,
      language: e.language,
      certification: e.certification,
      budget: e.budget,
      revenue: e.revenue,
      cast: e.cast ?? [],
      writers: e.writers ?? [],
      release: e.release ?? null,
      collection: e.collection ?? null,
    });
  }

  const shows: EnrichedShow[] = [];
  for (const [idStr, e] of Object.entries(fixture.shows)) {
    const hasEnrichment = Boolean(e.ratings) || (e.cast?.length ?? 0) > 0;
    if (!hasEnrichment) continue;
    const tmdbId = Number(idStr);
    const snap = showById.get(tmdbId);
    if (!snap?.tmdb) continue;
    shows.push({
      tmdbId,
      mine: snap.primaryRating,
      name: snap.name,
      year: snap.premiereYear,
      genres: snap.tmdb.genres,
      networks: snap.tmdb.networks,
      type: snap.tmdb.type,
      status: snap.tmdb.status,
      isMiniseries: snap.isMiniseries,
      reviews: snap.reviews,
      ratings: e.ratings,
      country: e.country,
      language: e.language,
      cast: e.cast ?? [],
      creators: e.creators ?? [],
      seasons: e.seasons ?? [],
    });
  }

  // collectionDetails keys are numeric strings on disk; expose them as numbers.
  const collectionDetails: Record<number, CollectionDetail> = {};
  for (const [idStr, d] of Object.entries(fixture.collectionDetails ?? {})) {
    collectionDetails[Number(idStr)] = d;
  }

  cached = { films, shows, collectionDetails, capturedAt: fixture.capturedAt };
  return cached;
}

// ─── Public read API ─────────────────────────────────────────────

/** Enriched films (snapshot identity + enrichment delta), merged + cached. */
export function getEnrichedFilms(): EnrichedFilm[] {
  return build().films;
}

/** Enriched shows (snapshot identity + enrichment delta), merged + cached. */
export function getEnrichedShows(): EnrichedShow[] {
  return build().shows;
}

/** TMDB collection membership, keyed by collection id (franchise math). */
export function getCollectionDetails(): Record<number, CollectionDetail> {
  return build().collectionDetails;
}

/** When the enrichment fixture was captured. */
export function getEnrichmentCapturedAt(): string {
  return build().capturedAt;
}
