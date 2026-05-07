// ─────────────────────────────────────────────────────────────────
// ShowCard — uniform-height card used on /television grid.
//
// Two variants determined by `card.cardKind`:
//
//   • "show":   Show-level review. Surfaces the show poster + the
//               show name + premiere year + Show review's rating
//               and dateline. No season indicator.
//   • "season": Season-level review. Same poster + show name, plus
//               a "Season N" sub-line and the Season review's
//               rating + dateline. The same show with multiple
//               Season reviews produces multiple cards on the
//               listing — no merging.
//
// Standard portrait poster aspect ratio (2:3) for the cover image
// (TMDB TV posters use the same ratio as movie posters). Title +
// kicker clamped so card heights stay aligned across rows.
//
// No "use client" — shared component, SSR-friendly. Mirrors
// FilmCard's structure so future cross-cluster maintenance touches
// both files in lockstep.
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
  resolveSeasonPosterUrl,
  type CompletedCard,
} from "@/lib/feeds/serializd-utils";

/**
 * Build the detail-page href, optionally encoding the source
 * listing URL so the detail page's adjacent-show navigation can
 * find the right neighbors in the user's filter/sort context.
 *
 * The `originHref` prop is a relative URL string ("/television",
 * "/television?genre=Drama", "/television/watching") — encoded
 * once and passed forward via `?from=`. The detail page reads it,
 * replays the source listing's predicates, and finds the current
 * show's actual visual neighbors. Without `originHref`, the
 * detail page falls back to the latestActivityDate ordering.
 */
function buildDetailHref(
  slug: string,
  cardKind: "show" | "season",
  seasonNumber: number | null,
  originHref: string | undefined,
): string {
  // Anchor target by card kind:
  //   • "season" → #season-N (lands at the matching season block,
  //     scroll-margin-top clears the sticky nav so the heading
  //     reads in view).
  //   • "show"   → #show-review (lands at the "The whole show"
  //     section, since that's the review-as-completable-unit the
  //     user clicked into. Beats landing at hero for users who
  //     have already scrolled past it.)
  const anchor =
    cardKind === "season" && seasonNumber !== null
      ? `#season-${seasonNumber}`
      : "#show-review";
  const base = `/television/${slug}?ref=internal${anchor}`;
  if (!originHref) return base;
  // Insert `from` before the hash so the URL parser doesn't
  // mistake the encoded source for a fragment continuation.
  const hashIdx = base.indexOf("#");
  const fromParam = `&from=${encodeURIComponent(originHref)}`;
  return `${base.slice(0, hashIdx)}${fromParam}${base.slice(hashIdx)}`;
}

