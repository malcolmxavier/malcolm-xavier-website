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

  // Dateline rule: surface "Rewatched" only when every review on the
  // card is a rewatch — i.e. the single logged review is a rewatch,
  // or (under filters) every qualifying review is a rewatch. The
  // default is always "First watched" — Malcolm rarely rewatches, so
  // mixed-review films should read as first-watch context. The same
  // predicate generalizes to the filtered case: when FilmCard later
  // receives a `qualifyingReviews` subset, swap `film.reviews` for
  // that prop and the rule still holds.
  const allRewatches =
    film.reviews.length > 0 && film.reviews.every((r) => r.rewatch);
  const datelineDate = allRewatches
    ? film.reviews[0].watchedDate
    : film.firstWatchedDate;
  const datelineLabel = allRewatches ? "Rewatched" : "First watched";

  return (
    <article className="h-full">
      <NextLink
        // ?from=films marks this as in-app navigation so the detail
        // page's BackToFilms link can router.back() into the exact
        // grid state instead of pushing /films and losing scroll
        // position + future filter URL params.
        href={`/films/${slug}?from=films`}
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
            {/* Liked heart overlay — top-right corner */}
            {film.liked ? (
              <span
                aria-label="Liked"
                title="Liked"
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  fontSize: 16,
                  filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))",
                }}
              >
                ♥
              </span>
            ) : null}
            {/* Multi-review badge — bottom-left corner */}
            {reviewCount > 1 ? (
              <span
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
    </article>
  );
}
