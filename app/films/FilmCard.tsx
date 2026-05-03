// ─────────────────────────────────────────────────────────────────
// FilmCard — uniform-height card used on /films grid.
//
// Standard cinema poster aspect ratio (2:3) for the cover image.
// Title clamped to 2 lines so cards stay aligned across rows.
//
// No "use client" — shared component. SSR-friendly.
// ─────────────────────────────────────────────────────────────────

import Image from "next/image";
import NextLink from "next/link";
import { Stack } from "@/components/layout/Stack";
import { Headline } from "@/components/typography/Headline";
import { Kicker } from "@/components/typography/Kicker";
import { StarRating } from "@/components/primitives/StarRating";
import { TrackOnClick } from "@/components/analytics/TrackOnClick";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import {
  formatWatchedDate,
  type AppliedFilm,
} from "@/lib/feeds/letterboxd-utils";

export function FilmCard({ applied }: { applied: AppliedFilm }) {
  const film = applied.film;
  const reviewCount = film.reviews.length;
  // URL slug is `<letterboxdSlug>-<releaseYear>` — human-readable
  // and SEO-friendly. Distinct from film.id (canonical TMDB id
  // post-enrichment); the data layer maps both forms to the same
  // film via getFilmBySlug, so old tmdb-<id> URLs still resolve.
  const slug = `${film.letterboxdSlug}-${film.releaseYear}`;

  // Dateline rule. Three branches in priority order:
  //   1. Per-review filter active → "Watched <qualifying-watch>".
  //      The qualifying review represents the specific watch the
  //      filter matched, so the dateline names that watch event
  //      directly. Without this branch a 2024 rewatch of a 2017
  //      film matched into the 2024 result set would still display
  //      "First watched 2017" — leaving the user no signal for why
  //      the card landed in the 2024 results.
  //   2. No filter, every review is a rewatch → "Rewatched <date>".
  //      Malcolm rarely rewatches, so an all-rewatch film usually
  //      means he didn't log the original watch on Letterboxd and
  //      the earliest watchedDate is itself a rewatch — labeling
  //      "First watched" against that date would be a quiet lie.
  //   3. Default → "First watched <firstWatchedDate>".
  //      Mixed-review or single-review films read with their oldest
  //      logged watch as the entry-point context.
  const allRewatches =
    film.reviews.length > 0 && film.reviews.every((r) => r.rewatch);
  let datelineLabel: string;
  let datelineDate: string;
  if (applied.perReviewFilterActive && applied.qualifyingReview) {
    datelineLabel = "Watched";
    datelineDate = applied.qualifyingReview.watchedDate;
  } else if (allRewatches) {
    datelineLabel = "Rewatched";
    datelineDate = film.reviews[0].watchedDate;
  } else {
    datelineLabel = "First watched";
    datelineDate = film.firstWatchedDate;
  }

  return (
    <article className="h-full">
      {/* Engagement signal — measures whether filter+browse loops
          produce real reads. Wrapping the link doesn't add a click
          handler that competes with NextLink's prefetch / navigate. */}
      <TrackOnClick
        event={ANALYTICS_EVENTS.FILM_CARD_CLICK}
        eventData={{ slug, releaseYear: film.releaseYear }}
      >
      <NextLink
        // ?ref=internal marks this as in-app navigation so the detail
        // page's BackToFilms link can router.back() into the exact
        // grid state instead of pushing /films and losing scroll
        // position + future filter URL params. Cluster-agnostic key
        // so /music can share the same convention without naming the
        // cluster in every outbound href; the per-cluster legacy
        // `?from=films` form is still honored by BackToFilms for any
        // pre-rename shared links.
        href={`/films/${slug}?ref=internal`}
        className="film-card-link block h-full focus-visible:outline-2 focus-visible:outline-offset-4"
        style={{ outlineColor: "var(--border-focus)" }}
      >
        <Stack gap="300" className="h-full">
          {/* Poster — 2:3 aspect, fills card width. Uses
              CSS aspect-ratio so the card height is deterministic
              before the image loads. */}
          <div
            className="relative w-full overflow-hidden rounded-md"
            style={{
              aspectRatio: "2 / 3",
              background: "var(--surface-default)",
              border: "1px solid var(--border-default)",
            }}
          >
            {film.posterUrl ? (
              <Image
                src={film.posterUrl}
                alt="" /* decorative — title is in the card body */
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                style={{ objectFit: "cover" }}
                placeholder="empty"
              />
            ) : (
              // Placeholder for the rare film without TMDB metadata.
              // Renders the title in mono on a flat surface so the
              // card still reads "this is a film I reviewed."
              <div
                className="absolute inset-0 flex items-center justify-center p-4"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--p-xs-font-size)",
                  letterSpacing: "0.04em",
                  color: "var(--text-caption)",
                  textAlign: "center",
                }}
                aria-hidden="true"
              >
                {film.title}
              </div>
            )}
            {/* Liked heart overlay — top-right corner. role="img"
                anchors the aria-label so iOS VoiceOver reads it
                reliably; without the role, VO can fall back to
                generic-span behavior and skip the label. */}
            {film.liked ? (
              <span
                role="img"
                aria-label="Liked"
                title="Liked"
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  fontSize: 16,
                  // --green-800 explicitly to match the detail-page
                  // heart. Without this the heart inherits orange
                  // from the [data-subbrand="film"] a cascade
                  // (anchor descendants pick up the cluster's link
                  // color), so the same liked film reads as orange
                  // on the card and green on the detail page. Both
                  // surfaces should land on the editorial green
                  // since "liked" is sub-brand-agnostic identity.
                  color: "var(--green-800)",
                  filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))",
                }}
              >
                ♥
              </span>
            ) : null}
            {/* Multi-review badge — bottom-left corner. role="img"
                + aria-label resolves the a11y/growth conflict: AT
                hears "{N} reviews" inline with the card link's
                accessible name (informational, what growth wanted)
                instead of the literal Unicode glyph "clockwise
                open circle arrow" that some screen readers verbalize
                (what a11y wanted to suppress). Visual users still
                see "↻ {N}". */}
            {reviewCount > 1 ? (
              <span
                role="img"
                aria-label={`${reviewCount} reviews`}
                style={{
                  position: "absolute",
                  bottom: 8,
                  left: 8,
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.06em",
                  background: "rgba(0,0,0,0.65)",
                  color: "#fff",
                  padding: "3px 6px",
                  borderRadius: 3,
                }}
              >
                ↻ {reviewCount}
              </span>
            ) : null}
          </div>

          {/* Title + year */}
          <Stack gap="100">
            <Headline
              level={3}
              className="line-clamp-2"
              style={{
                fontSize: "var(--p-md-font-size)",
                lineHeight: "var(--p-md-line-height)",
                minHeight: "calc(2 * var(--p-md-line-height))",
              }}
            >
              {film.title}
            </Headline>
            <Kicker>
              {film.releaseYear}
              {film.tmdb?.director ? ` · dir. ${film.tmdb.director}` : ""}
            </Kicker>
          </Stack>

          {/* Rating + dateline */}
          <Stack gap="100">
            {/* cardRating comes from AppliedFilm — when a per-review
                filter is active it's the qualifying review's rating,
                otherwise it's film.primaryRating (most recent). The
                card and the grid position always agree on which
                review they're representing. */}
            {applied.cardRating !== null ? (
              <StarRating rating={applied.cardRating} size={14} />
            ) : null}
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--text-caption)",
                letterSpacing: "0.04em",
              }}
            >
              {datelineLabel} {formatWatchedDate(datelineDate)}
            </span>
          </Stack>
        </Stack>
      </NextLink>
      </TrackOnClick>
    </article>
  );
}
