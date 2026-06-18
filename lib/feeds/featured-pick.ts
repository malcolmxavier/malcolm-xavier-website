// ─────────────────────────────────────────────────────────────────
// Featured Pick — the hand-curated "if you watch one thing right now,
// make it this" editorial spotlight on each cluster landing.
//
// This is the ONE module on the landings that is NOT feed-derived.
// Now / Favorites / Lists all come from Letterboxd / Serializd; this
// is Malcolm's authored single recommendation, in his voice. It's the
// realization of the original April-plan idea: "curated featured shows
// … honest 'I curate this by hand' note."
//
// HOW TO UPDATE (no rebuild ritual — just edit and redeploy):
//   • Point `slug` (film) / `showId` (TV) at an IN-CORPUS title — one
//     you've actually reviewed, so the "Why this one →" CTA lands on
//     an on-site review rather than leaking off to the platform.
//   • Write `take` in your voice (2–4 sentences — the case for it, not
//     a synopsis). Em-dashes no spaces, Oxford commas, "and" not "&".
//   • Set the whole pick to `null` to hide the module entirely (it
//     renders nothing rather than a placeholder, per the no-placeholder
//     rule).
//   • If the ref doesn't resolve to a corpus entry, the resolver
//     returns null and the module hides itself — it never renders a
//     broken card.
//
// The label is the static "Currently recommending" (not a dated
// stamp) — cadence is driven by Malcolm's attitude toward what's
// out, not a calendar, so there's deliberately no freshness date to
// rot. See the FeaturedPick component for the rendering.
// ─────────────────────────────────────────────────────────────────

import "server-only";
import { getFilmByLetterboxdSlug } from "./letterboxd";
import { getShowBySerializdId } from "./serializd";

/** Resolved, render-ready shape the FeaturedPick component consumes. */
export type FeaturedPick = {
  /** schema.org type for the JSON-LD `itemReviewed`. */
  kind: "Movie" | "TVSeries";
  title: string;
  /** Release / premiere year — shown as the secondary line. */
  year: number | null;
  posterUrl: string | null;
  /** Malcolm's rating (0.5–5), or null to hide the stars. */
  rating: number | null;
  /** On-site detail/review route the CTA points at. */
  href: string;
  /** The editorial take — Malcolm's words. */
  take: string;
};

// ─── The current picks (HAND-EDITED) ──────────────────────────────
//
// Seeded with real in-corpus titles + placeholder takes for Malcolm
// to rewrite. `slug` is the Letterboxd slug; `showId` is the Serializd
// (TMDB) id — the same ids the favorites/Now modules already use.

const FILM_PICK: { slug: string; take: string } | null = {
  slug: "is-god-is",
  take:
    "This one's about Black women getting revenge, so obviously I locked in. This film has stayed top of mind since I saw it a few weeks ago. If you want a fresh modern thriller, start here.",
};

const TV_PICK: { showId: number; take: string } | null = {
  showId: 124101, // Hacks
  take:
    "The rare show that gets better as it continues. It is a two-hander about entertainment, ambition, and relationships. It's a beautiful testament to women, comedy, and our human propensity for growth. Watch it for the writing, stay for the most honest portrait of a working partnership on television.",
};

// ─── Resolvers ─────────────────────────────────────────────────────

/** The current film featured pick, resolved against the reviewed
 *  corpus. Returns null if there's no pick set or the slug isn't in
 *  the corpus (so the module hides rather than rendering a dead card). */
export function getFilmFeaturedPick(): FeaturedPick | null {
  if (!FILM_PICK) return null;
  const film = getFilmByLetterboxdSlug(FILM_PICK.slug);
  if (!film) return null;
  return {
    kind: "Movie",
    title: film.title,
    year: film.releaseYear ?? null,
    posterUrl: film.posterUrl ?? film.posterFallbackUrl ?? null,
    rating: film.primaryRating ?? null,
    href: `/films/${film.letterboxdSlug}-${film.releaseYear}`,
    take: FILM_PICK.take,
  };
}

/** The current TV featured pick, resolved against the reviewed corpus.
 *  Same null-safety contract as the film resolver. */
export function getShowFeaturedPick(): FeaturedPick | null {
  if (!TV_PICK) return null;
  const show = getShowBySerializdId(TV_PICK.showId);
  if (!show) return null;
  return {
    kind: "TVSeries",
    title: show.name,
    year: show.premiereYear ?? null,
    posterUrl: show.posterUrl ?? show.posterFallbackUrl ?? null,
    rating: show.primaryRating ?? null,
    href: `/television/${show.slug}`,
    take: TV_PICK.take,
  };
}