export function ShowCard({
  card,
  originHref,
}: {
  card: CompletedCard;
  /** Source listing URL to encode as `?from=` on the detail-page
   *  link, so adjacent-show nav on the detail page knows the
   *  user's filter/sort context. Optional — when omitted, the
   *  detail page's neighbors fall back to latestActivityDate
   *  ordering. */
  originHref?: string;
}) {
  const { show, review, cardKind, seasonNumber } = card;
  // Card-subject-aware poster: Season cards surface the specific
  // season's poster (so a show with multiple Season cards in the
  // grid reads as distinct units), Show cards keep the show-level
  // poster. Both fall back to show.posterUrl when TMDB hasn't
  // populated a season-specific image. Same poster grammar as
  // /television/watching's InProgressCard so the two cluster
  // surfaces stay visually coherent.
  const cardPosterUrl =
    cardKind === "season" && seasonNumber !== null
      ? (resolveSeasonPosterUrl(show, seasonNumber) ?? show.posterUrl)
      : show.posterUrl;
  // The Show review counts; we display "N reviews" badge if this
  // show has more than one Show-or-Season review surfaced as a
  // card (a soft signal Malcolm has multiple writeups across the
  // show's run).
  const surfacedReviewCount = show.reviews.filter(
    (r) =>
      (r.level === "show" || r.level === "season") &&
      r.reviewText.trim() !== "",
  ).length;

  return (
    <article className="h-full">
      {/* Engagement signal — measures whether filter+browse loops
          produce real reads. Mirrors FilmCard's TrackOnClick so the
          two clusters report symmetric click events. */}
      <TrackOnClick
        event={ANALYTICS_EVENTS.SHOW_CARD_CLICK}
        eventData={{
          slug: show.slug,
          showId: show.serializdShowId,
          cardKind,
          seasonNumber,
        }}
      >
        <NextLink
          // ?ref=internal marks this as in-app navigation so the
          // detail page's BackToTelevision can router.back() into
          // the exact grid state. Cluster-agnostic key.
          //
          // For Season cards we anchor at the season's section in
          // the detail page via #season-N — the detail page renders
          // every season inline, so jumping to the right one keeps
          // the card-to-detail handoff coherent.
          //
          // ?from=<encoded-listing-url> (when originHref is set)
          // gives the detail page enough context to compute
          // filter-aware adjacent-show neighbors — see
          // buildDetailHref above and findContextualNeighbors in
          // the detail page.
          href={buildDetailHref(show.slug, cardKind, seasonNumber, originHref)}
          className="show-card-link block h-full focus-visible:outline-2 focus-visible:outline-offset-4"
          style={{ outlineColor: "var(--border-focus)" }}
        >
          <Stack gap="300" className="h-full">
            {/* Poster — 2:3 aspect, fills card width. CSS aspect-
                ratio so card height is deterministic before the
                image loads. */}
            <div
              className="relative w-full overflow-hidden rounded-md"
              style={{
                aspectRatio: "2 / 3",
                background: "var(--surface-default)",
                border: "1px solid var(--border-default)",
              }}
            >
              {cardPosterUrl ? (
                <Image
                  src={cardPosterUrl}
                  alt="" /* decorative — title is in card body */
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  style={{ objectFit: "cover" }}
                  placeholder="empty"
                />
              ) : (
                // Placeholder for the rare show without TMDB
                // metadata. Renders title in mono so the card
                // still reads "this is a show I reviewed."
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
                  {show.name}
                </div>
              )}
              {/* Liked heart overlay — top-right corner. Same
                  treatment + green token as FilmCard so the "liked"
                  signal reads identically across clusters. */}
              {review.liked ? (
                <span
                  role="img"
                  aria-label="Liked"
                  title="Liked"
                  className="star-rating-fill"
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    fontSize: 16,
                    // color is inherited from .star-rating-fill —
                    // green-800 in light mode, green-400 in dark.
                    // Using the class instead of an inline color
                    // keeps the heart and the star-rating system
                    // on the same theme-aware token pair.
                    filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))",
                  }}
                >
                  ♥
                </span>
              ) : null}
              {/* Multi-review badge — surfaces when this show has
                  multiple Show-or-Season cards on the listing.
                  role+aria-label resolves the a11y/growth conflict
                  per the same convention FilmCard uses. */}
              {surfacedReviewCount > 1 ? (
                <span
                  role="img"
                  aria-label={`${surfacedReviewCount} reviews of this show`}
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
                  ↻ {surfacedReviewCount}
                </span>
              ) : null}
              {/* Card-kind badge (top-left) — distinguishes Show
                  cards from Season cards at a glance. Show cards
                  read as "the whole thing" units; Season cards
                  carry a "S<N>" label so users know which season
                  the review covers. Hidden on Show cards (the
                  default reading is "show review").
                  --blue-700 directly (not --text-action) per the
                  feedback_text_action_alias_bug memory: the alias
                  is broken inside data-subbrand for inline styles,
                  so we read the cluster-blue token directly. The
                  drop-shadow lifts the badge off varied poster
                  backgrounds for AA legibility on light posters. */}
              {cardKind === "season" && seasonNumber !== null ? (
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    background: "var(--blue-700)",
                    color: "#fff",
                    padding: "3px 6px",
                    borderRadius: 3,
                    filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))",
                  }}
                >
                  S{seasonNumber}
                </span>
              ) : null}
            </div>

            {/* Title + sub-line */}
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
                {show.name}
              </Headline>
              <Kicker>
                {show.premiereYear || ""}
                {cardKind === "season" && seasonNumber !== null
                  ? ` · Season ${seasonNumber}`
                  : ""}
                {cardKind === "show" ? " · Show review" : ""}
              </Kicker>
            </Stack>

            {/* Rating + dateline */}
            <Stack gap="100">
              {review.rating !== null ? (
                <StarRating rating={review.rating} size={14} />
              ) : null}
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--text-caption)",
                  letterSpacing: "0.04em",
                }}
              >
                Watched{" "}
                {formatWatchedDate(review.watchedDate.slice(0, 10))}
              </span>
            </Stack>
          </Stack>
        </NextLink>
      </TrackOnClick>
    </article>
  );
}
