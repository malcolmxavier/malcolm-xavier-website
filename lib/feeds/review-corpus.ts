// ─────────────────────────────────────────────────────────────────
// Review corpus — the reviews snapshot joined with the enrichment delta.
//
// The reviews pages filter off getFilms()/getShows(), whose snapshot
// `tmdb` carries only thin identity (id/poster/genres/runtime/director;
// TV adds networks/type). Every Wave B entity the stats rank on — cast,
// writers, studios, country, language, budget, release, collection; TV
// cast/creators/country/language — lives ONLY in the enrichment fixture
// (lib/feeds/_fixtures/enrichment-snapshot.json), keyed by TMDB id.
//
// This module attaches each title's enrichment record onto its Film/Show
// as `.enrichment`, by TMDB id, so the existing applyFilters pipeline can
// gain Wave B predicates. The snapshot-only getFilms()/getShows() stay
// untouched (detail pages and other consumers are unaffected); we return
// shallow copies so the module-cached snapshot objects aren't mutated.
//
// Server-only (reads the committed fixtures off disk). The per-card
// `.enrichment` is for SERVER-SIDE filtering + available-value derivation
// only — strip it before passing cards to the client shells (the grid
// doesn't render it, and the cast/writer arrays would bloat the payload).
// ─────────────────────────────────────────────────────────────────

import "server-only";
import { getFilms } from "./letterboxd";
import { getShows } from "./serializd";
import { getEnrichedFilms, getEnrichedShows } from "./enrichment";
import type { Film, FilmsSummary } from "./letterboxd-utils";
import type { Show, TvSummary } from "./serializd-utils";

let filmCache: { films: Film[]; summary: FilmsSummary } | null = null;
let showCache: { shows: Show[]; summary: TvSummary } | null = null;

/** Film corpus with each film's enrichment delta attached by TMDB id. */
export function getFilmsWithEnrichment(): { films: Film[]; summary: FilmsSummary } {
  if (filmCache) return filmCache;
  const { films, summary } = getFilms();
  const byId = new Map(getEnrichedFilms().map((e) => [e.tmdbId, e]));
  const enriched = films.map((f) =>
    f.tmdb ? { ...f, enrichment: byId.get(f.tmdb.id) } : f,
  );
  filmCache = { films: enriched, summary };
  return filmCache;
}

/** Show corpus with each show's enrichment delta attached by TMDB id. */
export function getShowsWithEnrichment(): { shows: Show[]; summary: TvSummary } {
  if (showCache) return showCache;
  const { shows, summary } = getShows();
  const byId = new Map(getEnrichedShows().map((e) => [e.tmdbId, e]));
  const enriched = shows.map((s) =>
    s.tmdb ? { ...s, enrichment: byId.get(s.tmdb.id) } : s,
  );
  showCache = { shows: enriched, summary };
  return showCache;
}
